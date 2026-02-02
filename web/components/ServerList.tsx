"use client";

import type { Server } from "@/lib/types";
import clsx from "clsx";

type ServerListProps = {
  servers: Server[];
  activeServerId: string | null;
  onSelect: (id: string) => void;
};

export default function ServerList({
  servers,
  activeServerId,
  onSelect
}: ServerListProps) {
  return (
    <aside className="w-20 border-r border-slate-800 bg-slate-900">
      <div className="flex flex-col gap-3 p-3">
        {servers.map((server) => (
          <button
            key={server.id}
            onClick={() => onSelect(server.id)}
            className={clsx(
              "flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-sm font-semibold text-slate-200 hover:bg-indigo-500",
              activeServerId === server.id && "bg-indigo-500"
            )}
          >
            {server.name.slice(0, 2).toUpperCase()}
          </button>
        ))}
        {servers.length === 0 ? (
          <div className="text-xs text-slate-500">No servers</div>
        ) : null}
      </div>
    </aside>
  );
}
