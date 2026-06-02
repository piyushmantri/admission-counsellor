import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  const linkClass = ({ isActive }: { isActive: boolean }): string =>
    `block px-3 py-2 rounded text-sm font-medium ${
      isActive ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
    }`;
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-48 bg-white border-r border-gray-200 flex flex-col p-4 gap-1">
        <h1 className="text-lg font-bold text-blue-700 mb-4">Counseller</h1>
        <NavLink to="/students" className={linkClass}>Students</NavLink>
        <NavLink to="/colleges" className={linkClass}>Colleges</NavLink>
        <NavLink to="/config/bot" className={linkClass}>Bot Config</NavLink>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
