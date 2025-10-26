export interface PaymentRequirements {
  maxAmountRequired: string;
  network?: string;
  payTo?: string;
  maxTimeoutSeconds?: number;
  scheme?: string;
}