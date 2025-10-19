import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

const RecurringDialog = ({
  frequency,
  price,
  userActiveContext,
  userActiveOptions,
  lastSuccessfullTransaction,
  handlePay,
  onCancel,
}: {
  frequency: number;
  price: string;
  userActiveContext: string;
  userActiveOptions: string[];
  lastSuccessfullTransaction: string;
  handlePay: (
    address: `0x${string}` | undefined,
    options: string[],
    customizedtext: string
  ) => void;
  onCancel: () => void;
}) => {
  const { address } = useAccount();
  const [countdown, setCountdown] = useState(frequency);


  useEffect(() => {
    let cancelled = false;
    let timer: NodeJS.Timeout | null = null;

    const tick = async () => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return frequency;
        }
        return prev - 1;
      });
      // Wait for countdown to reach 1
      if (countdown <= 1 && !cancelled) {
        await handlePay(address, userActiveOptions, userActiveContext);
      }
    };

    timer = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [frequency, address, userActiveOptions, userActiveContext, handlePay, countdown]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-gray-900 border border-blue-900/50 rounded-lg max-w-md w-full p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">
            Recurring Payment Active
          </h2>
          <p className="text-blue-400 text-sm">
            Auto-payment every {frequency} seconds
          </p>
        </div>

        {/* Payment Info */}
        <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Amount</span>
            <span className="text-white font-semibold">
              {formatDollarsFromMicros(price)}
            </span>
          </div>

          {userActiveOptions.length > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Options</span>
              <span className="text-white text-sm">
                {userActiveOptions.join(", ")}
              </span>
            </div>
          )}

          {userActiveContext && (
            <div className="space-y-1">
              <span className="text-gray-400 text-sm">Context</span>
              <p className="text-white text-sm">{userActiveContext}</p>
            </div>
          )}

          {lastSuccessfullTransaction && (
            <div className="space-y-1">
              <span className="text-gray-400 text-sm">Last Transaction</span>
              <p className="text-blue-400 text-xs break-all">{lastSuccessfullTransaction}</p>
            </div>
          )}
        </div>

        {/* Countdown */}
        <div className="text-center space-y-2">
          <div className="text-6xl font-bold text-blue-500">{countdown}</div>
          <p className="text-gray-400 text-sm">seconds until next payment</p>
        </div>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-4 rounded-lg transition-colors"
        >
          Cancel Auto-Pay
        </button>
      </div>
    </div>
  );
};

export default RecurringDialog;
