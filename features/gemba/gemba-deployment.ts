import { getAdminUser } from "@/features/five-s/administration/store";
import { getOrganizationPlant, getOrganizationZones } from "@/lib/organization-store";
import type { GembaHorizontalDeploymentRecipient } from "./types";

/** Canonical Plant/Zone/user resolution shared by save, read access and UI. */
export function getDeploymentRecipients(plantName: string, targetZoneIds?: readonly string[]): GembaHorizontalDeploymentRecipient[] {
  const plant = getOrganizationPlant(plantName);
  if (!plant || plant.status !== "Active") return [];
  return getOrganizationZones().filter(zone => zone.status === "Active" && zone.plantId === plant.id && (!targetZoneIds || targetZoneIds.includes(zone.id))).map(zone => {
    const user = getAdminUser(zone.leaderId);
    const eligible = user?.status === "Active" && user.roles.includes("Zone Leader") && (user.plant === plant.name || user.plant === plant.id || user.plant === "All organizations");
    return { zoneId: zone.id, zoneName: zone.name, leaderUserId: eligible ? user.id : undefined, leaderName: eligible ? user.name : undefined, notificationStatus: "unavailable" };
  });
}

export function deploymentObservationHref(observationId: string) {
  return `/gemba/observations/${encodeURIComponent(observationId)}`;
}
