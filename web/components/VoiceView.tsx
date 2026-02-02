"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { Channel, VoiceMember } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

type VoiceViewProps = {
  channel: Channel;
  socket: Socket;
  user: User;
};

type SignalPayload = {
  channelId: string;
  to: string;
  from: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

export default function VoiceView({ channel, socket, user }: VoiceViewProps) {
  const [members, setMembers] = useState<VoiceMember[]>([]);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const membersRef = useRef<VoiceMember[]>([]);

  const rtcConfig = useMemo(
    () => ({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    }),
    []
  );

  const ensureLocalStream = async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;
    stream.getAudioTracks().forEach((track) => (track.enabled = !muted));
    return stream;
  };

  const cleanupPeers = () => {
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
    audioRefs.current.forEach((audio) => {
      audio.srcObject = null;
      audio.remove();
    });
    audioRefs.current.clear();
  };

  const attachRemoteTrack = (socketId: string, stream: MediaStream) => {
    let audio = audioRefs.current.get(socketId);
    if (!audio) {
      audio = new Audio();
      audio.autoplay = true;
      audio.muted = deafened;
      audioRefs.current.set(socketId, audio);
      document.body.appendChild(audio);
    }
    audio.srcObject = stream;
  };

  const createPeer = async (member: VoiceMember, shouldOffer: boolean) => {
    if (peersRef.current.has(member.socketId)) {
      return peersRef.current.get(member.socketId) ?? null;
    }
    const peer = new RTCPeerConnection(rtcConfig);
    peersRef.current.set(member.socketId, peer);

    const stream = await ensureLocalStream();
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        const payload: SignalPayload = {
          channelId: channel.id,
          to: member.socketId,
          from: socket.id,
          candidate: event.candidate
        };
        socket.emit("voice:signal", payload);
      }
    };

    peer.ontrack = (event) => {
      attachRemoteTrack(member.socketId, event.streams[0]);
    };

    if (shouldOffer) {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("voice:signal", {
        channelId: channel.id,
        to: member.socketId,
        from: socket.id,
        description: peer.localDescription
      });
    }

    return peer;
  };

  useEffect(() => {
    const joinVoice = async () => {
      await ensureLocalStream();
      socket.emit("voice:join", {
        channelId: channel.id,
        userId: user.id,
        name: user.email ?? "User"
      });
    };

    joinVoice();

    const handleMembers = async (nextMembers: VoiceMember[]) => {
      setMembers(nextMembers);
      membersRef.current = nextMembers;
      const localId = socket.id;
      const otherMembers = nextMembers.filter(
        (member) => member.socketId !== localId
      );
      for (const member of otherMembers) {
        const shouldOffer = localId > member.socketId;
        await createPeer(member, shouldOffer);
      }
    };

    const handleSignal = async (payload: SignalPayload) => {
      if (payload.channelId !== channel.id) {
        return;
      }
      if (payload.to !== socket.id) {
        return;
      }
      const member = membersRef.current.find(
        (item) => item.socketId === payload.from
      );
      if (!member) {
        return;
      }
      const peer =
        (await createPeer(member, false)) ??
        peersRef.current.get(member.socketId);
      if (!peer) {
        return;
      }
      if (payload.description) {
        await peer.setRemoteDescription(payload.description);
        if (payload.description.type === "offer") {
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.emit("voice:signal", {
            channelId: channel.id,
            to: member.socketId,
            from: socket.id,
            description: peer.localDescription
          });
        }
      }
      if (payload.candidate) {
        await peer.addIceCandidate(payload.candidate);
      }
    };

    socket.on("voice:members", handleMembers);
    socket.on("voice:signal", handleSignal);

    return () => {
      socket.emit("voice:leave", { channelId: channel.id });
      socket.off("voice:members", handleMembers);
      socket.off("voice:signal", handleSignal);
      cleanupPeers();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [channel.id, socket, user.email, user.id]);

  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream) {
      return;
    }
    stream.getAudioTracks().forEach((track) => (track.enabled = !muted));
  }, [muted]);

  useEffect(() => {
    audioRefs.current.forEach((audio) => {
      audio.muted = deafened;
    });
  }, [deafened]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">
          🔊 {channel.name}
        </h2>
        <div className="flex gap-2">
          <button
            className="rounded-md bg-slate-800 px-3 py-1 text-xs text-slate-200"
            onClick={() => setMuted((prev) => !prev)}
          >
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            className="rounded-md bg-slate-800 px-3 py-1 text-xs text-slate-200"
            onClick={() => setDeafened((prev) => !prev)}
          >
            {deafened ? "Undeafen" : "Deafen"}
          </button>
        </div>
      </header>
      <div className="flex flex-1">
        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="text-sm text-slate-400">
            Connected to voice channel. Audio only.
          </p>
        </div>
        <aside className="w-56 border-l border-slate-800 bg-slate-900 p-4">
          <h3 className="text-xs font-semibold uppercase text-slate-400">
            Members
          </h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-200">
            {members.map((member) => (
              <li key={member.socketId}>
                {member.name}
                {member.userId === user.id ? " (You)" : ""}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
