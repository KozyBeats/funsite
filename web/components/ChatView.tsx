"use client";

import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { Channel, Message } from "@/lib/types";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type ChatViewProps = {
  channel: Channel;
  socket: Socket;
  user: User;
};

export default function ChatView({ channel, socket, user }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("id,channel_id,user_id,body,created_at")
        .eq("channel_id", channel.id)
        .order("created_at");
      setMessages((data as Message[]) ?? []);
    };

    loadMessages();
  }, [channel.id]);

  useEffect(() => {
    socket.emit("join:text", { channelId: channel.id });

    const handleMessage = (message: Message) => {
      if (message.channel_id === channel.id) {
        setMessages((prev) => [...prev, message]);
      }
    };

    const handleTyping = (payload: { userId: string; name: string }) => {
      if (payload.userId === user.id) {
        return;
      }
      setTypingUsers((prev) =>
        prev.includes(payload.name) ? prev : [...prev, payload.name]
      );
    };

    const handleTypingStop = (payload: { userId: string; name: string }) => {
      setTypingUsers((prev) => prev.filter((name) => name !== payload.name));
    };

    socket.on("message:new", handleMessage);
    socket.on("typing:start", handleTyping);
    socket.on("typing:stop", handleTypingStop);

    return () => {
      socket.emit("leave:text", { channelId: channel.id });
      socket.off("message:new", handleMessage);
      socket.off("typing:start", handleTyping);
      socket.off("typing:stop", handleTypingStop);
    };
  }, [channel.id, socket, user.id]);

  const sendMessage = async () => {
    if (!input.trim()) {
      return;
    }
    socket.emit("message:new", {
      channelId: channel.id,
      userId: user.id,
      body: input,
      name: user.email ?? "User"
    });
    setInput("");
    socket.emit("typing:stop", { channelId: channel.id, userId: user.id });
  };

  const handleTypingChange = (value: string) => {
    setInput(value);
    socket.emit("typing:start", {
      channelId: channel.id,
      userId: user.id,
      name: user.email ?? "User"
    });
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing:stop", {
        channelId: channel.id,
        userId: user.id,
        name: user.email ?? "User"
      });
    }, 800);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">
          # {channel.name}
        </h2>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <div key={message.id} className="rounded-lg bg-slate-900 p-3">
            <div className="text-xs text-slate-400">{message.user_id}</div>
            <div className="text-sm text-slate-100">{message.body}</div>
          </div>
        ))}
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet.</p>
        ) : null}
      </div>
      <div className="border-t border-slate-800 px-4 py-3">
        {typingUsers.length > 0 ? (
          <p className="mb-2 text-xs text-slate-500">
            {typingUsers.join(", ")} typing...
          </p>
        ) : null}
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            placeholder="Message..."
            value={input}
            onChange={(event) => handleTypingChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                sendMessage();
              }
            }}
          />
          <button
            className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-medium text-white"
            onClick={sendMessage}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
