export const INTEGRATOR_ABI = [{
  name: "userPlaceOrder", type: "function", stateMutability: "nonpayable",
  inputs: [
    { name: "client", type: "address" }, { name: "productId", type: "uint256" }, { name: "quantity", type: "uint256" },
    { name: "currency", type: "bytes32" }, { name: "circleId", type: "uint256" }, { name: "pubKey", type: "string" },
    { name: "preferredPaymentChannelConfigId", type: "uint256" }, { name: "fiatAmountLimit", type: "uint256" },
  ], outputs: [{ name: "orderId", type: "uint256" }],
}] as const;
