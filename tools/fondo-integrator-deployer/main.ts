import {
  createPublicClient,
  createWalletClient,
  custom,
  getAddress,
  http,
  parseUnits,
} from "viem";
import { baseSepolia } from "viem/chains";
import artifact from "./artifact.json";

const DIAMOND = getAddress("0xeb0BB8E3c014D915D9B2df03aBB130a1Fb44beb9");
const USDC = getAddress("0x4095fE4f1E636f11A95820BA2bB87F335Bd1040d");
const TREASURY = getAddress("0xA3B2BD9d16030d31b82B3E5a084f1A736ed9F769");
const EXPECTED_DEPLOYER = getAddress("0x77E2e22055b915ba0244933E8459ba73F0571883");
const EXISTING_INTEGRATOR = getAddress("0x82Ec641720dA381C88aB351f9bDA4edfa06e9aeA");
const EXISTING_TX = "0x276df3168467f2817eca7c8d6bad1ebc4e9b1cbced3b94a13b2decdfa6de805b";
const MAX_TX_AMOUNT = parseUnits("1000", 6);
const DAILY_TX_COUNT_LIMIT = 100n;

const connectButton = document.querySelector("#connect");
const deployButton = document.querySelector("#deploy");
const status = document.querySelector("#status");
let walletClient;
let account;

function setStatus(message, kind = "") {
  status.textContent = message;
  status.className = kind;
}

async function verifyDeployment(publicClient, contractAddress, hash) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const bytecode = await publicClient.getBytecode({ address: contractAddress });
    if (bytecode && bytecode !== "0x") {
      const [storedTreasury, proxyImpl] = await Promise.all([
        publicClient.readContract({ address: contractAddress, abi: artifact.abi, functionName: "treasury" }),
        publicClient.readContract({ address: contractAddress, abi: artifact.abi, functionName: "proxyImpl" }),
      ]);
      if (getAddress(storedTreasury) !== TREASURY) throw new Error("La tesorería verificada no coincide.");
      return { storedTreasury, proxyImpl };
    }
    await new Promise((resolve) => setTimeout(resolve, 2_500));
  }
  throw new Error(`El contrato fue confirmado en ${hash}, pero el RPC todavía no entrega su código. Espera unos segundos y recarga; no vuelvas a desplegar.`);
}

async function ensureBaseSepolia(provider) {
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x14a34" }] });
  } catch (error) {
    if (error?.code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: "0x14a34",
        chainName: "Base Sepolia",
        nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        rpcUrls: ["https://sepolia.base.org"],
        blockExplorerUrls: ["https://sepolia.basescan.org"],
      }],
    });
  }
}

connectButton.addEventListener("click", async () => {
  try {
    if (!window.ethereum) throw new Error("MetaMask no está instalado en este navegador.");
    await ensureBaseSepolia(window.ethereum);
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    account = getAddress(accounts[0]);
    if (account !== EXPECTED_DEPLOYER) {
      deployButton.disabled = true;
      throw new Error(`Conectaste ${account}. Cambia en MetaMask a la wallet de despliegue ${EXPECTED_DEPLOYER}.`);
    }
    walletClient = createWalletClient({ account, chain: baseSepolia, transport: custom(window.ethereum) });
    deployButton.disabled = false;
    setStatus(`Wallet conectada: ${account}\nLista para desplegar en Base Sepolia.`, "ok");
  } catch (error) {
    setStatus(error?.shortMessage || error?.message || String(error), "error");
  }
});

deployButton.addEventListener("click", async () => {
  deployButton.disabled = true;
  connectButton.disabled = true;
  try {
    setStatus("MetaMask abrirá la confirmación. Revisa Base Sepolia y el costo de gas antes de firmar.");
    const hash = await walletClient.deployContract({
      account,
      chain: baseSepolia,
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      args: [DIAMOND, USDC, TREASURY, MAX_TX_AMOUNT, DAILY_TX_COUNT_LIMIT],
    });
    localStorage.setItem("fondoDeploymentHash", hash);
    setStatus(`Transacción enviada: ${hash}\nEsperando confirmación…`);
    const publicClient = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });
    const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
    if (receipt.status !== "success" || !receipt.contractAddress) throw new Error("El despliegue fue revertido.");
    const { storedTreasury, proxyImpl } = await verifyDeployment(publicClient, receipt.contractAddress, hash);
    setStatus(
      `DESPLIEGUE CONFIRMADO\n\nINTEGRATOR_ADDRESS=${receipt.contractAddress}\nPROXY_IMPL=${proxyImpl}\nTREASURY=${storedTreasury}\nTX=${hash}\n\nGuarda estas direcciones para la whitelist de P2P.me.`,
      "ok"
    );
  } catch (error) {
    setStatus(error?.shortMessage || error?.message || String(error), "error");
    deployButton.disabled = false;
    connectButton.disabled = false;
  }
});

async function showExistingDeployment() {
  try {
    const publicClient = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });
    const { storedTreasury, proxyImpl } = await verifyDeployment(publicClient, EXISTING_INTEGRATOR, EXISTING_TX);
    connectButton.disabled = true;
    deployButton.disabled = true;
    setStatus(
      `DESPLIEGUE CONFIRMADO\n\nINTEGRATOR_ADDRESS=${EXISTING_INTEGRATOR}\nPROXY_IMPL=${proxyImpl}\nTREASURY=${storedTreasury}\nTX=${EXISTING_TX}\n\nNo vuelvas a desplegar el contrato.`,
      "ok"
    );
  } catch (error) {
    setStatus(error?.shortMessage || error?.message || String(error), "error");
  }
}

showExistingDeployment();
