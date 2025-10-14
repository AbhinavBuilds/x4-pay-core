import React, { useCallback, useEffect, useRef, useState } from "react";

const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const RX_CHAR_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // Write
const TX_CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // Notify

type Gatt = {
  device?: BluetoothDevice;
  server?: BluetoothRemoteGATTServer;
  rx?: BluetoothRemoteGATTCharacteristic;
  tx?: BluetoothRemoteGATTCharacteristic;
};

export default function BleClient() {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("disconnected");
  const [log, setLog] = useState<string[]>([]);
  const [outgoing, setOutgoing] = useState("");
  const gatt = useRef<Gatt>({});

  const append = (line: string) =>
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`]);

  const onNotify = useCallback((event: Event) => {
    const ch = event.target as BluetoothRemoteGATTCharacteristic;
    const value = ch.value;
    if (!value) return;
    const text = new TextDecoder().decode(value);
    append(`RX<-TX: ${text}`);
  }, []);

  const connect = useCallback(async () => {
    try {
      setStatus("requesting device…");
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: "X402" }],        // or use { services: [SERVICE_UUID] }
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
      const rx = await service.getCharacteristic(RX_CHAR_UUID);
      const tx = await service.getCharacteristic(TX_CHAR_UUID);

      await tx.startNotifications();
      tx.addEventListener("characteristicvaluechanged", onNotify);

      gatt.current = { device, server, rx, tx };
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
      const dev = gatt.current.device;
      if (dev?.gatt?.connected) dev.gatt.disconnect();
      gatt.current = {};
      setConnected(false);
      setStatus("disconnected");
      append("Disconnected");
    } catch (e) {
      append("Disconnect error");
    }
  }, []);

  const send = useCallback(async () => {
    if (!gatt.current.rx) {
      append("Cannot send: RX characteristic not ready");
      return;
    }
    const data = new TextEncoder().encode(outgoing);
    try {
      await gatt.current.rx.writeValue(data);
      append(`TX->RX: ${outgoing}`);
      setOutgoing("");
    } catch (e: any) {
      append(`Send error: ${e?.message ?? String(e)}`);
    }
  }, [outgoing]);

  // autoscroll log
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [log]);

  const supported = "bluetooth" in navigator;

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">X402 BLE Client</h1>
        <span className={`text-sm px-2 py-1 rounded ${connected ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
          {status}
        </span>
      </div>

      {!supported && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          Web Bluetooth not supported. Try Chrome/Edge/Brave.
        </div>
      )}

      <div className="flex gap-3 mb-5">
        <button className="rounded-xl px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                onClick={connect} disabled={!supported || connected}>
          Connect
        </button>
        <button className="rounded-xl px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                onClick={disconnect} disabled={!connected}>
          Disconnect
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
          placeholder="Type a request…"
          value={outgoing}
          onChange={(e) => setOutgoing(e.target.value)}
          disabled={!connected}
        />
        <button className="rounded-xl px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                onClick={send} disabled={!connected || outgoing.length === 0}>
          Send
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200">
        <div className="px-4 py-2 border-b text-sm text-gray-600">Log</div>
        <div ref={logRef} className="p-4 h-60 overflow-y-auto text-sm space-y-1">
          {log.length === 0 ? (
            <div className="text-gray-400">No data yet…</div>
          ) : (
            log.map((m, i) => <div key={i} className="font-mono break-words">{m}</div>)
          )}
        </div>
      </div>
    </div>
  );
}
