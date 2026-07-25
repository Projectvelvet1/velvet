// Builds the agency sidebar's department section based on role.
// - super admin & project lead: all three departments (all services)
// - team member: only the services they are assigned to (grouped by department)
export const DEPARTMENTS = [
  { key: "performance", label: "Performance", services: [
    { key: "paid_media", label: "Paid Media" }, { key: "seo", label: "SEO" }, { key: "aso", label: "ASO" } ] },
  { key: "content", label: "Content", services: [
    { key: "creative_strategy", label: "Creative Strategy" }, { key: "asset_production", label: "Asset Production" }, { key: "ugc", label: "UGC" } ] },
  { key: "analytics", label: "Analytics", services: [
    { key: "tracking", label: "Tracking" }, { key: "dashboarding", label: "Dashboarding" } ] },
];

// seesAll: super admin or project lead (of any client)
// assignedServiceKeys: Set of service_keys this person is assigned to (team member)
export function departmentsForRole({ seesAll, assignedServiceKeys }) {
  if (seesAll) return DEPARTMENTS;
  const set = assignedServiceKeys || new Set();
  return DEPARTMENTS
    .map((d) => ({ ...d, services: d.services.filter((s) => set.has(s.key)) }))
    .filter((d) => d.services.length > 0);
}

import { supabase } from "./supabase";
// Loads the current agency user's departments (role-aware).
export async function loadAgencyDepts(uid, isSuper) {
  const { data: ws } = await supabase.from("workspaces").select("project_lead_id");
  const isProjectLead = (ws || []).some((w) => w.project_lead_id === uid);
  const seesAll = !!isSuper || isProjectLead;
  const { data: a } = await supabase.from("service_assignments").select("service_key").eq("profile_id", uid);
  return departmentsForRole({ seesAll, assignedServiceKeys: new Set((a || []).map((x) => x.service_key)) });
}
