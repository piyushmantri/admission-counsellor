import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { keys } from "../lib/queryKeys.js";

interface Chat {
  chat_id: string;
  message_count: number;
  last_at: string;
  last_preview: string;
}

interface Message {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

export default function Chats() {
  const [selected, setSelected] = useState<string | null>(null);

  const chatsQ = useQuery({
    queryKey: keys.chats(),
    queryFn: () => api.get<{ chats: Chat[] }>("/chats").then((r) => r.chats),
  });

  const msgsQ = useQuery({
    queryKey: keys.chatMessages(selected ?? ""),
    queryFn: () =>
      api.get<{ messages: Message[] }>(`/chats/${encodeURIComponent(selected!)}`).then((r) => r.messages),
    enabled: !!selected,
  });

  return (
    <div className="flex gap-4" style={{ height: "calc(100vh - 80px)" }}>
      {/* Chat list */}
      <div className="w-56 shrink-0 overflow-y-auto border-r border-gray-200 pr-3">
        <h2 className="text-lg font-semibold mb-3">Chats</h2>
        {chatsQ.isLoading && <p className="text-sm text-gray-400">Loading…</p>}
        {chatsQ.data?.length === 0 && (
          <p className="text-sm text-gray-400">No conversations yet.</p>
        )}
        <div className="space-y-1">
          {chatsQ.data?.map((c) => (
            <button
              key={c.chat_id}
              onClick={() => setSelected(c.chat_id)}
              className={`w-full text-left rounded px-2 py-2 transition ${
                selected === c.chat_id
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-100 text-gray-800"
              }`}
            >
              <div className="text-xs font-mono truncate">{c.chat_id}</div>
              <div className={`text-xs truncate mt-0.5 ${selected === c.chat_id ? "text-blue-100" : "text-gray-400"}`}>
                {c.last_preview}
              </div>
              <div className={`text-xs mt-0.5 ${selected === c.chat_id ? "text-blue-200" : "text-gray-400"}`}>
                {c.message_count} msg · {fmtTime(c.last_at)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto py-1">
        {!selected && (
          <p className="text-sm text-gray-400">Select a chat to view messages.</p>
        )}
        {msgsQ.isLoading && <p className="text-sm text-gray-400">Loading…</p>}
        {msgsQ.data?.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg px-3 py-2 text-sm max-w-xl whitespace-pre-wrap break-words ${
              m.role === "user"
                ? "self-end bg-blue-600 text-white"
                : "self-start bg-white border border-gray-200 text-gray-800"
            }`}
          >
            <div className={`text-xs mb-1 ${m.role === "user" ? "text-blue-200" : "text-gray-400"}`}>
              {m.role} · {fmtTime(m.created_at)}
            </div>
            {m.content}
          </div>
        ))}
      </div>
    </div>
  );
}
