export interface PaymentRequirements {
  scheme: "exact";
  network: string;
  maxAmountRequired: string; // Atomic units
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string; // Token contract address
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extra?: Record<string, any>;
}

export interface PaymentPayload {
  x402Version: number;
  scheme: string;
  payload: string;
  network: string;
}