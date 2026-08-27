# P2P.me pricing

Campaign prices are stored as integer fiat minor units. For widget input, Fondo converts ARS minor units to six-decimal fiat units without JavaScript floating point. In live mode the official widget reads `getPriceConfig(currency).buyPrice`, backs the protocol fee out of the all-in `fiatChargeAmount`, calculates USDC, and displays the fiat breakdown.

Fondo never hardcodes an ARS/USDC rate. The selected rate, USDC amount, fees, timestamp, and source metadata belong in `payment_sessions.quote_metadata` before order placement. Mock mode returns no synthetic exchange rate and clearly states that it is not a real quote.
