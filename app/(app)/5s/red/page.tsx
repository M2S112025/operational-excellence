import { RedTagListPage } from "@/features/five-s/red-tag/red-tag-module";

const STATUS_FILTERS = ["Raised", "In Progress", "Awaiting Review", "Rework Required", "Closed"];

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  return <RedTagListPage initialStatus={status && STATUS_FILTERS.includes(status) ? status : undefined} />;
}
