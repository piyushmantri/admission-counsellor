import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { keys } from "../lib/queryKeys.js";

interface BotConfigData {
  configured: boolean;
  bot_token_masked: string | null;
  target_chat_id: string | null;
  webhook_secret: string | null;
  last_error: string | null;
  last_connected_at: string | null;
}

export default function BotConfig() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: keys.botConfig(),
    queryFn: () => api.get<BotConfigData>("/config/bot"),
  });

  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [secret, setSecret] = useState("");
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    bot_username?: string;
    error?: string;
  } | null>(null);
  const [saved, setSaved] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {};
      if (token) body.bot_token = token;
      if (chatId) body.target_chat_id = chatId;
      if (secret) body.webhook_secret = secret;
      return api.put("/config/bot", body);
    },
    onSuccess: () => {
      setSaved(true);
      setToken("");
      setSecret("");
      void qc.invalidateQueries({ queryKey: keys.botConfig() });
    },
  });

  const testMutation = useMutation({
    mutationFn: () =>
      api.post<{ ok: boolean; bot_username?: string; error?: string }>(
        "/config/bot/test"
      ),
    onSuccess: (result) => {
      setTestResult(result);
      void qc.invalidateQueries({ queryKey: keys.botConfig() });
    },
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-xl font-semibold">Telegram Bot Configuration</h2>
      <p className="text-sm text-gray-600">
        Configure a bot token to enable standalone bot mode. Get a token from{" "}
        <strong>@BotFather</strong> on Telegram via <code>/newbot</code>.
      </p>

      <div className="bg-white border rounded p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bot Token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setSaved(false);
            }}
            placeholder={data?.bot_token_masked ?? "Enter bot token from @BotFather"}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Chat ID
          </label>
          <input
            type="text"
            value={chatId}
            onChange={(e) => {
              setChatId(e.target.value);
              setSaved(false);
            }}
            placeholder={data?.target_chat_id ?? "e.g. -1001234567890 for a group"}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <p className="text-xs text-gray-400 mt-1">
            Only messages from this chat are processed. Leave empty to accept all chats.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Webhook Secret (optional)
          </label>
          <input
            type="text"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="For future webhook mode"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !data?.configured}
            className="border border-gray-300 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {testMutation.isPending ? "Testing..." : "Test Connection"}
          </button>
        </div>
        {saveMutation.error && (
          <p className="text-sm text-red-600">
            Save failed: {(saveMutation.error as Error).message}
          </p>
        )}
        {saved && <p className="text-sm text-green-600">Saved successfully.</p>}
      </div>

      <div className="bg-white border rounded p-4 space-y-2">
        <h3 className="font-medium text-sm">Status</h3>
        <div className="text-sm text-gray-700">
          <span
            className={`inline-block w-2 h-2 rounded-full mr-2 ${
              data?.configured ? "bg-green-500" : "bg-gray-300"
            }`}
          />
          {data?.configured ? "Token configured" : "No token configured"}
        </div>
        {data?.last_connected_at && (
          <p className="text-sm text-gray-600">
            Last connected: {new Date(data.last_connected_at).toLocaleString()}
          </p>
        )}
        {data?.last_error && (
          <p className="text-sm text-red-600">Last error: {data.last_error}</p>
        )}
        {testResult && (
          <p
            className={`text-sm ${
              testResult.ok ? "text-green-600" : "text-red-600"
            }`}
          >
            {testResult.ok
              ? `Connected as @${testResult.bot_username}`
              : `Test failed: ${testResult.error}`}
          </p>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
        <strong>Note:</strong> Do not run standalone bot mode and tele plugin mode
        simultaneously for the same Telegram chat — students will receive duplicate
        replies.
      </div>
    </div>
  );
}
