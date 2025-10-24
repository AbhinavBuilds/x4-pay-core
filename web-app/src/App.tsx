import { useEffect, useRef, useState } from "react";
import { RX_CHAR_UUID, SERVICE_UUID, TX_CHAR_UUID } from "./constants";
import DeviceWindow from "./components/DeviceWindow";
import RecurringDialog from "./components/RecurringDialog";
import type { GattRefs, PaymentRequirements } from "./types";
import {
  buildPaymentRequirements,
  createPaymentPayload,
} from "./utils/x402-utils";
import { useWalletClient } from "wagmi";
import { chunkString } from "./utils/communication-utils";

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
  const [showRecurringDialog, setShowRecurringDialog] =
    useState<boolean>(false);
  const [userActiveOptions, setUserActiveOptions] = useState<string[]>([]);
  const [userActiveCContext, setUserActiveContext] = useState<string>("");
  const [lastSuccessfullTransaction, setLastSuccessfullTransaction] =
    useState<string>("");

  const g = useRef<GattRefs>({});

  // DONE in movile
  const onNotification = (event: any) => {
    const value = event.target.value;
    const decoder = new TextDecoder("utf-8");
    const text = decoder.decode(value);
    console.log("Received Notification:", text);
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
      const _paymentrequirements = buildPaymentRequirements(
        network,
        payTo,
        price
      );

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
      const _optionsData = JSON.parse(text.slice(9));
      if (_optionsData.frequency) setFrequency(_optionsData.frequency);
      if (_optionsData.allowCustomContent)
        setAllowCustomtext(_optionsData.allowCustomContent);
    } else if (text.startsWith("OPTIONS://")) {
      const _optionsData = text.slice(10);
      setOptions(_optionsData.split(","));
    } else if (text.startsWith("PAYMENT:COMPLETE ")) {
      const _optionsData = text.slice(17);
      // extract VERIFIED:true TX:0xdb07d28fb19dd7e1b5e40d86bd904b939280070dcb01e8e4ffcf0f7302333c13 from +optionsdata
      const [verified, tx] = _optionsData.split(" ");
      console.log("verified", verified);
      if (verified === "VERIFIED:true") {
        setLastSuccessfullTransaction(tx.split("TX:")[1]);
        setShowRecurringDialog(true);
      }
    }
  };

  // DONE in movile
  const getPrice = async (options: string[], customizedtext: string) => {
    const completeChunks = `${
      customizedtext.length > 0 ? customizedtext : '""'
    }--${options.length > 0 ? "[" + options.join(",") + "]" : "[]"}`;

    console.log("completeChunks", completeChunks);

    const chunks = chunkString(completeChunks, 150);

    if (chunks.length == 1) {
      // divide completechunks string in two halves in two different strings
      const chunk1 = completeChunks.slice(
        0,
        Math.ceil(completeChunks.length / 2)
      );
      const chunk2 = completeChunks.slice(Math.ceil(completeChunks.length / 2));
      await sendData(`[PRICE]:START${chunk1}`);
      await sendData(`[PRICE]:END${chunk2}`);
      return;
    }
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      let data = "";

      if (i == 0) {
        data = `[PRICE]:START${chunk}`;
      } else if (i == chunks.length - 1) {
        data = `[PRICE]:END${chunk}`;
      } else {
        data = `[PRICE]:${chunk}`;
      }
      console.log("data", data);
      sendData(data);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  };

  // DONE in movile
  const handlePayNow = async (
    address: `0x${string}` | undefined,
    options: string[],
    customizedtext: string
  ) => {
    if (!paymentRequirements) {
      await getPrice(options, customizedtext);
      return;
    }
    try {
      const payload = await createPaymentPayload(
        address,
        walletClient,
        paymentRequirements
      );
      const completeChunks = `${JSON.stringify(payload)}--${
        customizedtext.length > 0 ? customizedtext : '""'
      }--${options.length > 0 ? "[" + options.join(",") + "]" : "[]"}`;

      console.log("completeChunks", completeChunks);

      const chunks = chunkString(completeChunks, 150);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        let data = "";

        if (i == 0) {
          data = `X-PAYMENT:START${chunk}`;
        } else if (i == chunks.length - 1) {
          data = `X-PAYMENT:END${chunk}`;
        } else {
          data = `X-PAYMENT${chunk}`;
        }
        sendData(data);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setUserActiveContext(customizedtext);
        setUserActiveOptions(options);
      }
    } catch (error) {
      console.error("Error creating payment payload:", error);
    }
  };

  // DONE in movile
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

  // DONE in movile
  const sendData = async (data: string) => {
    try {
      if (!g.current.rx) {
        console.error("RX characteristic not available.");
        return;
      }
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(data);
      console.log("Sending Data:", data);
      await g.current.rx.writeValue(encodedData);
      await new Promise((resolve) => setTimeout(resolve, 10));
    } catch (error) {
      console.error("Error sending data:", error);
    }
  };

  // DONE in movile
  const fetchAllData = async () => {
    // await sendData("x");
    await sendData("[LOGO]");
    await sendData("[BANNER]");
    await sendData("[DESC]");
    await sendData("[CONFIG]");
    await sendData("[OPTIONS]");
  };

  // DONE in movile
  useEffect(() => {
    if (connected) fetchAllData();
  }, [connected]);

  if (activeWindow === "device" && connected) {
    return (
      <>
        <DeviceWindow
          deviceName={deviceName ?? "Unknown Device"}
          banner={banner}
          logo={logo}
          description={description}
          handlePayNow={handlePayNow}
          frequency={frequency ? parseInt(frequency) : null}
          allowCustomtext={allowCustomtext}
          options={options}
          paymentRequirements={paymentRequirements}
          getPrice={getPrice}
        />
        {showRecurringDialog && paymentRequirements && frequency && (
          <RecurringDialog
            frequency={parseInt(frequency)}
            price={paymentRequirements.maxAmountRequired}
            userActiveContext={userActiveCContext}
            userActiveOptions={userActiveOptions}
            lastSuccessfullTransaction={lastSuccessfullTransaction}
            handlePay={handlePayNow}
            onCancel={() => setShowRecurringDialog(false)}
          />
        )}
      </>
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
