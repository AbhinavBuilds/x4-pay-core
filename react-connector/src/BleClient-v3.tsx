import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useWalletClient } from "wagmi";
import { preparePaymentHeader, signPaymentHeader } from "x402/client";

// Minimal ambient types for Web Bluetooth used in this file.
// These are permissive (any) to avoid requiring external @types packages.
type BluetoothDevice = any;
type BluetoothRemoteGATTServer = any;
type BluetoothRemoteGATTCharacteristic = any;
declare global {
  interface Navigator {
    bluetooth?: any;
  }
}

const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const RX_CHAR_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // Write
const TX_CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // Notify

type GattRefs = {
  device?: BluetoothDevice;
  server?: BluetoothRemoteGATTServer;
  rx?: BluetoothRemoteGATTCharacteristic;
  tx?: BluetoothRemoteGATTCharacteristic;
};

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

const buildPaymentRequirements = (
  network: string,
  to: string,
  maxAmountRequired: string
) => {
  return {
    scheme: "exact",
    network: network,
    maxAmountRequired: maxAmountRequired,
    resource: "https://example.com/resource",
    description: "Test resource",
    mimeType: "application/json",
    payTo: to,
    maxTimeoutSeconds: 300,
    asset: getAsset(network).usdcAddress,
    extra: { name: getAsset(network).usdcName, version: "2" },
  };
};

const chunkString = (str: string, size: number) => {
  const numChunks = Math.ceil(str.length / size);
  const chunks = new Array(numChunks);

  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substr(o, size);
  }

  return chunks;
};

