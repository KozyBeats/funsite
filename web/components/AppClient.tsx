"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getSocket } from "@/lib/socket";
import type { Channel, Server } from "@/lib/types";
import LoginForm from "@/components/LoginForm";
import ServerList from "@/components/ServerList";
import ChannelList from "@/components/ChannelList";
import ChatView from "@/components/ChatView";
import VoiceView from "@/components/VoiceView";

export default function AppClient() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const socket = useMemo(() => getSocket(), []);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    };
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setServers([]);
      setChannels([]);
      setActiveServerId(null);
      setActiveChannel(null);
      return;
    }

    const loadServers = async () => {
      const { data, error } = await supabase
        .from("servers")
        .select("id,name")
        .order("created_at");
      if (!error && data) {
        setServers(data);
        if (!activeServerId && data.length > 0) {
          setActiveServerId(data[0].id);
        }
      }
    };

    loadServers();
  }, [user, activeServerId]);

  useEffect(() => {
    if (!activeServerId) {
      setChannels([]);
      setActiveChannel(null);
      return;
    }

    const loadChannels = async () => {
      const { data, error } = await supabase
        .from("channels")
        .select("id,server_id,name,type")
        .eq("server_id", activeServerId)
        .order("created_at");

      if (!error && data) {
        setChannels(data as Channel[]);
        if (!activeChannel || activeChannel.server_id !== activeServerId) {
          setActiveChannel(data[0] ?? null);
        }
      }
    };

    loadChannels();
  }, [activeServerId, activeChannel]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-200">
        Loading...
      </div>
    );
  }

  if (!session || !user) {
    return <LoginForm />;
  }

  return (
    <div className="flex h-screen">
      <ServerList
        servers={servers}
        activeServerId={activeServerId}
        onSelect={setActiveServerId}
      />
      <div className="flex w-64 flex-col border-r border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-4">
          <div className="text-sm font-semibold text-slate-100">Channels</div>
          <div className="text-xs text-slate-400">{user.email}</div>
          <button
            onClick={handleSignOut}
            className="mt-2 text-xs text-slate-400 hover:text-slate-200"
          >
            Sign out
          </button>
        </div>
        <ChannelList
          channels={channels}
          activeChannelId={activeChannel?.id ?? null}
          onSelect={(channel) => setActiveChannel(channel)}
        />
      </div>
      <main className="flex flex-1 flex-col bg-slate-950">
        {activeChannel ? (
          activeChannel.type === "text" ? (
            <ChatView
              channel={activeChannel}
              socket={socket}
              user={user}
            />
          ) : (
            <VoiceView
              channel={activeChannel}
              socket={socket}
              user={user}
            />
          )
        ) : (
          <div className="flex flex-1 items-center justify-center text-slate-500">
            Select a channel to start
          </div>
        )}
      </main>
    </div>
  );
}
