import { Suspense } from "react";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";
export default async function CheckoutPage({ params }: { params: Promise<{ organizationSlug: string; campaignSlug: string }> }) { const values = await params; return <Suspense><CheckoutFlow {...values} /></Suspense>; }
