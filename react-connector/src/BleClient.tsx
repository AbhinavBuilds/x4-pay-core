import React, { useCallback, useEffect, useRef, useState } from "react";

const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const TX_CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // Notify

type GattStuff = {
  device?: any;
  server?: any;
  txChar?: any;
};

export default function BleClient() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [status, setStatus] = useState("disconnected");
  const gatt = useRef<GattStuff>({});

  const append = (line: string) =>
    setMessages((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`]);

  const handleNotify = useCallback((event: Event) => {
    const target = event.target as any;
    const value = target.value;
    if (!value) return;
    const text = new TextDecoder().decode(value);
    append(text);
  }, []);

  const connect = useCallback(async () => {
    try {
      setStatus("requesting device…");
      const device = await navigator.bluetooth.requestDevice({
        // your device name starts with "Autodiscovery" or whatever you set—filters reduce the chooser noise
        filters: [{ services: [SERVICE_UUID] }],
        optionalServices: [SERVICE_UUID],
      });

      device.addEventListener("gattserverdisconnected", () => {
        setConnected(false);
        setStatus("disconnected");
        append("Disconnected");
      });

      setStatus("connecting…");
      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      const txChar = await service.getCharacteristic(TX_CHAR_UUID);

      await txChar.startNotifications();
      txChar.addEventListener("characteristicvaluechanged", handleNotify);

      gatt.current = { device, server, txChar };
      setConnected(true);
      setStatus(`connected: ${device.name ?? "device"}`);
      append("Notifications started");
    } catch (err: any) {
      setStatus("error");
      append(`Error: ${err?.message ?? String(err)}`);
      console.error(err);
    }
  }, [handleNotify]);

  const disconnect = useCallback(() => {
    try {
      const dev = gatt.current.device;
      if (dev?.gatt?.connected) {
        dev.gatt.disconnect();
      }
      gatt.current = {};
      setConnected(false);
      setStatus("disconnected");
      append("Disconnected");
    } catch (e) {
      append("Disconnect error");
    }
  }, []);

  // Optional: autoscroll messages
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const supported = "bluetooth" in navigator;

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">X402 BLE Client</h1>
        <span
          className={`text-sm px-2 py-1 rounded ${
            connected ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {status}
        </span>
      </div>

      {!supported && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          Your browser doesn’t support Web Bluetooth. Try Chrome/Edge/Brave on desktop or Android.
        </div>
      )}

      <div className="flex gap-3 mb-5">
        <button
          className="rounded-xl px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          onClick={connect}
          disabled={!supported || connected}
        >
          Connect
        </button>
        <button
          className="rounded-xl px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
          onClick={disconnect}
          disabled={!connected}
        >
          Disconnect
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200">
        <div className="px-4 py-2 border-b text-sm text-gray-600">Notifications</div>
        <div ref={logRef} className="p-4 h-60 overflow-y-auto text-sm space-y-1">
          {messages.length === 0 ? (
            <div className="text-gray-400">No data yet… click “Connect”.</div>
          ) : (
            messages.map((m, i) => <div key={i} className="font-mono break-words">{m}</div>)
          )}
        </div>
      </div>
    </div>
  );
}
