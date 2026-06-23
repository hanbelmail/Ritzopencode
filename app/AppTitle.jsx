"use client";

import { useEffect } from "react";
import { DEFAULT_SETTINGS, useSettings } from "@/lib/store";

export default function AppTitle() {
  const settings = useSettings();
  const title = settings?.appName || DEFAULT_SETTINGS.appName;

  useEffect(() => {
    document.title = title;
  }, [title]);

  return null;
}
