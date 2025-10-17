import { EVM_NETWORK_TO_CHAIN_ID, EVM_USDC } from "../constants";
import type { PaymentRequirements } from "../types";
import { preparePaymentHeader, signPaymentHeader } from "x402/client";

export const getAsset = (network: string) => {
  const chainId =
    EVM_NETWORK_TO_CHAIN_ID[network as keyof typeof EVM_NETWORK_TO_CHAIN_ID];
  if (!chainId) {
    throw new Error(`Unsupported network: ${network}`);
  }
  const asset = EVM_USDC[chainId as unknown as keyof typeof EVM_USDC];
  if (!asset) {
    throw new Error(`USDC not found for chainId: ${chainId}`);
  }
  return asset;
};

export const buildPaymentRequirements = (
  network: string,
  to: string,
  maxAmountRequired: string
) => {
  return {
    scheme: "exact",
    network: network,
    maxAmountRequired: maxAmountRequired,
    resource: "https://x402ble.io",
    description: "",
    mimeType: "application/json",
    payTo: to,
    maxTimeoutSeconds: 300,
    asset: getAsset(network).usdcAddress,
    extra: { name: getAsset(network).usdcName, version: "2" },
  };
};

export const createPaymentPayload = async (
  address: `0x${string}` | undefined,
  walletClient: any,
  paymentRequirements: PaymentRequirements
) => {
  if (!walletClient) throw new Error("Wallet client is not available");

  if (!paymentRequirements)
    throw new Error("Payment requirements are not available");

  const paymentheader = preparePaymentHeader(
    address as `0x${string}`,
    1,
    paymentRequirements as any
  );

  console.log("paymentheader", paymentheader);

  try {
    const signedMessage = await signPaymentHeader(
      walletClient as any, // Type assertion to bypass type mismatch
      paymentRequirements as any,
      paymentheader
    );

    const decodedSignedPayload = JSON.parse(atob(signedMessage));
    console.log("decodedSignedPayload", decodedSignedPayload);
    return decodedSignedPayload;
  } catch (error) {
    console.error("Error in createPaymentPayload:", error);
    throw error;
  }
};
