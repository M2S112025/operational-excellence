"use client";

import { useSyncExternalStore } from "react";
import { safeSetStorage, safeSetStorageString } from "@/lib/browser-storage";

export interface AppNotification {
  id: string;
  recipientUserId: string;
  title: string;
  message: string;
  href: string;
  createdAt: string;
  read: boolean;
  deduplicationKey?: string;
  context?: { sourceModule: "gemba"; observationId: string; actorId: string; zoneIds: string[] };
}

const STORAGE_KEY = "standalone-5s-notifications";
const FIXTURE_VERSION_KEY = "standalone-5s-notification-fixture-version";
const FIXTURE_VERSION = "canonical-cross-zone-v1";
const CANONICAL_NOTIFICATIONS: AppNotification[] = [
  { id: "NOT-ACT-ZB-001-ASSIGN", recipientUserId: "USR-RUMESH", title: "New Action Requires Assignment", message: "Clear unused material from the production aisle · Raised by: Lakshman · Audit: 5S-EGM-ZB-001 · Zone: Zone B · Priority: High", href: "/5s/actions/ACT-ZB-001", createdAt: "2026-08-25T09:30:00.000Z", read: false },
  {
    id: "NOT-ACT-ZA-001-ASSIGNED",
    recipientUserId: "USR-SIVA",
    title: "New action assigned",
    message: "Clear unused material from the production aisle · Assigned by: Lakshman · Audit: 5S-EGM-ZA-006 · Zone: Zone A · Priority: High · Due: 2026-08-26",
    href: "/5s/actions/ACT-ZA-001",
    createdAt: "2026-08-25T09:30:00.000Z",
    read: false,
  },
];
let notifications: AppNotification[] = [...CANONICAL_NOTIFICATIONS];
let loaded = false;
const listeners = new Set<() => void>();
const EMPTY_NOTIFICATIONS: AppNotification[] = [];

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    notifications = Array.isArray(parsed) ? parsed : [];
    if (window.localStorage.getItem(FIXTURE_VERSION_KEY) !== FIXTURE_VERSION) {
      const fixtureIds = new Set(CANONICAL_NOTIFICATIONS.map((item) => item.id));
      notifications = [...CANONICAL_NOTIFICATIONS, ...notifications.filter((item) => !fixtureIds.has(item.id))];
      safeSetStorageString(FIXTURE_VERSION_KEY, FIXTURE_VERSION);
      safeSetStorage(STORAGE_KEY, notifications);
    }
  } catch {
    notifications = [];
  }
}

function emit() {
  if (typeof window !== "undefined") {
    try {
      safeSetStorage(STORAGE_KEY, notifications);
    } catch (error) {
      console.error("Failed to save notifications:", error);
    }
  }
  listeners.forEach((listener) => listener());
}

export function createNotification(input: Omit<AppNotification, "id" | "createdAt" | "read">) {
  load();
  const notification: AppNotification = {
    ...input,
    id: `NOT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    read: false,
  };
  notifications = [notification, ...notifications];
  emit();
  return notification;
}

export function markNotificationRead(id: string) {
  load();
  notifications = notifications.map((item) => item.id === id ? { ...item, read: true } : item);
  emit();
}

export function useNotifications(recipientUserId: string) {
  load();
  const snapshot = useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => notifications,
    () => EMPTY_NOTIFICATIONS
  );
  return snapshot.filter((item) => item.recipientUserId === recipientUserId);
}

/** Publish only after durable local persistence; retries reuse the same personal notification. */
export function tryCreateNotification(input: Omit<AppNotification, "id" | "createdAt" | "read"> & { deduplicationKey: string }) {
  load();
  const existing = notifications.find(item => item.deduplicationKey === input.deduplicationKey && item.recipientUserId === input.recipientUserId);
  if (existing) return { success: true as const, notification: existing };
  const notification: AppNotification = { ...input, id: `NOT-${crypto.randomUUID()}`, createdAt: new Date().toISOString(), read: false };
  const next = [notification, ...notifications];
  const result = safeSetStorage(STORAGE_KEY, next);
  if (!result.success) return result;
  notifications = next;
  listeners.forEach(listener => listener());
  return { success: true as const, notification };
}
