import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { OpsEmptyState } from "@/components/ops/ops-empty-state";
export default function Page() { return <PageContainer><OpsEmptyState title="Legacy Red Flag destination unavailable" description="These historical references are preserved. Red Flag records are separate from Red Tags; this link does not open or change a Red Tag. Historical viewing and dashboard treatment require a product decision." action={<Link className="text-primary underline" href="/actions">Back to Actions</Link>} /></PageContainer>; }
