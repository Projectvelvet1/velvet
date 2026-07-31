// Known data sources Ask Velvet can be told to use, and whether they're connected.
// Update "connected" as integrations come online.
export const SOURCES = [
  { key: "ahrefs", label: "Ahrefs", connected: true },
  { key: "tasks", label: "Velvet tasks", connected: true },
  { key: "gsc", label: "Google Search Console", connected: false },
  { key: "ga4", label: "Google Analytics 4", connected: false },
  { key: "google_ads", label: "Google Ads", connected: false },
  { key: "meta_ads", label: "Meta Ads", connected: false },
  { key: "tiktok_ads", label: "TikTok Ads", connected: false },
];
export const sourceLabel = (k) => (SOURCES.find((s) => s.key === k)?.label || k);
export const isConnected = (k) => !!SOURCES.find((s) => s.key === k)?.connected;
