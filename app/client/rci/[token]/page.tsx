"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Loader2, Plus, ShieldCheck } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

type RciQuestion = {
  id: string;
  question_number: number;
  domain: string | null;
  question_text: string;
  min_score: number;
  max_score: number;
  reverse_scored: boolean;
};

type GoalForm = {
  goal_area: string;
  goal_text: string;
  action_steps: string;
  supports_needed: string;
  priority: string;
};

type DomainResult = {
  domain: string;
  score: number;
  max: number;
  level: string;
  summary: string;
};

type ResultPreview = {
  totalScore: number;
  totalMax: number;
  level: string;
  percent: number;
  summary: string;
  domainResults: DomainResult[];
};

const initialGoalForms: GoalForm[] = [
  {
    goal_area: "personal_capital",
    goal_text: "",
    action_steps: "",
    supports_needed: "",
    priority: "medium",
  },
  {
    goal_area: "social_capital",
    goal_text: "",
    action_steps: "",
    supports_needed: "",
    priority: "medium",
  },
  {
    goal_area: "cultural_capital",
    goal_text: "",
    action_steps: "",
    supports_needed: "",
    priority: "medium",
  },
];

function domainDescription(domain: string | null) {
  if (domain === "Personal Capital") {
    return "This section reflects your internal strengths and overall stability, including health, housing, finances, employment, nutrition, and daily life.";
  }

  if (domain === "Social Capital") {
    return "This section focuses on relationships, family support, friends, your support network, and community connection.";
  }

  if (domain === "Cultural Capital") {
    return "This section explores values, purpose, spirituality, identity, and meaningful participation in family or community.";
  }

  return "";
}

function goalAreaLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function calculateLevel(score: number, max: number) {
  if (max <= 0) return "not calculated";

  const ratio = score / max;

  if (ratio < 0.4) return "low";
  if (ratio < 0.7) return "moderate";
  return "high";
}

function levelSummary(level: string, domain?: string) {
  const area = domain ? `${domain} ` : "";

  if (level === "high") {
    return `${area}results show strong recovery capital. This area may be a strength to maintain and build from.`;
  }

  if (level === "moderate") {
    return `${area}results show some stability with room for growth. This may be a good area for practical recovery goals.`;
  }

  if (level === "low") {
    return `${area}results show this area may need additional support, structure, or connection to resources.`;
  }

  return `${area}results could not be calculated.`;
}

function adjustedScore(question: RciQuestion, rawScore: number) {
  if (!question.reverse_scored) return rawScore;

  return question.max_score + question.min_score - rawScore;
}

