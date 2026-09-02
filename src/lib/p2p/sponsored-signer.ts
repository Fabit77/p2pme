import type { CheckoutSigner } from "@p2pdotme/widgets";
import { baseSepolia } from "viem/chains";

// Never fall back to user-funded gas or an external wallet in the ARS flow.
export function getSponsoredTransactionRequest(tx: Parameters<CheckoutSigner["sendTransaction"]>[0]) {
  const allowed = [process.env.NEXT_PUBLIC_P2P_INTEGRATOR_ADDRESS, process.env.NEXT_PUBLIC_P2P_DIAMOND_ADDRESS]
    .filter(Boolean).map((address) => address!.toLowerCase());
  if (!allowed.includes(tx.to.toLowerCase())) throw new Error("El destino de la operación no está autorizado para este pago.");
  return { to: tx.to, data: tx.data, gasLimit: tx.gasLimit, value: 0n, chainId: baseSepolia.id };
}

export function formatPesoCheckoutError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : "";
  if (/sponsor|paymaster|insufficient funds|gas policy|gas credit/i.test(message)) {
    return "No pudimos cubrir la comisión de red. Fondo debe habilitar el patrocinio de gas en Privy. No necesitas comprar cripto ni enviar dinero.";
  }
  if (/guest/i.test(message)) return "No pudimos crear la sesión de invitado. Revisa que Guest accounts esté habilitado en Privy.";
  if (/origin|app.?id|unauthorized|forbidden/i.test(message)) return "El servicio de pago no autorizó este sitio. Fondo debe revisar el App ID y los dominios permitidos en Privy.";
  return message || "No pudimos preparar el pago en pesos. Intenta nuevamente.";
}
