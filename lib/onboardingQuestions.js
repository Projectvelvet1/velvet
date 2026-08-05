// Welcome Tomorrow Pre-Kickoff Client Intake. One form for both future clients
// (discovery) and signed clients (full). Field types: text, textarea, url,
// select (one option), multiselect (many), contact (grouped fields), ack (required).
export const INTAKE_STEPS = [
  {
    title: "Business goals and guardrails",
    subtitle: "The economics we plan around.",
    questions: [
      { key: "growth_target", label: "1.1 Primary 12-month growth target", type: "textarea", helper: "Your main revenue, user-acquisition, or app-growth target." },
      { key: "economics", label: "1.2 Economics and margin constraints", type: "text", helper: "e.g. target CAC under $15; minimum 90-day ROAS of 180%." },
      { key: "risk_appetite", label: "1.3 Risk appetite and test budgets", type: "select", options: ["Conservative — proven channels only", "Balanced — moderate test budget", "Aggressive — test emerging platforms"] },
      { key: "success_criteria", label: "1.4 Success criteria (Day 30 / 60 / 90)", type: "textarea", helper: "In numbers, what does success look like at each milestone." },
    ],
  },
  {
    title: "Technical infrastructure",
    subtitle: "So we can audit attribution before day 0.",
    questions: [
      { key: "mmp", label: "2.1 Mobile Measurement Partner (MMP)", type: "select", options: ["AppsFlyer", "Adjust", "Branch", "Singular", "None / custom internal attribution"] },
      { key: "ad_platforms", label: "2.2 Primary ad platforms and analytics", type: "multiselect", options: ["Meta (Facebook / Instagram)", "Google Ads / App Campaigns", "Apple Search Ads", "TikTok Ads", "GA4 / Firebase", "Mixpanel / Amplitude"] },
      { key: "tech_contact", label: "2.3 Technical / developer contact", type: "contact", fields: [["name", "Full name"], ["role", "Role / title"], ["email", "Email"], ["phone", "Direct phone / WhatsApp"]] },
      { key: "web_analytics", label: "2.4 Web analytics and tag management", type: "multiselect", options: ["Google Tag Manager (GTM)", "Google Analytics 4 (GA4)", "Mixpanel / Amplitude / Heap", "None / custom"] },
      { key: "web_ids", label: "2.4b GTM container ID / GA4 measurement ID", type: "text", helper: "If known." },
      { key: "pixels", label: "2.5 Ad pixels and Conversions API", type: "multiselect", options: ["Meta Pixel and CAPI", "Google Ads Conversion Tag and Enhanced Conversions", "TikTok Web Pixel", "LinkedIn / Twitter / other pixels"] },
      { key: "web_to_app", label: "2.6 Web-to-app funnel and deep-linking", type: "select", options: ["Yes — MMP smart banners / deferred deep links", "Yes — direct app store links (no attribution)", "No — web and app funnels are separate"] },
      { key: "web_contact", label: "2.7 Webmaster / frontend developer contact", type: "contact", fields: [["name_role", "Full name and role"], ["email", "Email / Slack handle"]] },
    ],
  },
  {
    title: "SEO, search intent, and landing pages",
    subtitle: "Raw data for the keyword and CRO scans.",
    questions: [
      { key: "gsc_access", label: "3.1 Google Search Console access", type: "select", options: ["Yes — access granted to analytics@welcometomorrow.com", "No / not set up"] },
      { key: "keywords", label: "3.2 Priority search keywords and core intent", type: "textarea", helper: "Top 5-10 search terms your customers use." },
      { key: "seo_competitors", label: "3.3 Organic and search competitors", type: "textarea", helper: "3 competitors who outrank you." },
      { key: "landing_pages", label: "3.4 Primary campaign landing page URLs", type: "url", helper: "Where paid traffic will be sent." },
    ],
  },
  {
    title: "Creative and brand assets",
    subtitle: "The raw materials for creative concepts.",
    questions: [
      { key: "brand_drive", label: "4.1 Shared brand and asset drive link", type: "url", helper: "Drive, Dropbox, Figma, or Frame.io with logos, guidelines, fonts, assets." },
      { key: "top_creatives", label: "4.2 Top 3 historical performing creative assets", type: "textarea", helper: "Links, and what made them work." },
      { key: "localisation", label: "4.3 Regional and localisation requirements", type: "textarea", helper: "Regions, languages, cultural nuances." },
    ],
  },
  {
    title: "Governance and sign-off",
    subtitle: "Who signs off, and how we communicate.",
    questions: [
      { key: "decision_maker", label: "5.1 Named client decision maker", type: "contact", fields: [["name", "Full name"], ["role", "Role / title"], ["email", "Email"], ["phone", "Direct mobile / WhatsApp"]] },
      { key: "async_channel", label: "5.2 Preferred async communication channel", type: "select", options: ["Shared Slack channel", "Microsoft Teams", "WhatsApp group", "Notion workspace"] },
      { key: "sla_ack", label: "5.3 Acknowledgment of approval SLA", type: "ack", ackText: "I acknowledge the 24-48 hour creative approval protocol. If approval requests aren't addressed in time, Welcome Tomorrow proceeds with the pre-approved default option." },
    ],
  },
];

export function stepsFor() { return INTAKE_STEPS; }

// Flat [{key,label,type}] for the answer recap. Contacts expand into sub-keys.
export function questionsFlat() {
  const out = [];
  INTAKE_STEPS.forEach((s) => s.questions.forEach((q) => {
    if (q.type === "contact") q.fields.forEach(([sub, subLabel]) => out.push({ key: `${q.key}_${sub}`, label: `${q.label.replace(/^\d+(\.\d+)*\s*/, "")} — ${subLabel}`, type: "text" }));
    else out.push({ key: q.key, label: q.label, type: q.type || "text" });
  }));
  return out;
}

// Back-compat: the answer recap uses a flat [{key,label,type}] list.
export async function loadQuestions() { return questionsFlat(); }