export default function BleClient() {
  const { data: walletClient } = useWalletClient();
  const { address, isConnected } = useAccount();

  const createPaymentPayload = async (paymentRequirements: any) => {
    console.log("address: ", address);
    console.log("walletClient: ", walletClient);
    console.log("paymentRequirements: ", paymentRequirements);
    console.log("isConnected: ", isConnected);

    if (!address) {
      throw new Error("Address is not available");
    }

    if (!isConnected) {
      throw new Error("Wallet is not connected");
    }

    if (!walletClient) {
      throw new Error("Wallet client is not available");
    }

    if (!paymentRequirements) {
      throw new Error("Payment requirements are not available");
    }

    const paymentheader = preparePaymentHeader(address, 1, paymentRequirements);

    console.log("paymentheader", paymentheader);

    try {
      const signedMessage = await signPaymentHeader(
        walletClient as any, // Type assertion to bypass type mismatch
        paymentRequirements,
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

  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("disconnected");
  const [outgoing, setOutgoing] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const g = useRef<GattRefs>({});
  const logBox = useRef<HTMLDivElement>(null);

  const append = (s: string) =>
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${s}`]);

  const onNotify = useCallback(
    async (e: Event) => {
      const ch = e.target as BluetoothRemoteGATTCharacteristic;
      const v = ch?.value;
      if (!v) return;

      const data_string = new TextDecoder().decode(v);
      console.log(data_string);
      if (data_string.startsWith("402")) {
        console.log(data_string.slice(3));
        const data = JSON.parse(data_string.slice(3));
        const paymentRequirements = buildPaymentRequirements(
          data[0],
          data[2],
          data[1]
        );
        console.log(JSON.stringify(paymentRequirements));

        // Check if wallet is available before proceeding
        if (!isConnected || !walletClient || !address) {
          append(
            "Payment request received, but wallet is not connected. Please connect your wallet first."
          );
          console.log("Wallet not available for payment request:", {
            isConnected,
            walletClient: !!walletClient,
            address,
          });
          return;
        }

        try {
          const paymentpayload = await createPaymentPayload(
            paymentRequirements
          );
          console.log("paymentpayload", paymentpayload);
          await sendPayload(`${JSON.stringify(paymentpayload)}`);
          append(`Payment payload created successfully`);
        } catch (error) {
          console.error("Failed to create payment payload:", error);
          append(
            `Error creating payment: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      append(`RX<-TX: ${JSON.stringify(v)}`);
    },
    [isConnected, walletClient, address]
  );

  const sendPayload = async (payload: string) => {
    const chunks = chunkString(payload, 100);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      let data = "";
      console.log(chunk);

      if (i == 0) {
        data = `X-PAYMENT:START${chunk}`;
      } else if (i == chunks.length - 1) {
        data = `X-PAYMENT:END${chunk}`;
      } else {
        data = `X-PAYMENT${chunk}`;
      }
      send(data);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  };
  const connect = useCallback(async () => {
    try {
      setStatus("requesting device…");
      const device = await navigator.bluetooth.requestDevice({
        // Change namePrefix if your device advertises a different name
        filters: [{ namePrefix: "X402" }],
        optionalServices: [SERVICE_UUID],
      });

      device.addEventListener("gattserverdisconnected", () => {
        setConnected(false);
        setStatus("disconnected");
        append("Disconnected");
        g.current = {};
      });

      setStatus("connecting…");
      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      const rx = await service.getCharacteristic(RX_CHAR_UUID);
      const tx = await service.getCharacteristic(TX_CHAR_UUID);

      await tx.startNotifications();
      tx.addEventListener("characteristicvaluechanged", onNotify);

      g.current = { device, server, rx, tx };
      setConnected(true);
      setStatus(`connected: ${device.name ?? "device"}`);
      append("Notifications started");
    } catch (err: any) {
      setStatus("error");
      append(`Error: ${err?.message ?? String(err)}`);
      console.error(err);
    }
  }, [onNotify]);

  const disconnect = useCallback(() => {
    try {
      const dev = g.current.device;
      if (dev?.gatt?.connected) dev.gatt.disconnect();
    } finally {
      g.current = {};
      setConnected(false);
      setStatus("disconnected");
      append("Disconnected");
    }
  }, []);

  const send = useCallback(
    async (data?: string) => {
      const rx = g.current.rx;
      if (!rx) return append("Cannot send: RX not ready");
      try {
        console.log("======= sending ", data);
        await rx.writeValue(new TextEncoder().encode(data));
        append(`TX->RX: ${data}`);
        setOutgoing("");
      } catch (e: any) {
        append(`Send error: ${e?.message ?? String(e)}`);
      }
    },
    [outgoing]
  );

  useEffect(() => {
    logBox.current?.scrollTo({
      top: logBox.current.scrollHeight,
      behavior: "smooth",
    });
  }, [log]);

  const supported = "bluetooth" in navigator;

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">X402 BLE Client</h1>
        <span
          className={`text-xs px-2 py-1 rounded ${
            connected
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {status}
        </span>
      </div>

      {!supported && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          Web Bluetooth not supported. Use Chrome/Edge/Brave.
        </div>
      )}

      {/* Wallet Connection Section */}
      <div className="rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium">Wallet Connection</h2>
          <span
            className={`text-xs px-2 py-1 rounded ${
              isConnected
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <div className="space-y-2">
          <ConnectButton />
          {isConnected && address && (
            <div className="text-xs text-gray-600">
              Address: {address.slice(0, 6)}...{address.slice(-4)}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="rounded-lg px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          onClick={connect}
          disabled={!supported || connected}
        >
          Connect
        </button>
        <button
          className="rounded-lg px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
          onClick={disconnect}
          disabled={!connected}
        >
          Disconnect
        </button>
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200 disabled:bg-gray-50"
          placeholder="Type a request…"
          value={outgoing}
          onChange={(e) => setOutgoing(e.target.value)}
          disabled={!connected}
        />
        <button
          className="rounded-lg px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          onClick={() => send(outgoing)}
          disabled={!connected || outgoing.length === 0}
        >
          Send
        </button>
      </div>

      <div className="rounded-xl border border-gray-200">
        <div className="px-4 py-2 border-b text-sm text-gray-600">Log</div>
        <div
          ref={logBox}
          className="p-4 h-60 overflow-y-auto text-sm space-y-1"
        >
          {log.length === 0 ? (
            <div className="text-gray-400">No data yet…</div>
          ) : (
            log.map((m, i) => (
              <div key={i} className="font-mono break-words">
                {m}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
