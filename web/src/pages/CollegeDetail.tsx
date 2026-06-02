import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { keys } from "../lib/queryKeys.js";

export default function CollegeDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: keys.college(id!),
    queryFn: () => api.get<Record<string, unknown>>(`/colleges/${id}`),
  });
  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (!data) return <p className="text-red-500">College not found.</p>;
  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold mb-1">{data.name as string}</h2>
      <p className="text-gray-500 mb-4">
        {data.state as string} · Tier {data.tier as number}
      </p>
      <pre className="bg-white border rounded p-4 text-sm overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
