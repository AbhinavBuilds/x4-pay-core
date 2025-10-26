import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import Header from "./Header";
import type { PaymentRequirements } from "../types";

export interface PaymentRequirementsLocal {
  maxAmountRequired: string;
  network?: string;
  payTo?: string;
}

type Props = {
  address?: `0x${string}`;
  deviceName: string;
  logo: string | null;
  banner: string | null;
  description: string | null;
  lastTransactionStatus?: "NOT-STARTED" | "FAILED" | "SUCCESS" | "STARTED";
  getPrice: (options: string[], customizedtext: string) => void;
  handlePayNow: (
    address: `0x${string}` | undefined,
    options: string[],
    customizedtext: string
  ) => void;
  frequency: number | null;
  allowCustomtext: boolean;
  options: string[];
  paymentRequirements: PaymentRequirements | null;
  setWaitingToStartAutoPay?: (waiting: boolean) => void;
  waitingToStartAutoPay?: boolean;
  onDisconnect?: () => void;
};

const DeviceWindow: React.FC<Props> = ({
  deviceName,
  logo,
  banner,
  description,
  handlePayNow,
  frequency,
  allowCustomtext,
  options,
  paymentRequirements,
  lastTransactionStatus = "NOT-STARTED",
  getPrice,
  setWaitingToStartAutoPay,
  waitingToStartAutoPay = false,
  onDisconnect,
}) => {
  const { address, isConnected } = useAccount();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [customText, setCustomText] = useState<string>("");
  const [showPreview, setShowPreview] = useState<boolean>(true);
  console.log(paymentRequirements);

  const getPriceWithDelay = async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    getPrice(selectedOptions, customText);
  };

  useEffect(() => {
    getPriceWithDelay();
  }, [selectedOptions, customText]);

  // Check for transaction failure when waiting to start auto pay
  useEffect(() => {
    if (waitingToStartAutoPay && lastTransactionStatus === "FAILED") {
      alert(
        "Transaction Failed\nPossible causes:\n• Network mismatch\n• Insufficient balance\n• x4 core timed out"
      );
      setWaitingToStartAutoPay?.(false);
    }
  }, [waitingToStartAutoPay, lastTransactionStatus, setWaitingToStartAutoPay]);

  const formatDollarsFromMicros = (amountStr: string) => {
    try {
      const micros = BigInt(amountStr);
      const ONE_DOLLAR = 1_000_000n;
      const ONE_CENT_IN_MICROS = 10_000n;
      let dollars = micros / ONE_DOLLAR;
      let cents =
        ((micros % ONE_DOLLAR) + ONE_CENT_IN_MICROS / 2n) / ONE_CENT_IN_MICROS;
      if (cents === 100n) {
        dollars += 1n;
        cents = 0n;
      }
      if (cents === 0n) return `$${dollars.toString()}`;
      const centsStr = cents.toString().padStart(2, "0");
      return `$${dollars.toString()}.${centsStr}`;
    } catch {
      return `$${amountStr}`;
    }
  };

  const payLabel = paymentRequirements?.maxAmountRequired
    ? `Pay ${formatDollarsFromMicros(paymentRequirements.maxAmountRequired)}${
        frequency ? ` / ${frequency} sec` : ""
      }`
    : "Pay Now";

  const toggleOption = (opt: string) => {
    setSelectedOptions((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  };

  const handlePayPress = () => {
    if (frequency && frequency > 0) {
      setWaitingToStartAutoPay?.(true);
    }
    try {
      handlePayNow(address, selectedOptions, customText);
    } catch (error: any) {
      alert(`Error calling handlePayNow: ${error.message}`);
    }
  };

  // Preview Screen Component
  if (showPreview && banner && logo) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${banner})` }}
        />

        {/* Overlay for better readability */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Center Content Box */}
        <div className="relative flex items-center justify-center min-h-screen px-6">
          <div
            className="rounded-3xl p-6 max-w-sm w-full text-center border border-white/30"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
          >
            {/* Logo */}
            {logo && (
              <img
                src={logo}
                alt="Logo"
                className="w-20 h-20 rounded-2xl mb-4 border-2 border-white/50 mx-auto object-cover"
              />
            )}

            {/* Device Name */}
            <h1 className="text-white text-2xl font-bold mb-2">{deviceName}</h1>

            {/* Description */}
            {description && (
              <p className="text-white/95 text-base leading-6 mb-6">
                {description}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4 w-full">
              {/* Cross Button - Disconnect */}
              <button
                onClick={() => {
                  try {
                    onDisconnect?.();
                  } catch (error) {
                    console.error("Disconnect error:", error);
                    alert("Failed to disconnect properly");
                  }
                }}
                className="flex-1 rounded-2xl py-4 flex flex-col items-center justify-center border border-white/40"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
              >
                <span className="text-white text-2xl font-bold">×</span>
                <span className="text-white/90 text-xs font-medium mt-1">
                  Disconnect
                </span>
              </button>

              {/* Tick Button - Continue */}
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 rounded-2xl py-4 flex flex-col items-center justify-center border border-white/40"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
              >
                <span className="text-white text-2xl font-bold">✓</span>
                <span className="text-white/90 text-xs font-medium mt-1">
                  Continue
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Device Interface
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header
        title="x4 Pay"
        subtitle="connected device"
        theme="dark"
        showClose={!!onDisconnect}
        onClosePress={() => {
          try {
            onDisconnect?.();
          } catch (error) {
            console.log("Disconnect error:", error);
          }
        }}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
        <div className="space-y-4 max-w-md mx-auto">
          {/* Main Device Card */}
          <div className="rounded-3xl border border-white/12 bg-white/4 p-6">
            {/* Device Info Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-white/8 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                <span className="text-white text-2xl">▷</span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                {deviceName}
              </h2>
              <p className="text-white/60 text-sm leading-5 max-w-sm mx-auto">
                {description || "Connected device ready for payments"}
              </p>
            </div>

            {/* Status and Disconnect */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-white/80" />
                <span className="text-white font-medium text-base">
                  Connected
                </span>
              </div>
              {onDisconnect && (
                <button
                  onClick={() => {
                    try {
                      onDisconnect();
                    } catch (error) {
                      console.error("Disconnect error:", error);
                      alert("Failed to disconnect properly");
                    }
                  }}
                  className="px-4 py-2 rounded-2xl bg-black border border-white/15 text-white text-sm font-medium hover:bg-white/5"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>

          {/* Available Services */}
          <div className="rounded-2xl border border-white/20 bg-white/5">
            <div className="px-6 py-5 border-b border-white/20">
              <h3 className="font-medium text-white text-lg">
                Available Services
              </h3>
              <p className="text-sm text-white/60 mt-1">Choose your options</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              {options && options.length > 0 ? (
                options.map((opt) => {
                  const selected = selectedOptions.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => toggleOption(opt)}
                      className={`w-full border rounded-2xl p-5 flex items-center justify-between gap-4 transition-colors ${
                        selected
                          ? "border-white/60 bg-white/15"
                          : "border-white/20 bg-white/5 hover:bg-white/8"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            selected ? "bg-white/20" : "bg-white/10"
                          }`}
                        >
                          <span className="text-lg text-white">•</span>
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-base text-white">
                            {opt}
                          </div>
                          <div className="text-sm text-white/60">Service</div>
                        </div>
                      </div>
                      <div className="flex items-end">
                        <div
                          className={`h-8 px-4 rounded-full border flex items-center justify-center ${
                            selected
                              ? "border-white/40 bg-white/20"
                              : "border-white/20 bg-white/10"
                          }`}
                        >
                          <span className="text-sm font-medium text-white">
                            {selected ? "Selected" : "Add"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="border border-white/20 rounded-2xl p-6 text-center">
                  <span className="text-white/60 text-base">
                    No services available
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Custom Text Input */}
          {allowCustomtext && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <label className="block font-medium text-white text-base mb-3">
                Custom Message
              </label>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Add context (optional)"
                rows={3}
                className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-base text-white placeholder-white/40 resize-none focus:outline-none focus:border-white/20"
              />
            </div>
          )}

          {/* Payment Summary */}
          {paymentRequirements && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/60 text-base font-medium">
                  Total Amount
                </span>
                <span className="text-white font-semibold text-xl">
                  {formatDollarsFromMicros(
                    paymentRequirements.maxAmountRequired
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between border border-white/10 rounded-2xl px-4 py-3 bg-white/5">
                <span className="text-white/70 font-medium">Network</span>
                <span className="text-white text-base">
                  {paymentRequirements.network || "Base"}
                </span>
              </div>
              {frequency && (
                <p className="text-sm text-white/50 text-center mt-3">
                  Recurring every {frequency} seconds
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Fixed Payment Button */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-black/80 px-4 py-4">
        <div className="max-w-md mx-auto">
          {!isConnected ? (
            <div className="w-full flex justify-center">
              <div className="w-full">
                <ConnectButton.Custom>
                  {({ openConnectModal, authenticationStatus, mounted }) => {
                    const ready = mounted && authenticationStatus !== "loading";

                    return (
                      <button
                        onClick={openConnectModal}
                        className="w-full h-12 rounded-2xl bg-black border border-white/15 flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
                        disabled={!ready}
                      >
                        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                          <span className="text-white text-xs">⟐</span>
                        </div>
                        <span className="font-semibold text-white text-base">
                          Connect Wallet
                        </span>
                      </button>
                    );
                  }}
                </ConnectButton.Custom>
              </div>
            </div>
          ) : (
            <button
              onClick={handlePayPress}
              className="w-full h-12 rounded-2xl bg-black border border-white/15 flex items-center justify-center gap-2 hover:bg-white/5 transition-colors disabled:opacity-50"
              disabled={waitingToStartAutoPay}
            >
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-white text-xs">▷</span>
              </div>
              <span className="font-semibold text-white text-base">
                {waitingToStartAutoPay ? "Processing..." : payLabel}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeviceWindow;
