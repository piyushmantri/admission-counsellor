import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { keys } from "../lib/queryKeys.js";

interface College {
  id: string;
  name: string;
  state: string;
  tier: number;
  annual_fees_lakhs: number | null;
}

export default function Colleges() {
  const { data, isLoading } = useQuery({
    queryKey: keys.colleges(),
    queryFn: () =>
      api.get<{ colleges: College[] }>("/colleges").then((r) => r.colleges),
  });
  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Colleges ({data?.length ?? 0})</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data?.map((c) => (
          <Link
            key={c.id}
            to={`/colleges/${c.id}`}
            className="bg-white border border-gray-200 rounded p-3 hover:border-blue-400 transition"
          >
            <div className="font-medium">{c.name}</div>
            <div className="text-sm text-gray-500">
              {c.state} · Tier {c.tier}
              {c.annual_fees_lakhs != null ? ` · ₹${c.annual_fees_lakhs}L/yr` : ""}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
