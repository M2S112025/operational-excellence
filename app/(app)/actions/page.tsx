import FiveSActionsPage from "@/features/five-s/actions-page";
import { ModuleGate } from "@/components/modules/module-gate";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string; source?: string; plant?: string; zone?: string }> }) {
  const filters = await searchParams;
  return <ModuleGate id="actions"><FiveSActionsPage key={JSON.stringify(filters)} initialPlant={filters.plant} initialZone={filters.zone} initialTab={filters.tab} initialStatus={filters.status} initialSource={filters.source} /></ModuleGate>;
}
