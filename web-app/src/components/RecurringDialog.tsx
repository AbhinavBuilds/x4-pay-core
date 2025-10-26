import { useEffect, useState } from "react";

type HandlePayWithKey = (
  address: `0x${string}` | undefined,
  options: string[],
  customizedtext: string,
  privateKey: string
) => void;

const RecurringDialog = ({
  address,
  frequency,
  price,
  userActiveContext,
  userActiveOptions,
  lastSuccessfullTransaction,
  handlePay,
  onCancel,
  privateKey,
}: {
  address: `0x${string}`;
  frequency: number;
  price: string;
  userActiveContext: string;
  userActiveOptions: string[];
  lastSuccessfullTransaction: string | null;
  handlePay: HandlePayWithKey;
  onCancel: () => void;
  sessionId: string;
  privateKey: string;
}) => {
  const [countdown, setCountdown] = useState(frequency);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      setCountdown((prev) => {
        const next = prev <= 1 ? frequency : prev - 1;
        return next;
      });
      // Use latest countdown from state by reading after a small microtask
      // to avoid using stale value in closure.
      Promise.resolve().then(async () => {
        if (!cancelled) {
          // If the next tick would wrap to frequency, trigger payment now.
          if (countdown <= 1) {
            try {
              await handlePay(address, userActiveOptions, userActiveContext, privateKey);
            } catch (e) {
              // swallow; parent already shows alerts/logs
            }
          }
        }
      });
    };

    const timer = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [frequency, userActiveOptions, userActiveContext, handlePay, countdown, privateKey, address]);

  const handleCancel = async () => {
    // Clean up stored private key when canceling
    // Note: clearRecurringPrivateKey is not available in web version
    // This would need to be implemented or handled by the parent
    onCancel();
  };

  const formatDollarsFromMicros = (amountStr: string) => {
    try {
      const micros = BigInt(amountStr);
      const ONE_DOLLAR = 1_000_000n;
      const ONE_CENT_IN_MICROS = 10_000n;
      let dollars = micros / ONE_DOLLAR;
      let cents = (micros % ONE_DOLLAR + ONE_CENT_IN_MICROS / 2n) / ONE_CENT_IN_MICROS;
      if (cents === 100n) {
        dollars += 1n;
        cents = 0n;
      }
      if (cents === 0n) return `$${dollars.toString()}`;
      const centsStr = cents.toString().padStart(2, '0');
      return `$${dollars.toString()}.${centsStr}`;
    } catch {
      return `$${amountStr}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/20 bg-black p-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-center text-2xl font-light text-white tracking-tight mb-3">
            Recurring Payment Active
          </h2>
          <p className="text-center text-base text-white/60">
            Auto-payment every {frequency} seconds
          </p>
        </div>

        {/* Payment Info */}
        <div className="rounded-2xl border border-white/20 bg-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base text-white/60 font-medium">Amount</span>
            <span className="font-medium text-white text-lg">
              {formatDollarsFromMicros(price)}
            </span>
          </div>

          {userActiveOptions.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-base text-white/60 font-medium">Options</span>
              <span className="text-base text-white">
                {userActiveOptions.join(', ')}
              </span>
            </div>
          )}

          {!!userActiveContext && (
            <div className="mb-4">
              <p className="text-base text-white/60 font-medium mb-2">Context</p>
              <p className="text-base text-white">{userActiveContext}</p>
            </div>
          )}

          {!!lastSuccessfullTransaction && (
            <div>
              <p className="text-base text-white/60 font-medium mb-2">Last Transaction</p>
              <p className="break-all text-sm text-white/80 font-mono">
                {lastSuccessfullTransaction}
              </p>
            </div>
          )}
        </div>

        {/* Countdown */}
        <div className="mb-8 mt-8">
          <p className="text-center text-6xl font-light text-white tracking-tight mb-3">
            {countdown}
          </p>
          <p className="text-center text-base text-white/60">
            seconds until next payment
          </p>
        </div>

        {/* Cancel Button */}
        <button 
          onClick={handleCancel} 
          className="w-full rounded-2xl bg-white/10 border border-white/20 py-5 hover:bg-white/15 transition-colors"
        >
          <span className="text-center font-medium text-white text-lg">
            Cancel Auto-Pay
          </span>
        </button>
      </div>
    </div>
  );
};

export default RecurringDialog;
