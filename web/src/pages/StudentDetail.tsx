import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { keys } from "../lib/queryKeys.js";

export default function StudentDetail() {
  const { chatId } = useParams<{ chatId: string }>();
  const qc = useQueryClient();

  const bundleQ = useQuery({
    queryKey: keys.student(chatId!),
    queryFn: () =>
      api.get<{
        student: unknown;
        attempts: unknown[];
        prefs: unknown;
      }>(`/students/${encodeURIComponent(chatId!)}`),
  });

  const recsQ = useQuery({
    queryKey: keys.recommendations(chatId!),
    queryFn: () =>
      api.get<{
        recommendations: Array<{
          college_name: string;
          branch_name: string;
          exam_used: string;
          margin: number;
          fit_reasons: string[];
        }>;
      }>(`/chats/${encodeURIComponent(chatId!)}/recommendations`),
  });

  const clearMutation = useMutation({
    mutationFn: () => api.delete(`/students/${encodeURIComponent(chatId!)}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.students() });
    },
  });

  if (bundleQ.isLoading) return <p className="text-gray-500">Loading...</p>;
  if (bundleQ.error) return <p className="text-red-500">Error loading student.</p>;

  const { student, attempts, prefs } = bundleQ.data ?? {
    student: null,
    attempts: [],
    prefs: null,
  };
  const recs = recsQ.data?.recommendations ?? [];

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex justify-between items-start">
        <h2 className="text-xl font-semibold">Student: {chatId}</h2>
        <button
          onClick={() => {
            if (confirm("Clear all data for this student?")) clearMutation.mutate();
          }}
          className="text-sm text-red-600 border border-red-300 px-3 py-1 rounded hover:bg-red-50"
        >
          Clear
        </button>
      </div>
      <section className="bg-white border rounded p-4">
        <h3 className="font-semibold mb-2">Profile</h3>
        <pre className="text-sm text-gray-700 whitespace-pre-wrap">
          {JSON.stringify(student, null, 2)}
        </pre>
      </section>
      <section className="bg-white border rounded p-4">
        <h3 className="font-semibold mb-2">Exams ({(attempts as unknown[]).length})</h3>
        {(attempts as unknown[]).length === 0 ? (
          <p className="text-gray-500 text-sm">No exams recorded.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {(attempts as Array<Record<string, unknown>>).map((a, i) => (
              <li key={i} className="flex gap-4">
                <span className="font-mono">
                  {a.exam_name as string} {a.year as number}
                </span>
                <span>
                  {a.percentile != null
                    ? `${a.percentile}%ile`
                    : a.rank != null
                    ? `rank ${a.rank}`
                    : `${a.marks} marks`}
                </span>
                <span className="text-gray-400">{a.category as string}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="bg-white border rounded p-4">
        <h3 className="font-semibold mb-2">Preferences</h3>
        <pre className="text-sm text-gray-700 whitespace-pre-wrap">
          {prefs ? JSON.stringify(prefs, null, 2) : "Not set."}
        </pre>
      </section>
      <section className="bg-white border rounded p-4">
        <h3 className="font-semibold mb-2">Recommendations ({recs.length})</h3>
        {recs.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No recommendations yet. Add exams and preferences, then check back.
          </p>
        ) : (
          <ol className="space-y-2">
            {recs.map((r, i) => (
              <li key={i} className="text-sm border-b pb-2">
                <span className="font-medium">
                  {i + 1}. {r.college_name} — {r.branch_name}
                </span>
                <span className="text-gray-500 ml-2">
                  ({r.exam_used}, margin {(r.margin * 100).toFixed(1)}%)
                </span>
                <div className="text-xs text-blue-600 mt-0.5">
                  {r.fit_reasons.join(", ")}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
