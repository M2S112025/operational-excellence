import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { UiPreferencesProvider } from "@/components/preferences/ui-preferences-provider";
import { getCreateRedTagQrTarget, getRedTagQrTarget, isValidBulkQrQuantity, parseBulkQrQuantity } from "@/features/five-s/red-tag/qr";
import { RedTagCreateQrPrintPage } from "@/features/five-s/red-tag/bulk-create-qr";
import { RedTagCreatePage } from "@/features/five-s/red-tag/red-tag-module";
import { ModuleGate } from "@/components/modules/module-gate";
vi.mock("@/lib/module-entitlements",async original=>{const actual=await original<typeof import("@/lib/module-entitlements")>();return {...actual,useModuleEntitlements:()=>({...actual.getOrganizationAccess(),redTag:identity.entitled})};});
import { setup, input, creator } from "./helpers/red-tag-replacement";
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn()}),usePathname:()=>"/5s/red/overview"}));
const identity=vi.hoisted(()=>({inactive:false,entitled:true}));
vi.mock("@/features/five-s/administration/store",async original=>{const actual=await original<typeof import("@/features/five-s/administration/store")>();return {...actual,useAdminUsers:()=>actual.ADMIN_USER_SEEDS.map(u=>identity.inactive?{...u,status:"Inactive" as const}:u)};});
function render(element:React.ReactElement){return renderToStaticMarkup(React.createElement(UiPreferencesProvider,null,element));}
afterEach(()=>{identity.inactive=false;identity.entitled=true;vi.unstubAllGlobals();vi.resetModules();});
describe("Recovered OPS reusable bulk creation QR",()=>{
 it.each([1,2,100])("accepts original whole quantity %s",quantity=>expect(isValidBulkQrQuantity(quantity)).toBe(true));
 it.each([0,-1,1.5,101,"", "bad",Infinity])("rejects invalid quantity %s",quantity=>{expect(isValidBulkQrQuantity(quantity)).toBe(false);expect(parseBulkQrQuantity(quantity)).toBe(1);});
 it("preserves default print quantity",()=>expect(parseBulkQrQuantity()).toBe(1));
 it("prints requested copies of the original same Plant creation payload, without allocating unique IDs",()=>{const html=render(React.createElement(RedTagCreateQrPrintPage,{plantRef:"PLANT-EGM",quantity:3}));expect(html.match(/<title>Red Tag \/5s\/red\/create\?plant=PLANT-EGM<\/title>/g)).toHaveLength(3);expect(html).toContain("Print 3");expect(html).toContain("Save as PDF");});
 it("renders the full original maximum batch and safe fallback",()=>{expect((render(React.createElement(RedTagCreateQrPrintPage,{quantity:100})).match(/<title>Red Tag/g)??[])).toHaveLength(100);expect((render(React.createElement(RedTagCreateQrPrintPage,{quantity:101})).match(/<title>Red Tag/g)??[])).toHaveLength(1);});
 it("retains exact encoded creation payload and separate record identity",()=>{expect(getCreateRedTagQrTarget("PLANT A/01","https://ops.example")).toBe("https://ops.example/5s/red/create?plant=PLANT%20A%2F01");expect(getCreateRedTagQrTarget()).toBe("/5s/red/create");expect(getRedTagQrTarget("RT-EGM-ZB-001")).toBe("/5s/red/RT-EGM-ZB-001");});
 it("rejects unknown, inactive-context or cross-Plant print references",()=>{expect(render(React.createElement(RedTagCreateQrPrintPage,{plantRef:"UNKNOWN"}))).toContain("Create QR is unavailable");identity.inactive=true;expect(render(React.createElement(RedTagCreateQrPrintPage,{plantRef:"PLANT-EGM"}))).toContain("Create QR is unavailable");});
 it("does not write records, historical storage, Actions or number reservations when rendering batches",async()=>{const {tags,actions,values,localStorage}=await setup();tags.createRedTag(input,creator);actions.getActions();const before=JSON.stringify([...values]);const history=JSON.stringify(tags.getRedTags());localStorage.setItem.mockClear();render(React.createElement(RedTagCreateQrPrintPage,{plantRef:"PLANT-EGM",quantity:3}));expect(JSON.stringify([...values])).toBe(before);expect(JSON.stringify(tags.getRedTags())).toBe(history);expect(localStorage.setItem).not.toHaveBeenCalled();});
 it("scan navigation preserves the current source form and blocks foreign Plant context",()=>{const html=render(React.createElement<{plantRef?:string}>(RedTagCreatePage,{plantRef:"PLANT-EGM"}));for(const label of ["Required Action","Quantity","Take Issue Photo","A live issue photo is required"])expect(html).toContain(label);expect(render(React.createElement<{plantRef?:string}>(RedTagCreatePage,{plantRef:"UNKNOWN"}))).toContain("not available for your current Plant");});
 it("blocks the bulk print component when the Red Tag entitlement is disabled",()=>{identity.entitled=false;const html=render(React.createElement(ModuleGate,{id:"redTag"} as React.ComponentProps<typeof ModuleGate>,React.createElement(RedTagCreateQrPrintPage,{quantity:3})));expect(html).toContain("Module not enabled");expect(html).not.toContain("Scan to create a Red Tag");});
 it("retains authentication/entitlement gate and recovered print URL path",()=>{expect(readFileSync("app/(app)/5s/red/layout.tsx","utf8")).toContain('<ModuleGate id="redTag">');expect(readFileSync("components/auth/auth-gate.tsx","utf8")).toContain("authenticated");expect(readFileSync("app/(app)/5s/red/create-qr/print/page.tsx","utf8")).toContain("parseBulkQrQuantity(quantity)");});
});
