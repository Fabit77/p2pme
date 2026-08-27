import { ReceiptView } from "@/components/checkout/receipt-view";
export default async function ReceiptPage({ params }: { params: Promise<{ paymentId: string }> }) { const { paymentId } = await params; return <ReceiptView id={paymentId} />; }
