"use client";
// Central notification / event helper (feature 6).
// Every relevant action calls notify(). Today events live in-memory and surface in the
// in-app notifications area (the bell in the Shell). A single Slack-ready integration
// point is marked below so a real Slack call can be dropped in later with no refactor.

const _events = [];        // { id, ts, type, text, meta, read }
const _access = [];        // { personId, resource, via, grantedAt }
const _subs = new Set();
let _id = 1;

// ============================================================================
// SLACK ADAPTER — TODO: wire real Slack here (single integration point).
// Later, replace the body with e.g.:
//   await fetch("/api/slack-notify", { method: "POST",
//     headers: { "Content-Type": "application/json" }, body: JSON.stringify(event) });
// Nothing else needs to change; every notify() already flows through here.
// ============================================================================
async function slackAdapter(event) {
  // no-op for now (scaffold). Keep signature stable.
  return event;
}

export function notify(event) {
  const e = { id: _id++, ts: Date.now(), read: false, type: "info", text: "", meta: {}, ...event };
  _events.unshift(e);
  Promise.resolve(slackAdapter(e)).catch(() => {});
  _subs.forEach((fn) => { try { fn(_events.slice()); } catch { /* ignore */ } });
  return e;
}

// Assigning a task or a role grants that person the relevant access (tracked in state).
export function grantAccess(personId, resource, via) {
  _access.push({ personId, resource, via: via || "assignment", grantedAt: Date.now() });
  notify({ type: "access_granted", text: `Access granted: ${resource}`, meta: { personId, resource } });
}

export function getEvents() { return _events.slice(); }
export function getAccess() { return _access.slice(); }
export function unreadCount() { return _events.filter((e) => !e.read).length; }
export function markAllRead() { _events.forEach((e) => (e.read = true)); _subs.forEach((fn) => { try { fn(_events.slice()); } catch {} }); }
export function subscribe(fn) { _subs.add(fn); fn(_events.slice()); return () => _subs.delete(fn); }
