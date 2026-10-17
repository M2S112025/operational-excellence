import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const harness=vi.hoisted(()=>({slots:[] as unknown[],index:0,writes:[] as unknown[]}));
vi.mock("react",async original=>({...await original<typeof import("react")>(),useState:(initial:unknown)=>{const slot=harness.index++;if(!(slot in harness.slots))harness.slots[slot]=typeof initial==="function"?(initial as ()=>unknown)():initial;return [harness.slots[slot],(next:unknown)=>{harness.slots[slot]=next;}];},useCallback:(callback:unknown)=>callback,useMemo:(factory:()=>unknown)=>factory(),useEffect:()=>{}}));
import {UiPreferencesProvider as exerciseProvider} from "@/components/preferences/ui-preferences-provider";
interface Controls {sidebarCollapsed:boolean;setSidebarCollapsed:(value:boolean)=>void;setSidebarCollapsedTemporarily:(value:boolean|undefined)=>void;setLanguage:(value:"en"|"ta")=>void}
function render(){harness.index=0;return (exerciseProvider({children:null}) as React.ReactElement<{value:Controls}>).props.value;}
beforeEach(()=>{harness.slots=[];harness.writes=[];vi.stubGlobal("document",{documentElement:{dataset:{sidebar:"expanded"},lang:"en"}});vi.stubGlobal("window",{localStorage:{setItem:(_key:string,value:string)=>harness.writes.push(JSON.parse(value))}});});
describe("Audit focus never persists temporary navigation",()=>{
 it("keeps automatic and manual execution toggles out of saved preferences",()=>{render().setSidebarCollapsedTemporarily(true);expect(render().sidebarCollapsed).toBe(true);render().setSidebarCollapsed(false);expect(render().sidebarCollapsed).toBe(false);render().setSidebarCollapsed(true);expect(render().sidebarCollapsed).toBe(true);expect(harness.writes).toEqual([]);render().setSidebarCollapsedTemporarily(undefined);expect(render().sidebarCollapsed).toBe(false);});
 it("persists ordinary preference changes without leaking the focus override",()=>{render().setSidebarCollapsedTemporarily(true);render().setLanguage("ta");expect(harness.writes).toEqual([expect.objectContaining({language:"ta",sidebarCollapsed:false})]);expect(render().sidebarCollapsed).toBe(true);render().setSidebarCollapsedTemporarily(undefined);expect(render().sidebarCollapsed).toBe(false);render().setSidebarCollapsed(true);expect(harness.writes.at(-1)).toMatchObject({sidebarCollapsed:true,language:"ta"});});
});
