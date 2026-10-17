import SharedObservationPage from "@/features/gemba/shared-observation-page";

export default async function Page({ params }: { params: Promise<{ observationId: string }> }) {
  const { observationId } = await params;
  return <SharedObservationPage observationId={observationId} />;
}
