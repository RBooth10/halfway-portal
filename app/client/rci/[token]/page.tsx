"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

type RciQuestion = {
  id: string;
  question_number: number;
  domain: string | null;
  question_text: string;
  min_score: number;
  max_score: number;
};

export default function ClientRciPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [questions, setQuestions] = useState<RciQuestion[]>([]);
  const [rciVersion, setRciVersion] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAssessment() {
      try {
        const supabase = getSupabaseClient();

        const { data, error } = await supabase.rpc("get_client_rci_assessment", {
          p_access_token: token,
        });

        if (error) {
          throw error;
        }

        if (!data?.ok) {
          setError(data?.message ?? "This assessment link is unavailable.");
          return;
        }

        setRciVersion(data.rci_version ?? "");
        setQuestions((data.questions ?? []) as RciQuestion[]);
      } catch (err) {
        const rciError = err as { message?: unknown };
        setError(rciError?.message ? String(rciError.message) : "Could not load assessment.");
      } finally {
        setLoading(false);
      }
    }

    loadAssessment();
  }, [token]);

  function setScore(questionId: string, score: number) {
    setResponses((current) => ({
      ...current,
      [questionId]: score,
    }));
  }

  async function submitAssessment() {
    setSubmitting(true);
    setError("");
    setMessage("");

    if (questions.length === 0) {
      setSubmitting(false);
      setError("No questions are available for this assessment.");
      return;
    }

    const unanswered = questions.filter((question) => responses[question.id] === undefined);

    if (unanswered.length > 0) {
      setSubmitting(false);
      setError(`Please answer all questions before submitting. Remaining: ${unanswered.length}`);
      return;
    }

    try {
      const supabase = getSupabaseClient();

      const responsePayload = questions.map((question) => ({
        question_id: question.id,
        response_score: responses[question.id],
        response_text: null,
      }));

      const { data, error } = await supabase.rpc("submit_client_rci_assessment", {
        p_access_token: token,
        p_client_name: clientName,
        p_client_email: clientEmail,
        p_responses: responsePayload,
      });

      if (error) {
        throw error;
      }

      if (!data?.ok) {
        setError(data?.message ?? "Could not submit assessment.");
        return;
      }

      setComplete(true);
      setMessage("Thank you. Your assessment was submitted successfully.");
    } catch (err) {
      const submitError = err as { message?: unknown };
      setError(submitError?.message ? String(submitError.message) : "Could not submit assessment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-slate-100">
              <ShieldCheck className="h-8 w-8 text-slate-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Client Assessment</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Recovery Capital Assessment</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Complete each question honestly. Your responses will be sent securely to your recovery residence support team.
              </p>
              {rciVersion ? (
                <p className="mt-2 text-xs font-medium text-amber-700">
                  Version: {rciVersion}. Demo questions are for testing only until approved RCI wording is added.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500 shadow-sm">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading assessment...
            </div>
          </div>
        ) : null}

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <div className="flex gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p>{message}</p>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        {!loading && !complete && questions.length > 0 ? (
          <>
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Your Information</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Name</span>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Email</span>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(event) => setClientEmail(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                  />
                </label>
              </div>
            </section>

            <section className="space-y-4">
              {questions.map((question) => (
                <div key={question.id} className="rounded-2xl border bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">
                    Question {question.question_number}
                    {question.domain ? ` • ${question.domain}` : ""}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-950">
                    {question.question_text}
                  </h2>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {Array.from(
                      { length: question.max_score - question.min_score + 1 },
                      (_, index) => question.min_score + index
                    ).map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setScore(question.id, score)}
                        className={
                          responses[question.id] === score
                            ? "rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white"
                            : "rounded-xl border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        }
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <button
              type="button"
              onClick={submitAssessment}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {submitting ? "Submitting..." : "Submit Assessment"}
            </button>
          </>
        ) : null}
      </div>
    </main>
  );
}
