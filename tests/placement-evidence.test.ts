import { describe, expect, it } from "vitest";
import { encodeAbiParameters, encodeEventTopics, stringToHex, type Log } from "viem";
import { FONDO_EVIDENCE_ABI, findIntegratorPlacement } from "@/lib/p2p/placement-evidence";

const integrator = "0x1111111111111111111111111111111111111111";
const payer = "0x2222222222222222222222222222222222222222";
const stranger = "0x3333333333333333333333333333333333333333";
const log: Pick<Log, "address" | "data" | "topics"> = {
  address: integrator,
  data: encodeAbiParameters([{ type: "uint256" }], [10_000000n]),
  topics: encodeEventTopics({ abi: FONDO_EVIDENCE_ABI, eventName: "OrderPlaced", args: { orderId: 42n, user: payer, currency: stringToHex("ARS", { size: 32 }) } }) as Log["topics"],
};
describe("integrator placement receipt", () => {
  it("decodes the exact integrator event", () => {
    expect(findIntegratorPlacement([log], integrator, payer).orderId).toBe("42");
  });
  it("ignores identical event signatures from a different contract", () => {
    expect(() => findIntegratorPlacement([{ ...log, address: stranger }], integrator, payer)).toThrow("única orden");
  });
  it("rejects a different payer, order, or ambiguous receipt", () => {
    expect(() => findIntegratorPlacement([log], integrator, stranger)).toThrow();
    expect(() => findIntegratorPlacement([log], integrator, payer, "43")).toThrow();
    expect(() => findIntegratorPlacement([log, log], integrator, payer)).toThrow();
  });
});
