import { EVM_NETWORK_TO_CHAIN_ID, EVM_USDC } from '../constants';
import type { PaymentRequirements } from '../types';
import { signPaymentHeader } from 'x402/client';
import { Buffer } from 'buffer';

export const getAsset = (network: string) => {
  const chainId = EVM_NETWORK_TO_CHAIN_ID[network as keyof typeof EVM_NETWORK_TO_CHAIN_ID];
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
    scheme: 'exact',
    network: network,
    maxAmountRequired: maxAmountRequired,
    resource: 'https://x402ble.io',
    description: '',
    mimeType: 'application/json',
    payTo: to,
    maxTimeoutSeconds: 300,
    asset: getAsset(network).usdcAddress,
    extra: { name: getAsset(network).usdcName, version: '2' },
  };
};

export const createPaymentPayload = async (
  address: `0x${string}` | undefined,
  walletClient: any,
  paymentRequirements: PaymentRequirements
) => {
  if (!walletClient) throw new Error('Wallet client is not available');

  if (!paymentRequirements) throw new Error('Payment requirements are not available');

  // Build unsigned payment header locally to avoid Node 'crypto' dependency in RN
  const bytesToHex = (bytes: Uint8Array): `0x${string}` => {
    let hex = '0x';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex as `0x${string}`;
  };

  const generateNonce = async (): Promise<`0x${string}`> => {
    // Prefer WebCrypto if available
    if (
      typeof globalThis.crypto !== 'undefined' &&
      typeof globalThis.crypto.getRandomValues === 'function'
    ) {
      try {
        const bytes = new Uint8Array(32);
        globalThis.crypto.getRandomValues(bytes);
        return bytesToHex(bytes);
      } catch (e) {
        // Some polyfills exist but call into missing native modules. Fall back below.
      }
    }
    // Fallback: simple PRNG-based 32-byte hex (non-cryptographic; for dev only)
    let hex = '0x';
    for (let i = 0; i < 32; i++) {
      const rnd = Math.floor(Math.random() * 256);
      hex += rnd.toString(16).padStart(2, '0');
    }
    return hex as `0x${string}`;
  };

  const nowSeconds = Math.floor(Date.now() / 1000);
  const validAfter = BigInt(nowSeconds - 600).toString(); // 10 minutes prior
  const validBefore = BigInt(nowSeconds + (paymentRequirements.maxTimeoutSeconds ?? 300)).toString();

  const paymentheader = {
    x402Version: 1,
    scheme: paymentRequirements.scheme,
    network: paymentRequirements.network,
    payload: {
      signature: undefined as unknown as string,
      authorization: {
        from: address as `0x${string}`,
        to: paymentRequirements.payTo,
        value: paymentRequirements.maxAmountRequired,
        validAfter,
        validBefore,
        nonce: await generateNonce(),
      },
    },
  } as any;

  console.log('paymentheader', paymentheader);

  try {
    const signedMessage = await signPaymentHeader(
      walletClient as any, // Type assertion to bypass type mismatch
      paymentRequirements as any,
      paymentheader
    );

    // RN doesn't have atob; decode via Buffer
    const decodedJson = Buffer.from(signedMessage, 'base64').toString('utf-8');
    const decodedSignedPayload = JSON.parse(decodedJson);
    console.log('decodedSignedPayload', decodedSignedPayload);
    return decodedSignedPayload;
  } catch (error) {
    console.error('Error in createPaymentPayload:', error);
    throw error;
  }
};
