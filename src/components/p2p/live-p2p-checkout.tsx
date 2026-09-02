"use client";
import { createLocalStorageRelayStore, createRelayIdentity } from "@p2pdotme/sdk/orders";
import { DIAMOND_ABI, readSmallOrderFixedFee, type CheckoutSigner, type CurrencyOption } from "@p2pdotme/widgets";
import { Checkout, type PlaceOrderContext, type PlaceOrderResult } from "@p2pdotme/widgets/checkout";
import { createPublicClient, encodeFunctionData, http, stringToHex } from "viem";
import { baseSepolia } from "viem/chains";
import { getP2PLiveConfig } from "@/lib/p2p/config";
import { INTEGRATOR_ABI } from "@/lib/p2p/integrator-abi";
import { findIntegratorPlacement } from "@/lib/p2p/placement-evidence";
import { roundCheckoutUsdcDown } from "@/lib/p2p/fiat-rounding";

const currencies: CurrencyOption[] = [{ symbol: "ARS", flag: "🇦🇷", paymentMethod: "Transferencia bancaria", symbolNative: "$", country: "Argentina" }];

export function LiveP2PCheckout({ signer, fiatAmountMinor, productName, persistOrder, onOrderPlaced, onComplete, onError }: { signer: CheckoutSigner; fiatAmountMinor: bigint; productName: string; persistOrder: (orderId: string, txHash: string, payerWalletAddress: string) => Promise<void>; onOrderPlaced: (orderId: string, txHash: string) => void; onComplete: (orderId: string) => void; onError: (error: Error) => void }) {
  const config = getP2PLiveConfig(); const publicClient = createPublicClient({ chain: baseSepolia, transport: http(config.NEXT_PUBLIC_P2P_RPC_URL) });
  const placeOrder = async (ctx: PlaceOrderContext): Promise<PlaceOrderResult> => {
    if (!ctx.currency || ctx.currency.circleId === undefined) throw new Error("P2P.me no encontró un círculo ARS elegible.");
    if (!ctx.usdcAmount || ctx.usdcAmount <= 0n) throw new Error("P2P.me no pudo calcular el monto en USDC.");
    const fiatLimit = fiatAmountMinor * 10_000n;
    if (ctx.currency.symbol !== "ARS" || ctx.fiatAmount !== fiatLimit) throw new Error("La cotización no coincide con el monto reservado en pesos.");
    const currency = stringToHex("ARS", { size: 32 });
    const diamond = config.NEXT_PUBLIC_P2P_DIAMOND_ADDRESS as `0x${string}`;
    const [price, threshold, fixedFee] = await Promise.all([
      publicClient.readContract({ address: diamond, abi: DIAMOND_ABI, functionName: "getPriceConfig", args: [currency] }),
      publicClient.readContract({ address: diamond, abi: DIAMOND_ABI, functionName: "getSmallOrderThreshold", args: [currency] }),
      readSmallOrderFixedFee(publicClient, diamond, currency, "buy"),
    ]);
    const amount = roundCheckoutUsdcDown({ quotedUsdc: ctx.usdcAmount, fiatLimit, buyPrice: price.buyPrice, threshold, fixedFee });
    const store = createLocalStorageRelayStore(); let identity = await store.get(); if (!identity) { identity = createRelayIdentity(); await store.set(identity); }
    const data = encodeFunctionData({ abi: INTEGRATOR_ABI, functionName: "userPlaceOrder", args: [amount, currency, ctx.currency.circleId, identity.publicKey, ctx.currency.paymentChannelConfigId ?? 0n, fiatLimit] });
    const { hash } = await signer.sendTransaction({ to: config.NEXT_PUBLIC_P2P_INTEGRATOR_ADDRESS as `0x${string}`, data, gasLimit: 1_500_000 });
    const receipt = await publicClient.waitForTransactionReceipt({ hash }); if (receipt.status === "reverted") throw new Error("La transacción del integrador fue revertida.");
    const { orderId } = findIntegratorPlacement(receipt.logs, config.NEXT_PUBLIC_P2P_INTEGRATOR_ADDRESS as `0x${string}`, signer.address);
    await persistOrder(orderId, hash, signer.address);
    return { orderId, txHash: hash };
  };
  return <Checkout mode="inline" signer={signer} placeOrder={placeOrder} currencies={currencies} productName={productName} chainId={baseSepolia.id} diamondAddress={config.NEXT_PUBLIC_P2P_DIAMOND_ADDRESS as `0x${string}`} rpcUrl={config.NEXT_PUBLIC_P2P_RPC_URL} subgraphUrl={config.NEXT_PUBLIC_P2P_SUBGRAPH_URL} usdcAddress={config.NEXT_PUBLIC_P2P_USDC_ADDRESS as `0x${string}`} fiatChargeAmount={fiatAmountMinor * 10_000n} onOrderPlaced={onOrderPlaced} onComplete={onComplete} onError={onError} theme={{ colors: { accent: "#26724d", success: "#16845b" }, radii: { modal: 16, button: 12 } }} />;
}
