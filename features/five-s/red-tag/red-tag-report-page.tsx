"use client";
import { useRedTags } from "./store";
import { useCurrentUser } from "@/lib/current-user";
import { getAdminUser } from "@/features/five-s/administration/store";
import { HistoricalRedTagView } from "./historical-view";
import { RedTagPrintPage } from "./red-tag-module";
export function RedTagReportPage({ tagId }: { tagId: string }) {
 const tag = useRedTags().find(item => item.id === tagId);
 const actor = getAdminUser(useCurrentUser().id);
 if (!tag || actor?.status !== "Active" || (actor.plant !== tag.plant && actor.plant !== "All organizations")) return <p>Record unavailable.</p>;
 return tag.workflowVersion !== "5s-v2" ? <HistoricalRedTagView tag={tag} print /> : <RedTagPrintPage tagId={tagId} />;
}
