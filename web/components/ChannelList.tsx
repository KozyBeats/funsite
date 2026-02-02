"use client";

import clsx from "clsx";
import type { Channel } from "@/lib/types";

type ChannelListProps = {
  channels: Channel[];
  activeChannelId: string | null;
  onSelect: (channel: Channel) => void;
};

export default function ChannelList({
  channels,
  activeChannelId,
  onSelect
}: ChannelListProps) {
  return (
    <div className="flex flex-1 flex-col gap-1 p-3">
      {channels.map((channel) => (
        <button
          key={channel.id}
          onClick={() => onSelect(channel)}
          className={clsx(
            "flex items-center justify-between rounded-md px-2 py-2 text-sm text-slate-300 hover:bg-slate-800",
            activeChannelId === channel.id && "bg-slate-800 text-white"
          )}
        >
          <span>
            {channel.type === "text" ? "#" : "🔊"} {channel.name}
          </span>
        </button>
      ))}
      {channels.length === 0 ? (
        <div className="text-xs text-slate-500">No channels</div>
      ) : null}
    </div>
  );
}
