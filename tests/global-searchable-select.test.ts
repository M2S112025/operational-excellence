import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
const controls = vi.hoisted(() => ({ query: "", selected: "", change: undefined as undefined | ((value: string | null) => void), filtered: [] as string[], stateIndex: 0 }));
function stateSlot(initial: unknown) { return controls.stateIndex++ === 0 ? initial : controls.query; }
vi.mock("react", async original => ({ ...await original<typeof import("react")>(), useState: (initial: unknown) => [stateSlot(initial), () => {}] }));
vi.mock("@base-ui/react/combobox", () => {
 const wrapper = ({children}: {children: React.ReactNode}) => React.createElement("div", null, children);
 return { Combobox: { Root: ({children,value,onValueChange,filteredItems,name,required}: {children:React.ReactNode;value:string;onValueChange:(value:string|null)=>void;filteredItems:string[];name?:string;required?:boolean}) => {controls.selected=value;controls.change=onValueChange;controls.filtered=filteredItems;return React.createElement("div", null, React.createElement("input",{type:"hidden",name,value:value??"",required,readOnly:true}),children);},Trigger:({children,...props}:React.ComponentProps<"button">)=>React.createElement("button",props,children),Input: (props:React.ComponentProps<"input">)=>React.createElement("input",props),Portal:wrapper,Positioner:wrapper,Popup:wrapper,List:wrapper,ItemIndicator:wrapper,Item:({children,disabled}:React.ComponentProps<"button">)=>React.createElement("button",{disabled},children) } };
});
import { OpsSearchableSelect, filterSelectOptions, searchableSelectPolicy } from "@/components/ops/ops-searchable-select";
const options=[{value:"ONE",label:"Alex",description:"Zone A · E001"},{value:"TWO",label:"Alex",description:"Zone A · E002"},{value:"OFF",label:"Inactive",disabled:true}];
const render=(props={})=>{controls.stateIndex=0;return renderToStaticMarkup(React.createElement(OpsSearchableSelect,{options,value:"ONE",label:"Action Owner",onValueChange:()=>{},...props}));};
beforeEach(()=>{controls.query="";controls.change=undefined;});
describe("Global in-popup searchable selection",()=>{
 it("matches labels and permitted secondary identifiers case-insensitively",()=>{expect(filterSelectOptions(options,"  e002 ").map(o=>o.value)).toEqual(["TWO"]);expect(filterSelectOptions(options,"aLeX")).toHaveLength(2);});
 it("never adds unauthorized options to search results",()=>{expect(filterSelectOptions(options,"Zone B")).toEqual([]);});
 it("retains distinct IDs for duplicate names",()=>{const change=vi.fn();render({onValueChange:change});controls.change!("TWO");expect(change).toHaveBeenCalledWith("TWO");});
 it("keeps selection while filtering it out",()=>{controls.query="E002";expect(render()).toContain("Alex");expect(controls.selected).toBe("ONE");expect(controls.filtered).toEqual(["TWO"]);});
 it("shows an empty result without silently clearing the saved ID",()=>{controls.query="missing";expect(render()).toContain("No matching results");expect(controls.selected).toBe("ONE");});
 it("rejects disabled and unknown IDs",()=>{const change=vi.fn();render({onValueChange:change});controls.change!("OFF");controls.change!("OUTSIDE");expect(change).not.toHaveBeenCalled();});
 it("supports an uncontrolled default without assigning a different option",()=>{render({value:undefined,defaultValue:"TWO"});expect(controls.selected).toBe("TWO");});
 it("preserves unavailable historical selection honestly",()=>{expect(render({value:"OLD",displayValue:"Old display name"})).toContain("Unavailable / inactive (OLD)");expect(controls.selected).toBe("OLD");});
 it("disables both input and trigger during loading/saving",()=>{const change=vi.fn();expect(render({disabled:true,onValueChange:change})).toContain('disabled=""');controls.change!("TWO");expect(change).not.toHaveBeenCalled();expect(render({loading:true,onValueChange:change})).toContain('disabled=""');controls.change!("TWO");expect(change).not.toHaveBeenCalled();});
 it("allows an explicit clear only for optional fields",()=>{expect(render({clearable:true})).toContain("Clear selection");expect(render({clearable:true,required:true})).not.toContain("Clear selection");expect(render()).not.toContain("Clear selection");});
 it("preserves form IDs, required validation, accessible error and helper relationships",()=>{const html=render({name:"ownerId",required:true,error:"Choose an eligible owner",describedBy:"context"});expect(html).toContain('name="ownerId"');expect(html).toContain('value="ONE"');expect(html).toContain('required=""');expect(html).toContain('aria-invalid="true"');expect(html).toContain('role="alert"');expect(html).toContain('aria-describedby="context ');});
 it("places search inside the portalled popup and delegates keyboard behavior to Base UI",()=>{const source=readFileSync("components/ops/ops-searchable-select.tsx","utf8");expect(source.indexOf("<Combobox.Popup")).toBeLessThan(source.indexOf("<Combobox.Input"));expect(source).toContain("initialFocus={inputRef}");expect(source).toContain("autoHighlight");expect(source).toContain("filteredItems={matches.map");expect(source).not.toContain("onKeyDown=");});
 it.each(["Plant","Zone","Department","Employee","Action Owner","Auditor","Reviewer","Team Member","Board","Organization","Checklist","Source record","Red Tag record","KPI","KPI Metric","Proposer","Section","Generated By"])("searches dynamic %s lists even when short",label=>{expect(searchableSelectPolicy(label,2)).toBe(true);});
 it("keeps short static choices simple and makes lists of eight searchable",()=>{expect(searchableSelectPolicy("Status",3)).toBe(false);expect(searchableSelectPolicy("Priority",4)).toBe(false);expect(searchableSelectPolicy("Zone Responsibility",3)).toBe(false);expect(searchableSelectPolicy("Metric Type",2)).toBe(false);expect(searchableSelectPolicy("Category",8)).toBe(true);});
});
