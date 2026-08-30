import { z } from "zod";

const amountSchema = z.string().trim().regex(/^\d+(?:[.,]\d{1,6})?$/, "Escribe un monto válido con hasta 6 decimales.");

export const withdrawalInputSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("USDC"),
    amount: amountSchema,
    destinationAddress: z.string().trim().regex(/^0x[0-9a-fA-F]{40}$/, "Escribe una dirección de wallet válida."),
  }),
  z.object({
    method: z.literal("BANK"),
    amount: amountSchema,
    accountHolder: z.string().trim().min(2).max(120),
    holderId: z.string().trim().min(2).max(80),
    bankName: z.string().trim().min(2).max(120),
    accountType: z.string().trim().min(2).max(60),
    accountNumber: z.string().trim().min(3).max(100),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Usa un código de moneda de 3 letras."),
  }),
]);

export type WithdrawalMethod = "USDC" | "BANK";

export function parseUsdcToMicro(input: string) {
  const normalized = input.trim().replace(",", ".");
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
}

export type WithdrawalStatus = "PENDING" | "APPROVED" | "PAID" | "REJECTED" | "CANCELLED";

export const withdrawalStatusLabel: Record<WithdrawalStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  PAID: "Pagado",
  REJECTED: "Rechazado",
  CANCELLED: "Cancelado",
};

export function calculateAvailableUsdc(received: bigint, withdrawals: Array<{ amount: bigint; status: WithdrawalStatus }>) {
  const reserved = withdrawals
    .filter(({ status }) => status === "PENDING" || status === "APPROVED" || status === "PAID")
    .reduce((sum, item) => sum + item.amount, 0n);
  return received > reserved ? received - reserved : 0n;
}
