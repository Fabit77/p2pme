import { ReceiptView } from "@/components/checkout/receipt-view";
import { LiveReceiptView } from "@/components/checkout/live-receipt-view";
export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ paymentId: string }>; searchParams: Promise<{ token?: string | string[] }> }) { const [{ paymentId }, query] = await Promise.all([params, searchParams]); const token = Array.isArray(query.token) ? query.token[0] : query.token; return token ? <LiveReceiptView id={paymentId} token={token} /> : <ReceiptView id={paymentId} />; }
