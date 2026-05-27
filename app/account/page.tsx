"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";

type StaffProfile = {
  id: string;
  provider_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
  house_access: string;
  status: string;
  auth_user_id: string | null;
};

export default function AccountPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [matchingProfile, setMatchingProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadAccount() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const supabase = getSupabaseClient();

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        setUserId(null);
        setUserEmail(null);
        setMatchingProfile(null);
        setError("You are not signed in. Go to Sign In first.");
        return;
      }

      const email = userData.user.email ?? null;

      setUserId(userData.user.id);
      setUserEmail(email);

      if (!email) {
        setError("Your signed-in account does not have an email address.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("staff_profiles")
        .select("*")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      setMatchingProfile((profile ?? null) as StaffProfile | null);
    } catch (err) {
      const accountError = err as { message?: unknown };
      setError(accountError?.message ? String(accountError.message) : "Could not load account.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadAccount());
  }, []);

  async function linkProfile() {
    setWorking(true);
    setMessage("");
    setError("");

    try {
      if (!userId || !userEmail) {
        setError("You must be signed in before linking a staff profile.");
        return;
      }

      if (!matchingProfile) {
        setError("No staff profile was found with your signed-in email address.");
        return;
      }

      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("staff_profiles")
        .update({
          auth_user_id: userId,
          status: "active",
        })
        .eq("id", matchingProfile.id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setMatchingProfile(data as StaffProfile);
      setMessage("Your signed-in account is now linked to this staff profile.");
    } catch (err) {
      const accountError = err as { message?: unknown };
      setError(accountError?.message ? String(accountError.message) : "Could not link profile.");
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
            <UserCog className="h-7 w-7 text-slate-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Account Setup</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Link Auth Account to Staff Profile
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              This connects your Supabase sign-in account to a staff profile. Later, this connection
              will control provider access, role permissions, and house-level visibility.
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
          <h2 className="text-lg font-semibold">Signed-In Account</h2>

          {loading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading account...
            </div>
          ) : userEmail ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="flex items-center gap-2 font-medium text-slate-950">
                  <Mail className="h-4 w-4" />
                  {userEmail}
                </div>
                <p className="mt-1 text-slate-500">Auth user ID: {userId}</p>
              </div>

              {matchingProfile ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                  <div className="flex items-center gap-2 font-medium text-slate-950">
                    <ShieldCheck className="h-4 w-4" />
                    Matching Staff Profile Found
                  </div>
                  <p className="mt-2 text-slate-600">
                    Name: {[matchingProfile.first_name, matchingProfile.last_name].filter(Boolean).join(" ") || "Not entered"}
                  </p>
                  <p className="mt-1 text-slate-600">Role: {matchingProfile.role}</p>
                  <p className="mt-1 text-slate-600">House access: {matchingProfile.house_access}</p>
                  <p className="mt-1 text-slate-600">Status: {matchingProfile.status}</p>
                  <p className="mt-1 text-slate-600">
                    Linked: {matchingProfile.auth_user_id ? "Yes" : "No"}
                  </p>

                  <button
                    type="button"
                    onClick={linkProfile}
                    disabled={working || matchingProfile.auth_user_id === userId}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                    {matchingProfile.auth_user_id === userId ? "Already Linked" : "Link My Account"}
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                  No staff profile was found with this email. Go to Staff & Roles and create a staff
                  profile using the same email address you used to sign in.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
              You are not signed in.
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">How to test this</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p className="rounded-2xl bg-slate-50 p-4">Create or sign into an account on the Auth page.</p>
              <p className="rounded-2xl bg-slate-50 p-4">Create a staff profile with the same email.</p>
              <p className="rounded-2xl bg-slate-50 p-4">Return here and click Link My Account.</p>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Next security step</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              After this works, we can start replacing temporary open development policies with
              provider-specific RLS rules based on the linked staff profile.
            </p>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
