import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { keys } from "../lib/queryKeys.js";

interface Student {
  chat_id: string;
  name: string | null;
  category: string;
  created_at: string;
}

export default function Students() {
  const { data, isLoading, error } = useQuery({
    queryKey: keys.students(),
    queryFn: () =>
      api.get<{ students: Student[] }>("/students").then((r) => r.students),
  });
  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-500">Error loading students.</p>;
  if (!data?.length)
    return (
      <p className="text-gray-500">
        No students yet. Students appear after their first Telegram interaction.
      </p>
    );
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Students ({data.length})</h2>
      <div className="space-y-2">
        {data.map((s) => (
          <Link
            key={s.chat_id}
            to={`/students/${encodeURIComponent(s.chat_id)}`}
            className="block bg-white border border-gray-200 rounded p-3 hover:border-blue-400 transition"
          >
            <div className="font-medium">{s.name ?? s.chat_id}</div>
            <div className="text-sm text-gray-500">
              chat_id: {s.chat_id} · {s.category} ·{" "}
              {new Date(s.created_at).toLocaleDateString()}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
