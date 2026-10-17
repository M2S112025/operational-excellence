import { ModuleGate } from "@/components/modules/module-gate";
import FiveSActionDetailPage from "@/features/five-s/action-detail-page";

export default async function Page({ params, searchParams }: { params: Promise<{ actionId: string }>; searchParams: Promise<{ mode?: string; section?: string; returnRedTag?: string; returnTo?: string }> }) {
  const { actionId } = await params;
  const query = await searchParams;
  return <ModuleGate id="actions"><FiveSActionDetailPage actionId={actionId} returnRedTagId={query.returnRedTag} returnTo={query.returnTo} initialSection={query.mode === "review" ? "review" : query.section} /></ModuleGate>;
}
