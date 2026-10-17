import { beforeEach, describe, expect, it, vi } from "vitest";
const state=vi.hoisted(()=>({collapsed:false,normal:false,calls:[] as (boolean | undefined)[],refs:[] as {current:unknown}[],effects:[] as {deps?:unknown[];cleanup?:()=>void}[],pending:[] as (()=>void)[],refIndex:0,effectIndex:0}));
vi.mock("react",()=>({useRef:(value:unknown)=>state.refs[state.refIndex++]??(state.refs[state.refIndex-1]={current:value}),useEffect:(effect:()=>void|(()=>void),deps?:unknown[])=>{const index=state.effectIndex++;const previous=state.effects[index];if(previous&&deps?.every((value,i)=>Object.is(value,previous.deps?.[i])))return;state.pending.push(()=>{previous?.cleanup?.();state.effects[index]={deps,cleanup:effect()||undefined};});}}));
vi.mock("@/components/preferences/ui-preferences-provider",()=>({useUiPreferences:()=>({sidebarCollapsed:state.collapsed,setSidebarCollapsedTemporarily:(next:boolean|undefined)=>{state.collapsed=next??state.normal;state.calls.push(next);}})}));
import {useAuditNavigationFocus as exerciseFocusHook} from "@/components/ops/use-audit-navigation-focus";
function render(enabled=true){if(!state.effects.length)state.normal=state.collapsed;state.refIndex=0;state.effectIndex=0;exerciseFocusHook(enabled);state.pending.splice(0).forEach(effect=>effect());}
function exit(){state.effects.forEach(effect=>effect.cleanup?.());}
beforeEach(()=>{state.collapsed=false;state.calls=[];state.refs=[];state.effects=[];state.pending=[];});
describe("Audit execution navigation session",()=>{
 it("collapses on entry and restores expanded navigation on exit",()=>{render();expect(state.collapsed).toBe(true);exit();expect(state.collapsed).toBe(false);});
 it("respects manual expansion and does not repeatedly force collapse",()=>{render();state.collapsed=false;render();render();expect(state.collapsed).toBe(false);expect(state.calls).toEqual([true]);});
 it("restores an initially collapsed preference after manual expansion",()=>{state.collapsed=true;render();state.collapsed=false;render();exit();expect(state.collapsed).toBe(true);});
 it("does nothing outside active execution",()=>{render(false);expect(state.calls).toEqual([]);exit();expect(state.calls).toEqual([]);});
 it("restores navigation on execution exit without mutating checklist drafts",()=>{const draft={answer:"Yes",score:4,evidence:["PHOTO"],actionId:"ACT-1"};const saved=structuredClone(draft);render();state.collapsed=false;render();render(false);expect(state.collapsed).toBe(false);expect(draft).toEqual(saved);});
});
