"use client";

import { usePathname } from "next/navigation";
import { OpsTabBar } from "@/components/ops/ops-tabs";
import { getAdminUser } from "@/features/five-s/administration/store";
import { useCurrentUser } from "@/lib/current-user";
import { useRedTags } from "./store";

const RED_TAG_TABS = [
  { id: "red-tag", label: "Red Tags", href: "/5s/red" },
  { id: "awaiting-closure", label: "Awaiting Review", href: "/5s/red/awaiting-closure?queue=all" },
  { id: "closed", label: "Closed", href: "/5s/red/closed?queue=all" },
];

export function RedTagNav() {
  const pathname = usePathname();
  const tags = useRedTags();
  const configured = getAdminUser(useCurrentUser().id);
  // Same visibility rule as the Awaiting Review list so the badge matches what the tab shows.
  const awaitingReview = tags.filter((tag) => configured?.status === "Active" && (configured.plant === tag.plant || configured.plant === "All organizations") && tag.workflowVersion === "5s-v2" && tag.status === "Awaiting Review").length;
  const visible = tags.filter(tag => configured?.status === "Active" && (configured.plant === tag.plant || configured.plant === "All organizations"));
  const tabs = RED_TAG_TABS.map(tab => tab.id === "awaiting-closure" ? {...tab,count:awaitingReview} : tab.id === "red-tag" ? {...tab,count:visible.length} : tab.id === "closed" ? {...tab,count:visible.filter(tag => tag.status === "Closed").length} : tab);
  const active = pathname.startsWith("/5s/red/awaiting-closure") ? "awaiting-closure" : pathname.startsWith("/5s/red/closed") ? "closed" : "red-tag";
  return <OpsTabBar label="Red Tag sections" tabs={tabs} active={active} />;
}
