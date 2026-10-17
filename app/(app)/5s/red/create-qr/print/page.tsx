import { RedTagCreateQrPrintPage } from "@/features/five-s/red-tag/bulk-create-qr";
import { parseBulkQrQuantity } from "@/features/five-s/red-tag/qr";
export default async function Page({ searchParams }: { searchParams: Promise<{ plant?: string; quantity?: string }> }) {
 const { plant, quantity } = await searchParams;
 return <RedTagCreateQrPrintPage plantRef={plant} quantity={parseBulkQrQuantity(quantity)} />;
}
