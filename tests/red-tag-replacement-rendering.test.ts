import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RedTag } from "@/features/five-s/red-tag/types";
const fixtures=vi.hoisted(()=>({tags:[] as RedTag[],actor:"USR-LAKSHMAN"}));
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn()}),usePathname:()=>"/5s/red"}));
vi.mock("@/features/five-s/red-tag/store",async original=>({...await original<typeof import("@/features/five-s/red-tag/store")>(),useRedTags:()=>fixtures.tags}));
vi.mock("@/lib/current-user",async original=>{const actual=await original<typeof import("@/lib/current-user")>();return {...actual,useCurrentUser:()=>Object.values(actual.DEMO_USERS).find(u=>u.id===fixtures.actor)!};});
import { UiPreferencesProvider } from "@/components/preferences/ui-preferences-provider";
import { RedTagListPage, RedTagCreatePage, RedTagDetailPage } from "@/features/five-s/red-tag/red-tag-module";
import { setup, assigned, creator, leader, member, input } from "./helpers/red-tag-replacement";
function render(element:React.ReactElement){return renderToStaticMarkup(React.createElement(UiPreferencesProvider,null,element));}
afterEach(()=>{vi.unstubAllGlobals();fixtures.tags=[];fixtures.actor=creator.id;});
describe("Source replacement rendered interfaces without browser automation",()=>{
 it("renders truthful historical status on mobile and desktop lists",async()=>{const {tags}=await setup();fixtures.tags=tags.getRedTags();const html=render(React.createElement(RedTagListPage));expect(html).toContain("RT-EGM-ZA-001");expect(html).toContain(">Open<");expect(html).not.toContain(">Raised</span>");});
 it("renders source creation fields and live-photo requirement",async()=>{await setup();const html=render(React.createElement(RedTagCreatePage));for(const value of ["Quantity","Required Action","Undefined Items","Take Issue Photo","A live issue photo is required"])expect(html).toContain(value);expect(html).not.toContain("Estimated Value");expect(html).not.toContain("Keep / Retain");});
 it("renders only Zone Leader planning for Raised source tags",async()=>{const {tags}=await setup();const tag=tags.createRedTag(input,creator)!;fixtures.tags=tags.getRedTags();fixtures.actor=leader.id;const html=render(React.createElement(RedTagDetailPage,{tagId:tag.id}));expect(html).toContain("Responsible Zone Member");expect(html).toContain("Assign Action");expect(html).not.toContain("Submit for Review");});
 it("renders member execution and canonical Action navigation after assignment",async()=>{const {tags,tag}=await assigned();fixtures.tags=tags.getRedTags();fixtures.actor=member.id;const html=render(React.createElement(RedTagDetailPage,{tagId:tag.id}));expect(html).toContain("Closure Evidence");expect(html).toContain(tag.actionId!);expect(html).toContain("View canonical Action");expect(html).not.toContain("Approve &amp; Close");});
});
