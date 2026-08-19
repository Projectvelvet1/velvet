"use client";
// Maturity questionnaire pipeline (feature 4), in-memory scaffold.
// build -> send for approval -> approve/reject -> approved library -> (client) assessment
// -> manual scoring (area score /100 + band) -> auto-drafted roadmap -> sent.
// Every meaningful step calls notify() so it surfaces in the bell and, later, Slack.
import { notify } from "./notify";

let _qid = 1, _aid = 1, _rid = 1, _secId = 1, _qqId = 1;
const _questionnaires = []; // {id, service, title, status:'draft'|'pending'|'approved'|'rejected', sections:[{id,title,questions:[{id,text,type}]}], note}
const _assessments = [];    // {id, questionnaireId, service, clientId, clientName, answers:{}, scores:{}, areaScore, band, status:'submitted'|'scored'}
const _roadmaps = [];       // {id, assessmentId, service, clientId, clientName, items:[{text}], status:'draft'|'sent'}
const _subs = new Set();
const emit = () => _subs.forEach((fn) => { try { fn(); } catch {} });

export const QUESTION_TYPES = [["short", "Short text"], ["long", "Long text"], ["single", "Single choice"], ["multi", "Multiple choice"], ["scale", "Scale 1-5"], ["yesno", "Yes / No"]];

export function subscribeMaturity(fn) { _subs.add(fn); fn(); return () => _subs.delete(fn); }
export function getQuestionnaires() { return _questionnaires.slice(); }
export function getAssessments() { return _assessments.slice(); }
export function getRoadmaps() { return _roadmaps.slice(); }
export function band(score) { return score == null ? null : score < 41 ? "Foundational" : score <= 70 ? "Developing" : "Mature"; }

export function createQuestionnaire(service, title) { const q = { id: _qid++, service, title: title || `${service} maturity`, status: "draft", sections: [], note: "" }; _questionnaires.push(q); emit(); return q; }
export function updateQuestionnaire(id, patch) { const q = _questionnaires.find((x) => x.id === id); if (!q) return; Object.assign(q, patch); emit(); }
export function addSection(id, title) { const q = _questionnaires.find((x) => x.id === id); if (!q) return; q.sections.push({ id: _secId++, title: title || "Section", questions: [] }); emit(); }
export function addQuestion(id, secId, text, type) { const q = _questionnaires.find((x) => x.id === id); const s = q && q.sections.find((x) => x.id === secId); if (!s) return; s.questions.push({ id: _qqId++, text: text || "Question", type: type || "scale" }); emit(); }
export function moveQuestion(id, secId, idx, dir) { const q = _questionnaires.find((x) => x.id === id); const s = q && q.sections.find((x) => x.id === secId); if (!s) return; const j = idx + dir; if (j < 0 || j >= s.questions.length) return; const a = s.questions; [a[idx], a[j]] = [a[j], a[idx]]; emit(); }
export function moveSection(id, idx, dir) { const q = _questionnaires.find((x) => x.id === id); if (!q) return; const j = idx + dir; if (j < 0 || j >= q.sections.length) return; [q.sections[idx], q.sections[j]] = [q.sections[j], q.sections[idx]]; emit(); }
export function removeQuestion(id, secId, qqId) { const q = _questionnaires.find((x) => x.id === id); const s = q && q.sections.find((x) => x.id === secId); if (!s) return; s.questions = s.questions.filter((x) => x.id !== qqId); emit(); }

export function sendForApproval(id) { const q = _questionnaires.find((x) => x.id === id); if (!q) return; q.status = "pending"; notify({ type: "questionnaire", text: `Questionnaire sent for approval: ${q.title}`, meta: { id } }); emit(); }
export function approveQuestionnaire(id) { const q = _questionnaires.find((x) => x.id === id); if (!q) return; q.status = "approved"; notify({ type: "questionnaire", text: `Questionnaire approved: ${q.title}`, meta: { id } }); emit(); }
export function rejectQuestionnaire(id, note) { const q = _questionnaires.find((x) => x.id === id); if (!q) return; q.status = "rejected"; q.note = note || ""; notify({ type: "questionnaire", text: `Questionnaire rejected: ${q.title}`, meta: { id, note } }); emit(); }

// A client filling a questionnaire lands here (simulated in the demo).
export function submitAssessment(questionnaireId, clientId, clientName, answers) {
  const q = _questionnaires.find((x) => x.id === questionnaireId);
  const a = { id: _aid++, questionnaireId, service: q ? q.service : null, clientId, clientName, answers: answers || {}, scores: {}, areaScore: null, band: null, status: "submitted" };
  _assessments.push(a); notify({ type: "questionnaire", text: `Assessment submitted by ${clientName}`, meta: { id: a.id } }); emit(); return a;
}
export function scoreAssessment(id, scores) {
  const a = _assessments.find((x) => x.id === id); if (!a) return;
  a.scores = scores; const vals = Object.values(scores).filter((v) => typeof v === "number");
  a.areaScore = vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
  a.band = band(a.areaScore); a.status = "scored";
  notify({ type: "questionnaire", text: `Assessment scored: ${a.areaScore}/100 (${a.band})`, meta: { id } }); emit(); return a;
}
export function generateRoadmap(assessmentId) {
  const a = _assessments.find((x) => x.id === assessmentId); if (!a) return;
  const q = _questionnaires.find((x) => x.id === a.questionnaireId);
  const items = [];
  (q ? q.sections : []).forEach((sec) => sec.questions.forEach((qq) => { const sc = a.scores[qq.id]; if (typeof sc === "number" && sc < 70) items.push({ text: `Improve: ${qq.text}` }); }));
  if (!items.length) items.push({ text: "Maintain current maturity; schedule a quarterly review." });
  const r = { id: _rid++, assessmentId, service: a.service, clientId: a.clientId, clientName: a.clientName, items, status: "draft" };
  _roadmaps.push(r); notify({ type: "questionnaire", text: `Roadmap drafted for ${a.clientName}`, meta: { id: r.id } }); emit(); return r;
}
export function updateRoadmapItems(id, items) { const r = _roadmaps.find((x) => x.id === id); if (!r) return; r.items = items; emit(); }
export function sendRoadmap(id) { const r = _roadmaps.find((x) => x.id === id); if (!r) return; r.status = "sent"; notify({ type: "questionnaire", text: `Roadmap sent to ${r.clientName}`, meta: { id } }); emit(); }
