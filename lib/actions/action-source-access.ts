import type { MyAction, ActionSourceModule } from "@/features/five-s/types/my-actions";
import type { AdminUser } from "@/features/five-s/administration/types";
import type { DemoUser } from "@/lib/current-user";

export type ActionCreationContext = Pick<MyAction, "source" | "plant" | "area"> & Partial<MyAction> & { organizationId?: string };
type SourceAccess = { record?: { plant: string; organizationId?: string }; zone?: string; permitted: boolean; alreadyLinked?: string };
type Check = (input: ActionCreationContext, user: AdminUser, identity: DemoUser) => SourceAccess;
const checks = new Map<ActionSourceModule, Check>();

/** Source stores supply canonical lookups, avoiding a store-to-store import cycle. No entity state is copied. */
export function registerActionCreationSource(module: ActionSourceModule, check: Check) { checks.set(module, check); }
export function getActionCreationSourceAccess(module: ActionSourceModule, input: ActionCreationContext, user: AdminUser, identity: DemoUser) {
  return checks.get(module)?.(input, user, identity);
}
