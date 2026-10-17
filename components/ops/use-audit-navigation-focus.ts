"use client";
import { useEffect, useRef } from "react";
import { useUiPreferences } from "@/components/preferences/ui-preferences-provider";

/** One temporary entry collapse; manual changes stay until exit restores the saved preference. */
export function useAuditNavigationFocus(enabled: boolean) {
  const preferences = useUiPreferences();
  const setter = useRef(preferences.setSidebarCollapsedTemporarily);
  useEffect(() => { setter.current = preferences.setSidebarCollapsedTemporarily; }, [preferences.setSidebarCollapsedTemporarily]);
  useEffect(() => {
    if (!enabled) return;
    setter.current(true);
    return () => setter.current(undefined);
    // Only execution entry/exit controls focus. Manual navigation changes must not retrigger it.
  }, [enabled]);
  return preferences;
}
