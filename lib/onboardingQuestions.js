// PLACEHOLDER discovery questions. Swap for the real set later (or Stage 2: DB).
export const DISCOVERY_STEPS = [
  { title: "Your business", subtitle: "The basics so we understand you.", questions: [
    { key: "company_name", label: "Company name", helper: "Your brand as customers know it." },
    { key: "what_you_do", label: "What does your business do?", type: "textarea", helper: "A sentence or two is fine." },
  ]},
  { title: "Your challenges", subtitle: "Where it hurts right now.", questions: [
    { key: "main_problem", label: "Your single biggest marketing challenge right now?", type: "textarea" },
    { key: "tried_before", label: "What have you already tried?", type: "textarea" },
  ]},
  { title: "Where you want to go", subtitle: "What good looks like.", questions: [
    { key: "goal_6m", label: "What would success look like in 6 months?", type: "textarea" },
    { key: "timeline", label: "When would you like to start?" },
  ]},
];

// The signed-client onboarding (placeholder). Swap for the real set later.
export const FULL_STEPS = [
  { title: "Company presentation", subtitle: "The fundamentals of your business.", questions: [
    { key: "full_company_name", label: "Company name" },
    { key: "value_prop", label: "What is your value proposition, and for which audience?", type: "textarea" },
    { key: "priority_offer", label: "Which product/service should we prioritise?", type: "textarea" },
  ]},
  { title: "Business map", subtitle: "Targets, channels, offers, indicators.", questions: [
    { key: "target_audience", label: "Who are your main target customers?", type: "textarea" },
    { key: "channels", label: "Which channels do you use today?", type: "textarea" },
  ]},
];

export function stepsFor(phase) { return phase === "full" ? FULL_STEPS : DISCOVERY_STEPS; }
// Flat [{key,label}] for rendering answers.
export function questionsFlat(phase) {
  return stepsFor(phase).flatMap((s) => s.questions.map((q) => ({ key: q.key, label: q.label, type: q.type || "text" })));
}

import { supabase } from "./supabase";
// Live questions from the database (ordered). Falls back to the static seed.
export async function loadQuestions(phase) {
  try {
    const { data } = await supabase.from("onboarding_questions")
      .select("question_key,label,helper,answer_type,sort_order").eq("phase", phase).order("sort_order", { ascending: true });
    if (data && data.length) return data.map((q) => ({ key: q.question_key, label: q.label, helper: q.helper || "", type: q.answer_type || "text" }));
  } catch (e) {}
  return questionsFlat(phase);
}
