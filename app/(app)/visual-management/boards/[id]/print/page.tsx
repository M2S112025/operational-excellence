import VisualManagementPrintPage from "@/features/visual-management/print/visual-management-print-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VisualManagementPrintPage boardId={id} />;
}
