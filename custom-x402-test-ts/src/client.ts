import { createWalletClient, type Hex, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import dotenv from "dotenv";
import { preparePaymentHeader, signPaymentHeader } from "x402/client";
import { PaymentRequirements } from "x402/types";
import {} from "x402-magic";
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;
if (!PRIVATE_KEY) {
  throw new Error("Please set your PRIVATE_KEY in the .env file");
}

const account = privateKeyToAccount(PRIVATE_KEY);

const wallet = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(),
});

export const createPaymentPayload = async (
  mockPaymentRequirements: PaymentRequirements
) => {
  const paymentheader = preparePaymentHeader(
    account.address,
    1,
    mockPaymentRequirements
  );

  const signedMessage = await signPaymentHeader(
    //@ts-ignore
    wallet,
    mockPaymentRequirements,
    paymentheader
  );

  const decodedSignedPayload = JSON.parse(
    Buffer.from(signedMessage, "base64").toString()
  );
  return decodedSignedPayload;
};
