// Verifying and setteling a signed payment header manually so it can be easily be migrated to c++

import { PaymentPayload, PaymentRequirements } from "x402/types";
import { createPaymentPayload } from "./client.js";

const to = "0xa78eD39F695615315458Bb066ac9a5F28Dfd65FE";
const value = "1000000";
const network = "base-sepolia";

const DEFAULT_FACILITATOR_URL = "https://x402.org/facilitator";

// evm
export const EvmNetworkToChainId = {
  "base-sepolia": 84532,
  base: 8453,
  "avalanche-fuji": 43113,
  avalanche: 43114,
  iotex: 4689,
  sei: 1329,
  "sei-testnet": 1328,
  polygon: 137,
  "polygon-amoy": 80002,
  peaq: 3338,
};

// evm
const EvmUSDC = {
  "84532": {
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    usdcName: "USDC",
  },
  "8453": {
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    usdcName: "USD Coin",
  },
  "43113": {
    usdcAddress: "0x5425890298aed601595a70AB815c96711a31Bc65",
    usdcName: "USD Coin",
  },
  "43114": {
    usdcAddress: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    usdcName: "USD Coin",
  },
  "4689": {
    usdcAddress: "0xcdf79194c6c285077a58da47641d4dbe51f63542",
    usdcName: "Bridged USDC",
  },
  // solana devnet
  "103": {
    usdcAddress: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    usdcName: "USDC",
  },
  // solana mainnet
  "101": {
    usdcAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    usdcName: "USDC",
  },
  "1328": {
    usdcAddress: "0x4fcf1784b31630811181f670aea7a7bef803eaed",
    usdcName: "USDC",
  },
  "1329": {
    usdcAddress: "0xe15fc38f6d8c56af07bbcbe3baf5708a2bf42392",
    usdcName: "USDC",
  },
  "137": {
    usdcAddress: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
    usdcName: "USD Coin",
  },
  "80002": {
    usdcAddress: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
    usdcName: "USDC",
  },
  "3338": {
    usdcAddress: "0xbbA60da06c2c5424f03f7434542280FCAd453d10",
    usdcName: "USDC",
  },
};

// evm
const getAsset = (network: string) => {
  const chainId =
    EvmNetworkToChainId[network as keyof typeof EvmNetworkToChainId];
  if (!chainId) {
    throw new Error(`Unsupported network: ${network}`);
  }
  const asset = EvmUSDC[chainId as unknown as keyof typeof EvmUSDC];
  if (!asset) {
    throw new Error(`USDC not found for chainId: ${chainId}`);
  }
  return asset;
};

const mockPaymentRequirements: PaymentRequirements = {
  scheme: "exact",
  network,
  maxAmountRequired: value,
  resource: "https://example.com/resource",
  description: "Test resource",
  mimeType: "application/json",
  payTo: to,
  maxTimeoutSeconds: 300,
  asset: getAsset(network).usdcAddress,
  extra: { name: getAsset(network).usdcName, version: "2" },
};


const verify = async (decodedSignedPayload: PaymentPayload) => {
  const url = DEFAULT_FACILITATOR_URL;

  let headers = { "Content-Type": "application/json" };

  const res = await fetch(`${url}/verify`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      x402Version: decodedSignedPayload.x402Version,
      paymentPayload: decodedSignedPayload,
      paymentRequirements: mockPaymentRequirements,
    }),
  });

  const data = await res.json();
  console.log("Verification response:", JSON.stringify(data, null, 2));

  // Show status for debugging
  console.log("Response status:", res.status);
  if (!data.isValid && data.invalidReason) {
    console.log("Error reason:", data.invalidReason);
  }
};

const settle = async (decodedSignedPayload: PaymentPayload) => {
  const url = DEFAULT_FACILITATOR_URL;
  let headers = { "Content-Type": "application/json" };

  const res = await fetch(`${url}/settle`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      x402Version: decodedSignedPayload.x402Version,
      paymentPayload: decodedSignedPayload,
      paymentRequirements: mockPaymentRequirements,
    }),
  });

  if (res.status !== 200) {
    const text = res.statusText;
    throw new Error(`Failed to settle payment: ${res.status} ${text}`);
  }

  const data = await res.json();
  console.log(data);
  return data;
};

const managepayment = async () => {
  const decodedSignedPayload = await createPaymentPayload(
    mockPaymentRequirements
  );

  await verify(decodedSignedPayload);
  await settle(decodedSignedPayload);
};
