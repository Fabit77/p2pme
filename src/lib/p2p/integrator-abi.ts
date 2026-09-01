export const INTEGRATOR_ABI = [{
  name: "userPlaceOrder", type: "function", stateMutability: "nonpayable",
  inputs: [
    { name: "amount", type: "uint256" }, { name: "currency", type: "bytes32" },
    { name: "circleId", type: "uint256" }, { name: "pubKey", type: "string" },
    { name: "preferredPaymentChannelConfigId", type: "uint256" }, { name: "fiatAmountLimit", type: "uint256" },
  ], outputs: [{ name: "orderId", type: "uint256" }],
}] as const;

export const INTEGRATOR_TREASURY_ABI = [{
  name: "treasury", type: "function", stateMutability: "view",
  inputs: [], outputs: [{ name: "", type: "address" }],
}] as const;
