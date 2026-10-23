"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, null);

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-muted">We&apos;ll email you a sign-in link.</p>
      <form action={action} className="mt-6 space-y-3">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="input"
        />
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Sending…" : "Send sign-in link"}
        </button>
      </form>
      {state && (
        <p className={`mt-4 text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}>{state.message}</p>
      )}
    </div>
  );
}
