"use client"

import * as React from "react"

import {
  DEFAULT_UI_PREFERENCES,
  UI_PREFERENCES_STORAGE_KEY,
  type AccentColor,
  type AppLanguage,
  type NavigationPosition,
  type UiPreferences,
} from "@/lib/ui-preferences"

interface UiPreferencesContextValue extends UiPreferences {
  setNavigationPosition: (position: NavigationPosition) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarCollapsedTemporarily: (collapsed: boolean | undefined) => void
  setAccentColor: (color: AccentColor) => void
  setLanguage: (language: AppLanguage) => void
}

const UiPreferencesContext = React.createContext<UiPreferencesContextValue | null>(null)

function applyPreferences(preferences: UiPreferences) {
  document.documentElement.dataset.navigation = preferences.navigationPosition
  document.documentElement.dataset.sidebar = preferences.sidebarCollapsed ? "collapsed" : "expanded"
  document.documentElement.dataset.accent = preferences.accentColor
  document.documentElement.lang = preferences.language
  document.documentElement.dataset.language = preferences.language
}

function UiPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = React.useState<UiPreferences>(() => {
    if (typeof document === "undefined") return DEFAULT_UI_PREFERENCES

    const root = document.documentElement
    const navigationPosition = root.dataset.navigation as NavigationPosition | undefined
    const accentColor = root.dataset.accent as AccentColor | undefined
    const language = root.dataset.language as AppLanguage | undefined
    const sidebarCollapsed = root.dataset.sidebar === "collapsed"

    return {
      navigationPosition: navigationPosition ?? DEFAULT_UI_PREFERENCES.navigationPosition,
      sidebarCollapsed,
      accentColor: accentColor ?? DEFAULT_UI_PREFERENCES.accentColor,
      language: language ?? DEFAULT_UI_PREFERENCES.language,
    }
  })

  // Execution focus is an in-memory override; it must never replace the saved preference.
  const [sidebarOverride, setSidebarOverride] = React.useState<boolean | undefined>();
  const sidebarCollapsed = sidebarOverride ?? preferences.sidebarCollapsed;
  React.useEffect(() => {
    applyPreferences({ ...preferences, sidebarCollapsed });
  }, [preferences, sidebarCollapsed]);

  const updatePreferences = React.useCallback((next: UiPreferences) => {
    setPreferences(next)
    applyPreferences({ ...next, sidebarCollapsed: sidebarOverride ?? next.sidebarCollapsed })
    window.localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(next))
  }, [sidebarOverride])

  const value = React.useMemo<UiPreferencesContextValue>(() => ({
    ...preferences,
    sidebarCollapsed,
    setSidebarCollapsedTemporarily: setSidebarOverride,
    setNavigationPosition: (navigationPosition) =>
      updatePreferences({ ...preferences, navigationPosition }),
    setSidebarCollapsed: (collapsed) => {
      if (sidebarOverride !== undefined) setSidebarOverride(collapsed)
      else updatePreferences({ ...preferences, sidebarCollapsed: collapsed })
    },
    setAccentColor: (accentColor) =>
      updatePreferences({ ...preferences, accentColor }),
    setLanguage: (language) =>
      updatePreferences({ ...preferences, language }),
  }), [preferences, sidebarCollapsed, sidebarOverride, updatePreferences])

  return (
    <UiPreferencesContext.Provider value={value}>
      {children}
    </UiPreferencesContext.Provider>
  )
}

function useUiPreferences() {
  const context = React.useContext(UiPreferencesContext)
  if (!context) throw new Error("useUiPreferences must be used within UiPreferencesProvider")
  return context
}

export {
  UiPreferencesProvider,
  useUiPreferences,
}
