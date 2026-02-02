export type Server = {
  id: string;
  name: string;
};

export type Channel = {
  id: string;
  server_id: string;
  name: string;
  type: "text" | "voice";
};

export type Message = {
  id: string;
  channel_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: {
    email?: string | null;
  } | null;
};

export type VoiceMember = {
  socketId: string;
  userId: string;
  name: string;
};
