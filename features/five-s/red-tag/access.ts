import { hasPermission } from "@/features/five-s/administration/permissions";
import type { AdminUser } from "@/features/five-s/administration/types";
import { getAdminUser, getAdminUsers } from "@/features/five-s/administration/store";
import { getCurrentDemoUser } from "@/lib/current-user";
import { getOrganizationAccess } from "@/lib/module-entitlements";
import { getOrganizationPlant, getOrganizationZone, getOrganizationZones } from "@/lib/organization-store";
import { RED_TAG_SECTIONS, type RedTag } from "./types";

export function canCreateRedTag(user: AdminUser | undefined) {
  return user?.status === "Active" && (hasPermission(user, "red_tag.create") || user.roles.some(role => ["Admin", "Auditor", "Zone Leader"].includes(role)));
}

/** Demo-session boundary only. A production backend must enforce the same scope. */
export function getRedTagSessionActor(expectedId?: string) {
  const identity = getCurrentDemoUser();
  if (expectedId !== undefined && expectedId !== identity.id) return undefined;
  const actor = getAdminUser(identity.id);
  return actor?.status === "Active" ? actor : undefined;
}

export function canAccessRedTagZone(user: AdminUser | undefined, plantName: string, zoneName: string) {
  const plant = getOrganizationPlant(plantName);
  const zone = getOrganizationZone(zoneName);
  return Boolean(user?.status === "Active" && plant?.status === "Active" && zone?.status === "Active" && zone.plantId === plant.id
    && (user.plant === plant.name || user.plant === "All organizations")
    && (user.roles.includes("Admin") || user.zoneMemberships.some(membership => membership.zone === zone.name)));
}

export function canCreateRedTagInZone(user: AdminUser | undefined, plant: string, zone: string) {
  return canCreateRedTag(user) && getOrganizationAccess().redTag && canAccessRedTagZone(user, plant, zone);
}

/** Existing Red Tag department choices plus departments configured in the active plant. */
export function getRedTagDepartments(plantName: string) {
  const plant = getOrganizationPlant(plantName);
  if (!plant || plant.status !== "Active") return [];
  return [...new Set([...RED_TAG_SECTIONS, ...getOrganizationZones().filter(zone => zone.status === "Active" && zone.plantId === plant.id).map(zone => zone.department.trim()).filter(Boolean)])];
}

export function getRedTagZoneLeader(plantName: string, zoneName: string) {
  const plant = getOrganizationPlant(plantName);
  const zone = getOrganizationZone(zoneName);
  if (!plant || plant.status !== "Active" || !zone || zone.status !== "Active" || zone.plantId !== plant.id || !zone.leaderId) return undefined;
  const leaders = getAdminUsers().filter(user => user.status === "Active" && user.plant === plant.name && user.roles.includes("Zone Leader")
    && user.zoneMemberships.some(membership => membership.zone === zone.name && membership.responsibility === "Leader"));
  return leaders.length === 1 && leaders[0].id === zone.leaderId ? leaders[0] : undefined;
}

export function canReviewRedTag(tag: RedTag, user: AdminUser | undefined) {
  const leader = getRedTagZoneLeader(tag.plant, tag.zone);
  return Boolean(user?.status === "Active" && leader?.id === user.id && tag.review?.reviewerId === user.id
    && (hasPermission(user, "red_tag.manage") || hasPermission(user, "actions.review")));
}

export function canLinkRedTagAction(tag: RedTag, user: AdminUser | undefined) {
  return tag.status !== "Closed" && tag.decisionRecord?.type !== "keep" && canAccessRedTagZone(user, tag.plant, tag.zone)
    && Boolean(user && (tag.createdById === user.id || hasPermission(user, "red_tag.manage") || user.roles.includes("Admin")));
}

export function canManageRedTag(tag: RedTag, user: AdminUser | undefined) {
  return canAccessRedTagZone(user, tag.plant, tag.zone) && (hasPermission(user, "red_tag.manage") || hasPermission(user, "actions.review"));
}
