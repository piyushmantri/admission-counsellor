// counseller plugin UI — IIFE bundle served by tele's PluginSlot.
//
// Registers on window.__TELE_PLUGIN_UI__["counseller"]. React shared via
// window.React (set by PluginSlot before script injection). Classic JSX
// runtime: JSX compiles to React.createElement which is on window.React.
// react / react-dom are Rollup externals — NOT bundled here.

import React, { useEffect, useState } from "react";

type BotConfigResponse = {
  configured: boolean;
  bot_token_masked: string | null;
  target_chat_id: string | null;
  last_error: string | null;
  last_connected_at: string | null;
};

function BotConfigPanel({ appId }: { appId: string }) {
  const [cfg, setCfg] = useState<BotConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [tokenDraft, setTokenDraft] = useState("");
  const [chatIdDraft, setChatIdDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  function load() {
    setLoading(true);
    setErr(null);
    fetch(`/api/applications/${appId}/bot-config`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`GET failed: ${res.status}`);
        return res.json() as Promise<BotConfigResponse>;
      })
      .then((data) => {
        setCfg(data);
        setChatIdDraft(data.target_chat_id ?? "");
        setLoading(false);
      })
      .catch((e) => {
        setErr(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }

  useEffect(() => { load(); }, [appId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    const body: Record<string, unknown> = { target_chat_id: chatIdDraft || null };
    if (tokenDraft.trim()) body.bot_token = tokenDraft.trim();
    try {
      const res = await fetch(`/api/applications/${appId}/bot-config`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? `PUT failed: ${res.status}`);
      }
      setTokenDraft("");
      setSaveMsg("Saved.");
      load();
    } catch (e) {
      setSaveMsg("Error: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/applications/${appId}/bot-config/test`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json() as { ok: boolean; bot_username?: string; error?: string };
      if (data.ok) {
        setTestResult({ ok: true, message: `Connected as @${data.bot_username ?? "?"}` });
        load();
      } else {
        setTestResult({ ok: false, message: data.error ?? "Unknown error" });
        load();
      }
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : String(e) });
    } finally {
      setTesting(false);
    }
  }

  if (loading) return React.createElement("p", { style: { color: "#94a3b8", fontSize: 12 } }, "Loading…");
  if (err) return React.createElement("p", { style: { color: "#f87171", fontSize: 12 } }, err);

  const hasToken = cfg?.configured ?? false;

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } },
    // Status row
    React.createElement("div", { style: { fontSize: 12, color: "#94a3b8" } },
      React.createElement("span", null, "Status: "),
      hasToken
        ? React.createElement("span", { style: { color: "#4ade80" } }, "Token saved")
        : React.createElement("span", { style: { color: "#f87171" } }, "Not configured"),
      cfg?.bot_token_masked
        ? React.createElement("span", { style: { marginLeft: 8, fontFamily: "monospace" } }, cfg.bot_token_masked)
        : null
    ),
    // Form
    React.createElement("form", { onSubmit: handleSave, style: { display: "flex", flexDirection: "column", gap: 12 } },
      // Token field
      React.createElement("div", null,
        React.createElement("label", { style: { display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 } },
          hasToken ? "New Bot Token (leave blank to keep existing)" : "Bot Token *"
        ),
        React.createElement("input", {
          type: "password",
          value: tokenDraft,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setTokenDraft(e.target.value),
          placeholder: hasToken ? "•••• (keep existing)" : "123456:ABC-DEF...",
          style: {
            width: "100%",
            boxSizing: "border-box",
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 4,
            padding: "6px 10px",
            fontSize: 13,
            color: "#e2e8f0",
          },
        })
      ),
      // Target chat ID
      React.createElement("div", null,
        React.createElement("label", { style: { display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 } },
          "Target Chat ID (optional — restrict bot to one chat)"
        ),
        React.createElement("input", {
          type: "text",
          value: chatIdDraft,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setChatIdDraft(e.target.value),
          placeholder: "-100123456789 or empty for all chats",
          style: {
            width: "100%",
            boxSizing: "border-box",
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 4,
            padding: "6px 10px",
            fontSize: 13,
            color: "#e2e8f0",
          },
        })
      ),
      // Save + Test row
      React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } },
        React.createElement("button", {
          type: "submit",
          disabled: saving,
          style: {
            background: "#4f46e5",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            padding: "6px 14px",
            fontSize: 13,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          },
        }, saving ? "Saving…" : "Save"),
        React.createElement("button", {
          type: "button",
          disabled: !hasToken || testing,
          onClick: handleTest,
          style: {
            background: "#0f172a",
            color: hasToken ? "#e2e8f0" : "#64748b",
            border: "1px solid #334155",
            borderRadius: 4,
            padding: "6px 14px",
            fontSize: 13,
            cursor: (!hasToken || testing) ? "not-allowed" : "pointer",
            opacity: (!hasToken || testing) ? 0.6 : 1,
          },
        }, testing ? "Testing…" : "Test Connection"),
        saveMsg && React.createElement("span", {
          style: { fontSize: 12, color: saveMsg.startsWith("Error") ? "#f87171" : "#4ade80" }
        }, saveMsg)
      )
    ),
    // Test result
    testResult && React.createElement("div", {
      style: {
        fontSize: 12,
        padding: "8px 12px",
        borderRadius: 4,
        background: testResult.ok ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
        border: `1px solid ${testResult.ok ? "#4ade80" : "#f87171"}`,
        color: testResult.ok ? "#4ade80" : "#f87171",
      }
    }, testResult.message),
    // Last status from DB
    cfg && (cfg.last_connected_at || cfg.last_error) && React.createElement("div", { style: { fontSize: 11, color: "#64748b" } },
      cfg.last_connected_at && React.createElement("div", null,
        `Last connected: ${new Date(cfg.last_connected_at).toLocaleString()}`
      ),
      cfg.last_error && React.createElement("div", { style: { color: "#f87171" } },
        `Last error: ${cfg.last_error}`
      )
    ),
    // Help text
    React.createElement("p", { style: { fontSize: 11, color: "#64748b", margin: 0 } },
      "Configure a Telegram bot for standalone (non-DM) mode. Get a token from @BotFather. " +
      "Leave Target Chat ID blank to accept messages from all chats."
    )
  );
}

function CounsellerPluginUI({ appId }: { appId: string; registrySlug: string }) {
  return React.createElement("div", { style: { color: "#e2e8f0" } },
    React.createElement("h3", { style: { fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#e2e8f0" } },
      "Telegram Bot Configuration"
    ),
    React.createElement(BotConfigPanel, { appId })
  );
}

// Register with tele's PluginSlot runtime loader.
if (typeof window !== "undefined") {
  const w = window as unknown as {
    __TELE_PLUGIN_UI__?: Record<string, typeof CounsellerPluginUI>;
  };
  w.__TELE_PLUGIN_UI__ = w.__TELE_PLUGIN_UI__ || {};
  w.__TELE_PLUGIN_UI__["counseller"] = CounsellerPluginUI;
}
