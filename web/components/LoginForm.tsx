"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("Sending magic link...");
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus("Check your email for the magic link.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md space-y-4 rounded-xl bg-slate-900 p-6 shadow"
      >
        <div>
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm text-slate-400">
            Use your email to receive a magic link.
          </p>
        </div>
        <input
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <button
          className="w-full rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          type="submit"
        >
          Send magic link
        </button>
        {status ? <p className="text-sm text-slate-300">{status}</p> : null}
      </form>
    </div>
  );
}