export default function ClientRciPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [questions, setQuestions] = useState<RciQuestion[]>([]);
  const [rciVersion, setRciVersion] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [goalForms, setGoalForms] = useState<GoalForm[]>(initialGoalForms);
  const [showResults, setShowResults] = useState(false);
  const [resultPreview, setResultPreview] = useState<ResultPreview | null>(null);
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

    void loadAssessment();
  }, [token]);

  const groupedQuestions = useMemo(() => {
    return questions.reduce<Record<string, RciQuestion[]>>((groups, question) => {
      const domain = question.domain ?? "Assessment";
      groups[domain] = groups[domain] ?? [];
      groups[domain].push(question);
      return groups;
    }, {});
  }, [questions]);

  function setScore(questionId: string, score: number) {
    setResponses((current) => ({
      ...current,
      [questionId]: score,
    }));
    setShowResults(false);
    setResultPreview(null);
  }

  function updateGoal(index: number, field: keyof GoalForm, value: string) {
    setGoalForms((current) =>
      current.map((goal, goalIndex) =>
        goalIndex === index ? { ...goal, [field]: value } : goal
      )
    );
  }

  function addGoal() {
    setGoalForms((current) => [
      ...current,
      {
        goal_area: "personal_capital",
        goal_text: "",
        action_steps: "",
        supports_needed: "",
        priority: "medium",
      },
    ]);
  }

  function calculateResultsPreview() {
    setError("");
    setMessage("");

    const unanswered = questions.filter((question) => responses[question.id] === undefined);

    if (unanswered.length > 0) {
      setError(`Please answer all questions before viewing your results. Remaining: ${unanswered.length}`);
      return;
    }

    const domainResults = Object.entries(groupedQuestions).map(([domain, domainQuestions]) => {
      const score = domainQuestions.reduce((sum, question) => {
        return sum + adjustedScore(question, responses[question.id]);
      }, 0);

      const max = domainQuestions.reduce((sum, question) => sum + question.max_score, 0);
      const level = calculateLevel(score, max);

      return {
        domain,
        score,
        max,
        level,
        summary: levelSummary(level, domain),
      };
    });

    const totalScore = domainResults.reduce((sum, result) => sum + result.score, 0);
    const totalMax = domainResults.reduce((sum, result) => sum + result.max, 0);
    const level = calculateLevel(totalScore, totalMax);
    const percent = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

    setResultPreview({
      totalScore,
      totalMax,
      level,
      percent,
      summary: levelSummary(level),
      domainResults,
    });

    setShowResults(true);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function submitAssessmentAndGoals() {
    setSubmitting(true);
    setError("");
    setMessage("");

    if (!resultPreview) {
      setSubmitting(false);
      setError("Please view your RCI results before submitting your recovery goals.");
      return;
    }

    const recoveryGoals = goalForms
      .filter((goal) => goal.goal_text.trim())
      .map((goal) => ({
        goal_area: goal.goal_area,
        goal_text: goal.goal_text.trim(),
        action_steps: goal.action_steps.trim() || null,
        supports_needed: goal.supports_needed.trim() || null,
        priority: goal.priority,
      }));

    if (recoveryGoals.length === 0) {
      setSubmitting(false);
      setError("Please enter at least one recovery goal before submitting.");
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

      const goalsResult = await supabase.rpc("submit_client_recovery_goals", {
        p_access_token: token,
        p_goals: recoveryGoals,
      });

      if (goalsResult.error) {
        throw goalsResult.error;
      }

      if (!goalsResult.data?.ok) {
        setError(goalsResult.data?.message ?? "The assessment submitted, but the recovery goals did not save.");
        return;
      }

      setComplete(true);
      setMessage("Thank you. Your RCI assessment and recovery goals were submitted successfully.");
    } catch (err) {
      console.error("Client RCI submit error:", err);
      const submitError = err as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
      setError(
        [
          submitError?.message ? String(submitError.message) : "Could not submit assessment and goals.",
          submitError?.details ? `Details: ${String(submitError.details)}` : "",
          submitError?.hint ? `Hint: ${String(submitError.hint)}` : "",
          submitError?.code ? `Code: ${String(submitError.code)}` : "",
        ]
          .filter(Boolean)
          .join(" ")
      );
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
                Complete each question based on how true it feels for you today. After you answer,
                you will see your results and use them to create your recovery goals.
              </p>
              {rciVersion ? (
                <p className="mt-2 text-xs font-medium text-slate-500">Version: {rciVersion}</p>
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

            {Object.entries(groupedQuestions).map(([domain, domainQuestions]) => (
              <section key={domain} className="space-y-4">
                <div className="rounded-2xl border bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold">{domain}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {domainDescription(domain)}
                  </p>
                </div>

                {domainQuestions.map((question) => (
                  <div key={question.id} className="rounded-2xl border bg-white p-6 shadow-sm">
                    <p className="text-sm font-medium text-slate-500">
                      Question {question.question_number}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-950">
                      {question.question_text}
                    </h3>

                    <div className="mt-5">
                      <div className="flex justify-between text-xs font-medium text-slate-500">
                        <span>Strongly Disagree</span>
                        <span>Strongly Agree</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
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
                  </div>
                ))}
              </section>
            ))}

            <button
              type="button"
              onClick={calculateResultsPreview}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              <CheckCircle2 className="h-4 w-4" />
              View My Results and Create Goals
            </button>

            {showResults && resultPreview ? (
              <>
                <section className="rounded-2xl border bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold">Your RCI Results</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    These results are not a judgment. They are meant to help you see strengths,
                    identify support needs, and create a recovery plan that fits your life today.
                  </p>

                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">Overall Recovery Capital</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">
                      {resultPreview.totalScore} out of {resultPreview.totalMax} • {resultPreview.level}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {resultPreview.summary}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {resultPreview.domainResults.map((result) => (
                      <div key={result.domain} className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          {result.domain}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-slate-950">
                          {result.score} / {result.max}
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {result.level}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {result.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold">My Recovery Goals</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Based on your results, write at least one goal you want to work on. These goals
                    will be sent to your support team with your RCI summary.
                  </p>

                  <div className="mt-5 space-y-5">
                    {goalForms.map((goal, index) => (
                      <div key={index} className="rounded-2xl bg-slate-50 p-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="block">
                            <span className="text-sm font-medium text-slate-700">Goal area</span>
                            <select
                              value={goal.goal_area}
                              onChange={(event) => updateGoal(index, "goal_area", event.target.value)}
                              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                            >
                              <option value="personal_capital">Personal Capital</option>
                              <option value="social_capital">Social Capital</option>
                              <option value="cultural_capital">Cultural Capital</option>
                              <option value="housing_stability">Housing / Stability</option>
                              <option value="employment_financial">Employment / Financial</option>
                              <option value="health_medication">Health / Medication</option>
                              <option value="community_support">Community Support</option>
                              <option value="other">Other</option>
                            </select>
                          </label>

                          <label className="block">
                            <span className="text-sm font-medium text-slate-700">Priority</span>
                            <select
                              value={goal.priority}
                              onChange={(event) => updateGoal(index, "priority", event.target.value)}
                              className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </label>

                          <label className="block md:col-span-2">
                            <span className="text-sm font-medium text-slate-700">
                              Goal {index + 1}
                            </span>
                            <textarea
                              value={goal.goal_text}
                              onChange={(event) => updateGoal(index, "goal_text", event.target.value)}
                              placeholder={`Example for ${goalAreaLabel(goal.goal_area)}: I want to...`}
                              className="mt-2 min-h-24 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                            />
                          </label>

                          <label className="block md:col-span-2">
                            <span className="text-sm font-medium text-slate-700">Action steps</span>
                            <textarea
                              value={goal.action_steps}
                              onChange={(event) => updateGoal(index, "action_steps", event.target.value)}
                              placeholder="What steps will help you work toward this goal?"
                              className="mt-2 min-h-20 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                            />
                          </label>

                          <label className="block md:col-span-2">
                            <span className="text-sm font-medium text-slate-700">Support needed</span>
                            <textarea
                              value={goal.supports_needed}
                              onChange={(event) => updateGoal(index, "supports_needed", event.target.value)}
                              placeholder="What support, resources, reminders, or help would make this goal easier?"
                              className="mt-2 min-h-20 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addGoal}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4" />
                    Add Another Goal
                  </button>
                </section>

                <button
                  type="button"
                  onClick={submitAssessmentAndGoals}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {submitting ? "Submitting..." : "Submit Assessment and Goals"}
                </button>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
