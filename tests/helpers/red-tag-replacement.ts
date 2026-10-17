import { vi } from "vitest";
import { DEMO_USERS } from "@/lib/current-user";
export const creator = DEMO_USERS.auditor;
export const leader = DEMO_USERS.leader;
export const member = DEMO_USERS.responsible;
export const input = { plant: "Egmore Plant", zone: "Zone B", section: "Production", itemName: "Unused fixture", quantity: 1, reason: "Undefined Items" as const, remarks: "Original finding", requiredAction: "Remove fixture", imageUrl: "data:image/jpeg;base64,before" };
export const plan = { actionPlan: "Remove fixture safely", memberId: member.id, dueDate: "2030-10-25", priority: "High" as const };
export async function setup(initial: Record<string,string> = {}) {
 vi.resetModules(); const values = new Map(Object.entries(initial));
 const localStorage = { getItem: (key:string) => values.get(key) ?? null, setItem: vi.fn((key:string,value:string) => {values.set(key,value);}), removeItem:(key:string) => values.delete(key), clear:()=>values.clear(), key:(index:number)=>[...values.keys()][index]??null, get length(){return values.size;} };
 vi.stubGlobal("window", { localStorage }); vi.stubGlobal("localStorage", localStorage);
 const tags = await import("@/features/five-s/red-tag/store"); const actions = await import("@/lib/actions/action-store");
 return { tags, actions, values, localStorage };
}
export async function assigned() {
 const ctx = await setup(); const tag = ctx.tags.createRedTag(input,creator)!;
 const planned = ctx.tags.assignRedTagAction(tag.id,leader,plan)!;
 return {...ctx, tag:planned};
}
export async function submitted() {
 const ctx = await assigned(); ctx.tags.saveRedTagClosureEvidence(ctx.tag.id,member,"data:image/jpeg;base64,after");
 // These are genuine owner entries through the existing authorized Action editor, not adapter defaults.
 ctx.actions.updateAction(ctx.tag.actionId!,{correctiveActionCategory:"Communication",costSaving:0},member);
 ctx.tags.submitRedTagForReview(ctx.tag.id,member,"Fixture removed and area cleaned");
 return ctx;
}
