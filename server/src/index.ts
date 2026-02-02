import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = Number(process.env.PORT ?? 4000);
const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

type VoiceMember = { socketId: string; userId: string; name: string };
const voiceRooms = new Map<string, Map<string, VoiceMember>>();

const emitMembers = (channelId: string) => {
  const members = Array.from(voiceRooms.get(channelId)?.values() ?? []);
  io.to(`voice:${channelId}`).emit("voice:members", members);
};

io.on("connection", (socket) => {
  socket.data.voiceChannels = new Set<string>();

  socket.on("join:text", ({ channelId }) => {
    socket.join(`text:${channelId}`);
  });

  socket.on("leave:text", ({ channelId }) => {
    socket.leave(`text:${channelId}`);
  });

  socket.on("typing:start", ({ channelId, userId, name }) => {
    socket.to(`text:${channelId}`).emit("typing:start", { userId, name });
  });

  socket.on("typing:stop", ({ channelId, userId, name }) => {
    socket.to(`text:${channelId}`).emit("typing:stop", { userId, name });
  });

  socket.on("message:new", async ({ channelId, userId, body }) => {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        channel_id: channelId,
        user_id: userId,
        body
      })
      .select("id,channel_id,user_id,body,created_at")
      .single();

    if (error) {
      socket.emit("message:error", { error: error.message });
      return;
    }

    io.to(`text:${channelId}`).emit("message:new", data);
  });

  socket.on("voice:join", ({ channelId, userId, name }) => {
    socket.join(`voice:${channelId}`);
    socket.data.voiceChannels.add(channelId);
    if (!voiceRooms.has(channelId)) {
      voiceRooms.set(channelId, new Map());
    }
    voiceRooms.get(channelId)?.set(socket.id, {
      socketId: socket.id,
      userId,
      name
    });
    emitMembers(channelId);
  });

  socket.on("voice:leave", ({ channelId }) => {
    socket.leave(`voice:${channelId}`);
    socket.data.voiceChannels.delete(channelId);
    voiceRooms.get(channelId)?.delete(socket.id);
    emitMembers(channelId);
  });

  socket.on("voice:signal", (payload) => {
    io.to(payload.to).emit("voice:signal", payload);
  });

  socket.on("disconnect", () => {
    for (const channelId of socket.data.voiceChannels) {
      voiceRooms.get(channelId)?.delete(socket.id);
      emitMembers(channelId);
    }
  });
});

server.listen(port, () => {
  console.log(`Socket server listening on :${port}`);
});
