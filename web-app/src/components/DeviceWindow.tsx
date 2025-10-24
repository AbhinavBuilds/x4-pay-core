import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import type { PaymentRequirements } from "../types";

const DeviceWindow = ({
  deviceName,
  logo,
  banner,
  description,
  handlePayNow,
  frequency,
  allowCustomtext,
  options,
  paymentRequirements,
  getPrice,
}: {
  deviceName: string;
  logo: string | null;
  banner: string | null;
  description: string | null;
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
}) => {
  
  const { address, isConnected } = useAccount();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [customText, setCustomText] = useState<string>("");

  const getPriceWithDelay = async () => {
    // delay of 1 seconds
    await new Promise((resolve) => setTimeout(resolve, 10));
    getPrice(selectedOptions, customText);
  };

  useEffect(() => {
    getPriceWithDelay()
  }, [selectedOptions, customText]);

  const formatDollarsFromMicros = (amountStr: string) => {
    try {
      const micros = BigInt(amountStr);
      const ONE_DOLLAR = 1_000_000n; // 6 decimals
      const ONE_CENT_IN_MICROS = 10_000n;

      let dollars = micros / ONE_DOLLAR;
      let cents = (micros % ONE_DOLLAR + ONE_CENT_IN_MICROS / 2n) / ONE_CENT_IN_MICROS; // round to nearest cent

      if (cents === 100n) {
        dollars += 1n;
        cents = 0n;
      }

      if (cents === 0n) return `$${dollars.toString()}`;
      const centsStr = cents.toString().padStart(2, "0");
      return `$${dollars.toString()}.${centsStr}`;
    } catch {
      return `$${amountStr}`; // fallback
    }
  };

  const payLabel = paymentRequirements?.maxAmountRequired
    ? `Pay ${formatDollarsFromMicros(paymentRequirements.maxAmountRequired)}${
        frequency ? ` / ${frequency} sec` : ""
      }`
    : "Pay Now";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Banner */}
      {banner && (
        <div className="w-full h-48 bg-gradient-to-b from-blue-900/20 to-transparent">
          <img
            src={banner}
            alt="Banner"
            className="w-full h-full object-cover opacity-60"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 pb-28">
        {/* Logo & Device Name */}
        <div className="flex items-center space-x-4">
          {logo && (
            <img
              src={logo}
              alt="Logo"
              className="w-16 h-16 rounded-lg border border-blue-600"
            />
          )}
          <div>
            <h2 className="text-2xl font-bold">{deviceName}</h2>
            <div className="flex items-center mt-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-blue-400 text-sm">Connected</span>
            </div>
          </div>
        </div>

        {/* Description */}
        {description && (
          <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-4">
            <p className="text-gray-300 text-sm leading-relaxed">
              {description}
            </p>
          </div>
        )}

        {/* Custom Text (when allowed) */}
        {allowCustomtext && (
          <div className="space-y-2">
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Add context (optional)"
              rows={3}
              className="w-full bg-transparent border border-blue-900/50 rounded-md text-blue-100 placeholder-blue-400/50 p-3 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
        )}

        {/* Options (single-select, vertical scroll) */}
        {options && options.length > 0 && (
          <div className="space-y-2">
            <div className="max-h-56 overflow-y-auto pr-1 space-y-2">
              {options.map((opt) => {
                const selected = selectedOptions.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      setSelectedOptions((prev) =>
                        prev.includes(opt)
                          ? prev.filter((o) => o !== opt)
                          : [...prev, opt]
                      )
                    }
                    className={
                      `w-full text-left px-3 py-3 rounded-md text-sm border transition-colors ` +
                      (selected
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-blue-800 text-blue-300 hover:border-blue-600")
                    }
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Fixed Action */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-blue-900/50 bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-black/80">
        <div className="max-w-md mx-auto px-6 py-4">
          {!isConnected ? (
            <div className="w-full flex justify-center">
              <ConnectButton />
            </div>
          ) : (
            <button
              onClick={() => handlePayNow(address, selectedOptions, customText)}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-4 rounded-lg transition-colors"
            >
              {payLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeviceWindow;
