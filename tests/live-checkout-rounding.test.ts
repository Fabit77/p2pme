import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { decodeFunctionData } from "viem";
import type { PlaceOrderContext, PlaceOrderResult } from "@p2pdotme/widgets/checkout";
import { INTEGRATOR_ABI } from "@/lib/p2p/integrator-abi";

const mocks = vi.hoisted(() => ({
  place: undefined as undefined | ((ctx: PlaceOrderContext) => Promise<PlaceOrderResult>),
  read: vi.fn(), receipt: vi.fn(), fee: vi.fn(),
}));
vi.mock("@p2pdotme/widgets/checkout", () => ({ Checkout: (props: { placeOrder: typeof mocks.place }) => { mocks.place = props.placeOrder; return null; } }));
vi.mock("@p2pdotme/widgets", async (original) => ({ ...await original<object>(), readSmallOrderFixedFee: mocks.fee }));
vi.mock("viem", async (original) => ({ ...await original<object>(), createPublicClient: () => ({ readContract: mocks.read, waitForTransactionReceipt: mocks.receipt }) }));
vi.mock("@p2pdotme/sdk/orders", () => ({ createLocalStorageRelayStore: () => ({ get: async () => ({ publicKey: "test-public-key" }) }) }));
vi.mock("@/lib/p2p/placement-evidence", () => ({ findIntegratorPlacement: () => ({ orderId: "718" }) }));
import { LiveP2PCheckout } from "@/components/p2p/live-p2p-checkout";

const integrator = "0x2222222222222222222222222222222222222222";
const payer = "0x1111111111111111111111111111111111111111";
const hash = `0x${"a".repeat(64)}`;
const context = { currency: { symbol: "ARS", circleId: 6n }, usdcAmount: 1_996_008n, fiatAmount: 3_000_000_000n } as PlaceOrderContext;

beforeEach(() => {
  mocks.read.mockImplementation(async ({ functionName }) => functionName === "getPriceConfig" ? { buyPrice: 1_503_000_000n } : 10_000_000n);
  mocks.fee.mockResolvedValue(0n);
  mocks.receipt.mockResolvedValue({ status: "success", logs: [] });
  for (const key of ["RPC_URL", "SUBGRAPH_URL"]) vi.stubEnv(`NEXT_PUBLIC_P2P_${key}`, "https://example.com");
  for (const key of ["DIAMOND_ADDRESS", "USDC_ADDRESS", "TREASURY_ADDRESS"]) vi.stubEnv(`NEXT_PUBLIC_P2P_${key}`, payer);
  vi.stubEnv("NEXT_PUBLIC_P2P_INTEGRATOR_ADDRESS", integrator);
});
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });

function render() {
  const send = vi.fn().mockResolvedValue({ hash });
  const persist = vi.fn().mockResolvedValue(undefined);
  renderToStaticMarkup(createElement(LiveP2PCheckout, {
    signer: { address: payer, sendTransaction: send }, fiatAmountMinor: 300_000n,
    productName: "Prueba", persistOrder: persist, onOrderPlaced: vi.fn(), onComplete: vi.fn(), onError: vi.fn(),
  }));
  return { send, persist };
}

it("encodes the rounded principal with the unchanged ARS cap and persists the resulting order", async () => {
  const { send, persist } = render();
  await expect(mocks.place!(context)).resolves.toEqual({ orderId: "718", txHash: hash });
  const tx = send.mock.calls[0][0];
  expect(tx.to).toBe(integrator);
  const decoded = decodeFunctionData({ abi: INTEGRATOR_ABI, data: tx.data });
  expect(decoded.args[0]).toBe(1_996_007n);
  expect(decoded.args[2]).toBe(6n);
  expect(decoded.args[5]).toBe(3_000_000_000n);
  expect(persist).toHaveBeenCalledWith("718", hash, payer);
});

it("does not send or persist a transaction with a mismatched fiat cap", async () => {
  const { send, persist } = render();
  await expect(mocks.place!({ ...context, fiatAmount: 0n })).rejects.toThrow("monto reservado");
  expect(send).not.toHaveBeenCalled();
  expect(persist).not.toHaveBeenCalled();
});

it("does not send if a fresh quote cannot be reconciled by one micro-USDC", async () => {
  const { send, persist } = render();
  mocks.read.mockImplementation(async ({ functionName }) => functionName === "getPriceConfig" ? { buyPrice: 1_504_000_000n } : 10_000_000n);
  await expect(mocks.place!(context)).rejects.toThrow("cotización cambió");
  expect(send).not.toHaveBeenCalled();
  expect(persist).not.toHaveBeenCalled();
});
