export type FiatCurrency = "ARS" | "BRL" | "MXN" | "COP";

export function formatFiat(minorUnits: bigint | number, currency: FiatCurrency = "ARS") {
  const value = typeof minorUnits === "bigint" ? Number(minorUnits) : minorUnits;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export function parseFiatAmount(input: string) {
  const normalized = input.replace(/[^\d,.-]/g, "").replace(".", "").replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) throw new Error("Monto inválido");
  return BigInt(Math.round(value * 100));
}

export function formatUsdc(microUsdc: bigint | number) {
  const value = typeof microUsdc === "bigint" ? microUsdc : BigInt(microUsdc);
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""} USDC`;
}

export function fiatToP2PUnits(minorUnits: bigint) {
  return minorUnits * 10_000n;
}
