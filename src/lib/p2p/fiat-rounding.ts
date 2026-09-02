const SCALE = 1_000_000n;
const CENT = 10_000n;

// Reservations are in cents; chain amounts have six decimal places. Accept
// only downward dust that still rounds to the exact reserved cent amount.
export function matchesReservedFiat(actual: bigint, expected: bigint) {
  return expected > 0n && expected % CENT === 0n && actual > 0n &&
    actual <= expected && expected - actual < CENT / 2n;
}

export function roundCheckoutUsdcDown(input: {
  quotedUsdc: bigint;
  fiatLimit: bigint;
  buyPrice: bigint;
  threshold: bigint;
  fixedFee: bigint;
}) {
  const { quotedUsdc, fiatLimit, buyPrice, threshold, fixedFee } = input;
  if (quotedUsdc <= 0n || buyPrice <= 0n || threshold < 0n || fixedFee < 0n) {
    throw new Error("La cotización de P2P.me no es válida.");
  }
  const grossFiat = (amount: bigint) => {
    const fee = amount <= threshold ? fixedFee : 0n;
    return amount * buyPrice / SCALE + fee * buyPrice / SCALE;
  };
  // The widget rounds to the nearest USDC micro-unit. Correct at most one
  // micro-unit, never increase the fiat limit or silently absorb price changes.
  for (const amount of [quotedUsdc, quotedUsdc - 1n]) {
    if (amount > 0n && matchesReservedFiat(grossFiat(amount), fiatLimit)) return amount;
  }
  throw new Error("La cotización cambió. Recarga el pago para actualizarla; no se ha aumentado el monto en pesos.");
}
