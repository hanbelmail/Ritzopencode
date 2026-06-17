"use client"

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MIGRATION_KEY, readLegacyStore } from "@/lib/store";

export default function StoreMigrator() {
  const importTickets = useMutation(api.tickets.importLegacy);
  const saveSettings = useMutation(api.settings.save);

  useEffect(() => {
    let cancelled = false;

    async function migrate() {
      if (typeof window === "undefined" || localStorage.getItem(MIGRATION_KEY)) return;

      const { tickets, settings } = readLegacyStore();
      if (!tickets.length && !settings) {
        localStorage.setItem(MIGRATION_KEY, "empty");
        return;
      }

      if (tickets.length) {
        await importTickets({ tickets });
      }
      if (settings) {
        await saveSettings({ settings });
      }

      if (!cancelled) {
        localStorage.setItem(MIGRATION_KEY, new Date().toISOString());
      }
    }

    migrate().catch((error) => {
      console.error("Convex store migration failed", error);
    });

    return () => {
      cancelled = true;
    };
  }, [importTickets, saveSettings]);

  return null;
}
