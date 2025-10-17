import { useEffect, useRef, useState } from "react";
import { RX_CHAR_UUID, SERVICE_UUID, TX_CHAR_UUID } from "./constants";
import DeviceWindow from "./components/DeviceWindow";
import type { GattRefs, PaymentRequirements } from "./types";
import {
  buildPaymentRequirements,
  createPaymentPayload,
} from "./utils/x402-utils";
import { useWalletClient } from "wagmi";

function App() {
  const { data: walletClient } = useWalletClient();

  const [activeWindow, setActiveWindow] = useState<"home" | "device">("home");
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [paymentRequirements, setPaymentRequirements] =
    useState<PaymentRequirements | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [allowCustomtext, setAllowCustomtext] = useState<boolean>(false);

  const g = useRef<GattRefs>({});

  const handlePayNow = async (address: `0x${string}` | undefined) => {
    if (!paymentRequirements) {
      alert("Payment requirements not set.");
      return;
    }
    try {
      const payload = await createPaymentPayload(
        address,
        walletClient,
        paymentRequirements
      );
      console.log("Payment Payload:", payload);
    } catch (error) {
      console.error("Error creating payment payload:", error);
      alert("Failed to create payment payload. Check console for details.");
    }
  };

  const onNotification = (event: any) => {
    const value = event.target.value;
    const decoder = new TextDecoder("utf-8");
    const text = decoder.decode(value);
    if (text.startsWith("402://")) {
      const {
        network,
        payTo,
        price,
      }: {
        network: string;
        payTo: string;
        price: string;
      } = JSON.parse(text.slice(6));
      console.log({ network, payTo, price });
      const _paymentrequirements = buildPaymentRequirements(
        network,
        payTo,
        price
      );
      console.log(_paymentrequirements);
      setPaymentRequirements(_paymentrequirements);
    } else if (text.startsWith("LOGO://")) {
      const logoData = text.slice(7);
      setLogo(logoData);
    } else if (text.startsWith("BANNER://")) {
      const bannerData = text.slice(9);
      setBanner(bannerData);
    } else if (text.startsWith("DESC://")) {
      const descData = text.slice(7);
      setDescription(descData);
    } else if (text.startsWith("CONFIG://")) {
      console.log("_optionsData", text);
      const _optionsData = JSON.parse(text.slice(9));
      if (_optionsData.frequency) setFrequency(_optionsData.frequency);
      if (_optionsData.allowCustomtext)
        setAllowCustomtext(_optionsData.allowCustomtext);
    } else if (text.startsWith("OPTIONS://")) {
      const _optionsData = text.slice(10);
      setOptions(_optionsData.split(","));
    }
  };

  const handleScanClick = async () => {
    try {
      if (!navigator.bluetooth) {
        alert("Web Bluetooth API is not available in this browser.");
        return;
      }
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
        optionalServices: [SERVICE_UUID],
      });

      device.addEventListener("gattserverdisconnected", () => {
        setConnected(false);
        g.current = {};
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      const rx = await service.getCharacteristic(RX_CHAR_UUID);
      const tx = await service.getCharacteristic(TX_CHAR_UUID);

      await tx.startNotifications();
      tx.addEventListener("characteristicvaluechanged", onNotification);

      g.current = { device, server, rx, tx };
      setDeviceName(device.name || "Unknown Device");
      setConnected(true);
      setActiveWindow("device");
    } catch (error) {
      console.error("Error during Bluetooth scan:", error);
    }
  };

  const sendData = async (data: string) => {
    try {
      if (!g.current.rx) {
        console.error("RX characteristic not available.");
        return;
      }
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(data);
      await g.current.rx.writeValue(encodedData);
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error("Error sending data:", error);
    }
  };

  const fetchAllData = async () => {
    await sendData("x");
    await sendData("[LOGO]");
    await sendData("[BANNER]");
    await sendData("[DESC]");
    await sendData("[CONFIG]");
    await sendData("[OPTIONS]");
  };

  useEffect(() => {
    if (connected) fetchAllData();
  }, [connected]);

  if (activeWindow === "device" && connected) {
    return (
      <DeviceWindow
        deviceName={deviceName ?? "Unknown Device"}
        banner={banner}
        logo={logo}
        description={description}
        handlePayNow={handlePayNow}
        frequency={frequency ? parseInt(frequency) : null}
        allowCustomtext={true}
        options={options}
        paymentRequirements={paymentRequirements}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-8 max-w-md w-full">
        <h1 className="text-4xl font-bold text-white mb-2">BluePay</h1>
        <p className="text-blue-400 text-sm mb-8">Connect to device</p>
        <button
          onClick={handleScanClick}
          className="w-24 h-24 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-full flex items-center justify-center text-white text-lg font-semibold transition-colors mx-auto"
        >
          SCAN
        </button>
      </div>
    </div>
  );
}

export default App;
