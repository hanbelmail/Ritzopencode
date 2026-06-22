"use client";

const DASHBOARD_TABLE_COLUMNS_KEY = "ritz_dashboard_table_columns";

export function readDashboardTableColumns(defaultColumns) {
  if (typeof window === "undefined") return defaultColumns;

  try {
    const raw = window.localStorage.getItem(DASHBOARD_TABLE_COLUMNS_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(saved)) return defaultColumns;

    const allowed = new Set(defaultColumns);
    const valid = saved.filter((key) => allowed.has(key));
    return valid.length > 0 ? valid : defaultColumns;
  } catch {
    return defaultColumns;
  }
}

export function saveDashboardTableColumns(columns) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(DASHBOARD_TABLE_COLUMNS_KEY, JSON.stringify(columns));
  } catch {
    // Ignore unavailable storage so table controls keep working in-memory.
  }
}
