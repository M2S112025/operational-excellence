import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import type { VisualManagementMeeting } from "@/features/visual-management/types";
const fixture=vi.hoisted(()=>({meeting:undefined as VisualManagementMeeting|undefined}));
vi.mock("@/features/visual-management/visual-management-store",async original=>{const actual=await original<typeof import("@/features/visual-management/visual-management-store")>();return {...actual,useVisualManagementStore:()=>{const state=actual.getVisualManagementState();return fixture.meeting?{...state,meetings:[fixture.meeting]}:state;}};});
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn()}),usePathname:()=>"/visual-management/meetings/VMM-2026-014"}));
vi.mock("@/lib/current-user",async original=>{const actual=await original<typeof import("@/lib/current-user")>();return {...actual,useCurrentUser:()=>actual.DEMO_USERS.leader,getCurrentDemoUser:()=>actual.DEMO_USERS.leader};});
vi.mock("@/features/visual-management/kpi-execution-store",async original=>{const actual=await original<typeof import("@/features/visual-management/kpi-execution-store")>();return {...actual,useKpiExecution:()=>actual.getKpiExecution()};});
vi.mock("@/features/visual-management/kpi-configuration-store",async original=>{const actual=await original<typeof import("@/features/visual-management/kpi-configuration-store")>();return {...actual,useVisualManagementKpis:()=>actual.getVisualManagementKpis()};});
afterEach(()=>{vi.unstubAllGlobals();fixture.meeting=undefined;});
import MeetingDetailPage from "@/features/visual-management/meeting-detail-page";
import { DailyManagementMeetingWorkspace } from "@/features/visual-management/daily-management-meeting-workspace";
import { getVisualManagementMeeting } from "@/features/visual-management/visual-management-store";
import { UiPreferencesProvider } from "@/components/preferences/ui-preferences-provider";
it("renders both assigned Quality metrics so every validated metric can be completed",()=>{
 vi.stubGlobal("window",{localStorage:{getItem:()=>null,setItem:()=>{}}});
 const meeting=getVisualManagementMeeting("VMM-2026-014")!;
 const html=renderToStaticMarkup(React.createElement(UiPreferencesProvider,null,React.createElement(DailyManagementMeetingWorkspace,{meeting})));
 expect(html).toContain("First Pass Yield");expect(html).toContain("Rejection Rate");
 expect((html.match(/aria-label="Actual value/g)??[])).toHaveLength(6);
});

it("uses reviewed metric snapshots instead of conflicting legacy KPI summary",()=>{
 fixture.meeting={...getVisualManagementMeeting("VMM-2026-014")!,status:"Completed",configuredKpiReviews:[{id:"REVIEW",meetingId:"VMM-2026-014",boardId:"VM-ZB-T1",kpiId:"VMK-DM-FPY",kpiNameSnapshot:"Reviewed Yield",kpiLevelSnapshot:"functional",bucketSnapshot:"quality",actualSnapshot:99,targetSnapshot:97,statusSnapshot:"green",reviewedAt:new Date().toISOString(),reviewedByUserId:"USR-RUMESH"}]};
 const html=renderToStaticMarkup(React.createElement(UiPreferencesProvider,null,React.createElement(MeetingDetailPage,{meetingId:fixture.meeting.id})));
 expect(html).toContain("Metrics Reviewed");expect(html).toContain("Reviewed Yield");expect(html).not.toContain("KPI Summary");
});
it("retains legacy KPI summary for historical meetings without configured reviews",()=>{
 fixture.meeting={...getVisualManagementMeeting("VMM-2026-014")!,status:"Completed",configuredKpiReviews:[]};
 const html=renderToStaticMarkup(React.createElement(UiPreferencesProvider,null,React.createElement(MeetingDetailPage,{meetingId:fixture.meeting.id})));
 expect(html).toContain("KPI Summary");expect(html).not.toContain("Metrics Reviewed");
});
