import { getDb, getDatabaseUrl } from "../util/db.js";
import { handleUpdate } from "./dispatch.js";

let currentController: AbortController | null = null;
let currentToken: string | null = null;
let watchdogTimer: ReturnType<typeof setInterval> | null = null;

export async function startBotIfConfigured(): Promise<void> {
  const sql = getDb();
  const rows = await sql`
    SELECT bot_token, target_chat_id, last_processed_update_id
    FROM bot_config WHERE id = 'default'
  `;
  const config = rows[0] as Record<string, unknown> | undefined;
  const token = (config?.bot_token as string | null) ?? null;
  currentToken = token;
  if (!token) return;
  startLoop(
    token,
    (config?.target_chat_id as string | null) ?? null,
    config?.last_processed_update_id == null
      ? null
      : Number(config?.last_processed_update_id)
  );
  startWatchdog();
}

export async function restartBot(): Promise<void> {
  if (currentController) {
    currentController.abort();
    currentController = null;
  }
  await startBotIfConfigured();
}

export function stopBot(): void {
  if (currentController) {
    currentController.abort();
    currentController = null;
  }
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
  }
}

// Poll bot_config every 20s so config changes saved via tele's UI take effect
// without requiring a server restart. Calls restartBot() when token changes.
function startWatchdog(): void {
  if (watchdogTimer) clearInterval(watchdogTimer);
  watchdogTimer = setInterval(async () => {
    try {
      const sql = getDb();
      const rows = await sql`SELECT bot_token FROM bot_config WHERE id = 'default'`;
      const newToken =
        ((rows[0] as Record<string, unknown> | undefined)?.bot_token as string | null) ??
        null;
      if (newToken !== currentToken) {
        console.log("[counseller bot] token changed, restarting...");
        await restartBot();
      }
    } catch (err) {
      console.error("[counseller bot] watchdog error:", err);
    }
  }, 20_000);
}

function startLoop(
  token: string,
  targetChatId: string | null,
  lastUpdateId: number | null
): void {
  const controller = new AbortController();
  currentController = controller;
  let offset = lastUpdateId != null ? lastUpdateId + 1 : 0;

  const loop = async (): Promise<void> => {
    while (!controller.signal.aborted) {
      try {
        const url = `https://api.telegram.org/bot${token}/getUpdates?timeout=30&offset=${offset}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          const errText = await res.text();
          const sql = getDb();
          await sql`UPDATE bot_config SET last_error = ${errText} WHERE id = 'default'`;
          if (res.status === 401) {
            console.error("[counseller bot] auth failed (401); stopping loop.");
            break;
          }
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }
        const data = (await res.json()) as {
          ok: boolean;
          result: Array<{ update_id: number; message?: unknown }>;
        };
        if (!data.ok || !data.result.length) continue;
        for (const update of data.result) {
          offset = update.update_id + 1;
          await handleUpdate(
            update as unknown as Record<string, unknown>,
            token,
            targetChatId,
            getDatabaseUrl()
          );
        }
        const sql = getDb();
        await sql`
          UPDATE bot_config
          SET last_processed_update_id = ${offset - 1},
              last_connected_at = now(),
              last_error = NULL
          WHERE id = 'default'
        `;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") break;
        console.error("[counseller bot] polling error:", err);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  };

  loop().catch((err) => {
    console.error("[counseller bot] loop crashed:", err);
  });
}
