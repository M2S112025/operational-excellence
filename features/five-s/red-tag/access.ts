import { getAdminUser } from "@/features/five-s/administration/store";
import { getFiveSZoneConfiguration } from "@/lib/five-s/configuration";
import type { AdminUser } from "@/features/five-s/administration/types";
import type { RedTag } from "./types";
export function canCreateRedTag(user: AdminUser | undefined) { return user?.status === "Active"; }
export function canManageRedTag(user: AdminUser | undefined, tag: Pick<RedTag, "plant" | "zone"> & Partial<Pick<RedTag, "workflowVersion" | "historical">>) {
 const configured = user && getAdminUser(user.id);
 return Boolean(user?.status === "Active" && tag.workflowVersion === "5s-v2" && !tag.historical && configured?.status === "Active" && configured.roles.includes("Zone Leader") && configured.plant === tag.plant && getFiveSZoneConfiguration(tag.zone)?.leaderId === configured.id);
}
