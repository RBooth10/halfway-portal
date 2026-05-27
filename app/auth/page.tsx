"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSession() {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          setCurrentUserEmail(null);
          return;
        }

        setCurrentUserEmail(data.user?.email ?? null);
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, []);

  async function handleAuth() {
    setWorking(true);
    setMessage("");
    setError("");

    if (!email.trim() || !password.trim()) {
      setWorking(false);
      setError("Email and password are required.");
      return;
    }

    try {
      const supabase = getSupabaseClient();

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        setCurrentUserEmail(data.user?.email ?? email.trim());
        setMessage(
          "Account created. If email confirmation is enabled in Supabase, check your inbox before signing in."
        );
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        setCurrentUserEmail(data.user?.email ?? email.trim());
        setMessage("Signed in successfully.");
      }
    } catch (err) {
      const authError = err as { message?: unknown };
      setError(authError?.message ? String(authError.message) : "Authentication failed.");
    } finally {
      setWorking(false);
    }
  }

  async function signOut() {
    setWorking(true);
    setMessage("");
    setError("");

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      setCurrentUserEmail(null);
      setMessage("Signed out successfully.");
    } catch (err) {
      const authError = err as { message?: unknown };
      setError(authError?.message ? String(authError.message) : "Could not sign out.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <PageShell maxWidth="max-w-5xl">
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
            <LockKeyhole className="h-7 w-7 text-slate-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Authentication Setup</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Portal Sign In
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Create or sign into a Supabase Auth account. Later, this account will be connected
              to a staff profile, provider, role, and house-level permissions.
            </p>
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="flex gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p>{message}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Checking session...
            </div>
          ) : currentUserEmail ? (
            <div>
              <h2 className="text-lg font-semibold">Signed In</h2>
              <p className="mt-2 text-sm text-slate-600">
                You are currently signed in as:
              </p>
              <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-950">
                {currentUserEmail}
              </p>

              <button
                type="button"
                onClick={signOut}
                disabled={working}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Sign Out
              </button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={
                    mode === "signin"
                      ? "flex-1 rounded-xl bg-white px-4 py-2 text-sm font-medium shadow-sm"
                      : "flex-1 rounded-xl px-4 py-2 text-sm font-medium text-slate-600"
                  }
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={
                    mode === "signup"
                      ? "flex-1 rounded-xl bg-white px-4 py-2 text-sm font-medium shadow-sm"
                      : "flex-1 rounded-xl px-4 py-2 text-sm font-medium text-slate-600"
                  }
                >
                  Create Account
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Email</span>
                  <div className="relative mt-2">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="email@example.com"
                      className="h-11 w-full rounded-xl border bg-white pl-10 pr-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Password</span>
                  <div className="relative mt-2">
                    <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Password"
                      className="h-11 w-full rounded-xl border bg-white pl-10 pr-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                    />
                  </div>
                </label>

                <button
                  type="button"
                  onClick={handleAuth}
                  disabled={working}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {working ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : mode === "signup" ? (
                    <UserPlus className="h-4 w-4" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  {working ? "Working..." : mode === "signup" ? "Create Account" : "Sign In"}
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">What this does now</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p className="rounded-2xl bg-slate-50 p-4">Creates a Supabase Auth user.</p>
              <p className="rounded-2xl bg-slate-50 p-4">Allows sign in and sign out.</p>
              <p className="rounded-2xl bg-slate-50 p-4">Keeps the session in the browser.</p>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">What comes next</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Next we will connect authenticated users to staff profiles and replace temporary
              development policies with provider-specific RLS rules.
            </p>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
