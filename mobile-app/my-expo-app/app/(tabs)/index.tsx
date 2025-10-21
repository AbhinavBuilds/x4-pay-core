import { View, Text, Pressable, FlatList, PermissionsAndroid, Platform, Alert } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Buffer } from 'buffer';
import { chunkString } from 'utils/communication-utils';
import { PaymentRequirements } from 'types';
import { buildPaymentRequirements, createPaymentPayload } from 'utils/x402-utils';
import DeviceWindow from '../Device';
import RecurringDialog from '../RecurringDialog';
global.Buffer = global.Buffer || Buffer;

export const SERVICE_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
export const TX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
export const RX_CHAR_UUID = '6e400004-b5a3-f393-e0a9-e50e24dcca9e';

// --- RSSI → distance helpers ---
const DEFAULT_TX_POWER = -40; // beacon “measured power” at 1 m; calibrate this per device if you can

const PRIVATE_KEY = '0xc4398cef5513a0c22257919021ab128d6c7eb3fe2086f692e946267c59ad82c6';
const account = privateKeyToAccount(PRIVATE_KEY);

const wallet = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(),
});
const manager = new BleManager();

export default function Screen() {
  // BLE states
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<Record<string, Device>>({});
  const [connectedId, setConnectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<any>(null);
  const [log, setLog] = useState<string>('Started.\n');

  // Device info states
  const [logo, setLogo] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [allowCustomtext, setAllowCustomtext] = useState<boolean>(false);
  const [showRecurringDialog, setShowRecurringDialog] = useState<boolean>(false);

  // Payment requirements state
  const [paymentRequirements, setPaymentRequirements] = useState<PaymentRequirements | null>(null);

  // User last selections state
  const [userActiveOptions, setUserActiveOptions] = useState<string[]>([]);
  const [userActiveCContext, setUserActiveContext] = useState<string>('');
  const [lastSuccessfullTransaction, setLastSuccessfullTransaction] = useState<string>('');
  const [waitingToStartAutoPay, setWaitingToStartAutoPay] = useState<boolean>(false);
  // Mirror waitingToStartAutoPay into a ref to prevent stale closure in TX monitor
  const waitingToStartAutoPayRef = useRef<boolean>(false);
  useEffect(() => {
    waitingToStartAutoPayRef.current = waitingToStartAutoPay;
  }, [waitingToStartAutoPay]);

  // Track scanning and connection state in refs to avoid stale closures in callbacks
  const scanningRef = useRef<boolean>(false);
  useEffect(() => {
    scanningRef.current = scanning;
  }, [scanning]);
  const connectingRef = useRef<boolean>(false);
  const connectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    connectedIdRef.current = connectedId;
  }, [connectedId]);

  const appendLog = (msg: string) => setLog((prev) => prev + '\n' + msg);

  const scanSubRef = useRef<ReturnType<typeof manager.startDeviceScan> | null>(null);

  const ensureAndroidPerms = useCallback(async () => {
    if (Platform.OS !== 'android') return true;
    const perms = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, // needed on some OS versions
    ];
    const res = await PermissionsAndroid.requestMultiple(perms);
    return Object.values(res).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
  }, []);

  const sendMessage = async (msg: string) => {
    appendLog('Sending....');
    if (!device) appendLog('No device connected.');
    if (!device) return;
    try {
      const services = await device.services();
      const uart = services.find((s: any) => s.uuid === SERVICE_UUID);

      const chars = await uart.characteristics();
      const rx = chars.find((c: any) => c.uuid === RX_CHAR_UUID);

      const base64 = Buffer.from(msg, 'utf-8').toString('base64');
      appendLog('base64: ' + base64);
      await rx.writeWithResponse(base64);
      appendLog('TX -> ' + msg);
    } catch (e) {
      appendLog('Send error: ' + (e as Error).message);
    }
  };

  const subscribeToTX = async (device: any) => {
    if (!device) return;
    const services = await device.services();
    const uart = services.find((s: any) => s.uuid === SERVICE_UUID);
    const chars = await uart.characteristics();
    const tx = chars.find((c: any) => c.uuid === TX_CHAR_UUID);

    tx.monitor((error: any, characteristic: any) => {
      if (error) {
        appendLog('Notif error: ' + error.message);
        return;
      }
      const text = Buffer.from(characteristic?.value ?? '', 'base64').toString('utf-8');
      appendLog('RX <- ' + text);

      // Handle different notification types
      if (text.startsWith('402://')) {
        const {
          network,
          payTo,
          price,
        }: {
          network: string;
          payTo: string;
          price: string;
        } = JSON.parse(text.slice(6));

        appendLog(`Payment Requirements - Network: ${network}, PayTo: ${payTo}, Price: ${price}`);
        const _paymentrequirements = buildPaymentRequirements(network, payTo, price);

        setPaymentRequirements(_paymentrequirements);
      } else if (text.startsWith('LOGO://')) {
        const logoData = text.slice(7);
        setLogo(logoData);
        appendLog('Logo received');
      } else if (text.startsWith('BANNER://')) {
        const bannerData = text.slice(9);
        setBanner(bannerData);
        appendLog('Banner received');
      } else if (text.startsWith('DESC://')) {
        const descData = text.slice(7);
        setDescription(descData);
        appendLog('Description received');
      } else if (text.startsWith('CONFIG://')) {
        const _optionsData = JSON.parse(text.slice(9));
        if (_optionsData.frequency) setFrequency(_optionsData.frequency);
        if (_optionsData.allowCustomContent) setAllowCustomtext(_optionsData.allowCustomContent);
        appendLog('Config received');
      } else if (text.startsWith('OPTIONS://')) {
        const _optionsData = text.slice(10);
        setOptions(_optionsData.split(','));
        appendLog('Options received');
      } else if (text.startsWith('PAYMENT:COMPLETE ')) {
        const _optionsData = text.slice(17);
        // extract VERIFIED:true TX:0xdb07d28fb19dd7e1b5e40d86bd904b939280070dcb01e8e4ffcf0f7302333c13 from +optionsdata
        const [verified, tx] = _optionsData.split(' ');
        appendLog(`Payment verification - ${verified}`);
        if (verified === 'VERIFIED:true') {
          const txHash = tx.split('TX:')[1];
          appendLog(`Transaction successful: ${txHash}`);
          const isAuto = waitingToStartAutoPayRef.current;
          Alert.alert(isAuto ? 'Auto-Payment Successful' : 'false', `${txHash}`);
          if (isAuto) setShowRecurringDialog(true);
        }
      }
    });
  };

  const getPrice = async (options: string[], customizedtext: string) => {
    const completeChunks = `${
      customizedtext.length > 0 ? customizedtext : '""'
    }--${options.length > 0 ? '[' + options.join(',') + ']' : '[]'}`;

    appendLog('completeChunks' + completeChunks);

    const chunks = chunkString(completeChunks, 150);

    if (chunks.length == 1) {
      // divide completechunks string in two halves in two different strings
      const chunk1 = completeChunks.slice(0, Math.ceil(completeChunks.length / 2));
      const chunk2 = completeChunks.slice(Math.ceil(completeChunks.length / 2));
      await sendMessage(`[PRICE]:START${chunk1}`);
      await sendMessage(`[PRICE]:END${chunk2}`);
      return;
    }
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      let data = '';

      if (i == 0) {
        data = `[PRICE]:START${chunk}`;
      } else if (i == chunks.length - 1) {
        data = `[PRICE]:END${chunk}`;
      } else {
        data = `[PRICE]:${chunk}`;
      }
      appendLog('data: ' + data);
      sendMessage(data);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  };

  const handlePayNow = async (
    address: `0x${string}` | undefined,
    options: string[],
    customizedtext: string
  ) => {
    appendLog('handlePayNow called');

    if (!paymentRequirements) {
      appendLog('No payment requirements, getting price...');

      await getPrice(options, customizedtext);
      return;
    }
    try {
      const payload = await createPaymentPayload(address, wallet, paymentRequirements);
      const completeChunks = `${JSON.stringify(payload)}--${
        customizedtext.length > 0 ? customizedtext : '""'
      }--${options.length > 0 ? '[' + options.join(',') + ']' : '[]'}`;

      appendLog('completeChunks' + completeChunks);

      const chunks = chunkString(completeChunks, 150);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        let data = '';

        if (i == 0) {
          data = `X-PAYMENT:START${chunk}`;
        } else if (i == chunks.length - 1) {
          data = `X-PAYMENT:END${chunk}`;
        } else {
          data = `X-PAYMENT${chunk}`;
        }
        sendMessage(data);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setUserActiveContext(customizedtext);
        setUserActiveOptions(options);
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.error('Error creating payment payload:', error);
      appendLog('Payment error: ' + errorMsg);
      Alert.alert('Payment Error', errorMsg);
    }
  };

  const startScan = useCallback(async () => {
    appendLog('Scanning...');
    const ok = await ensureAndroidPerms();
    if (!ok) {
      Alert.alert('Permissions', 'Bluetooth permissions not granted.');
      return;
    }
    if (scanningRef.current) {
      appendLog('Scan already running.');
      return;
    }
    setDevices({});
    setScanning(true);

    scanSubRef.current = manager.startDeviceScan(
      [SERVICE_UUID], // filter for our service
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          setScanning(false);
          Alert.alert('Scan error', error.message);
          return;
        }
        if (!device) return;
        setDevices((prev) => (prev[device.id] ? prev : { ...prev, [device.id]: device }));

        // Auto-connect when device signal is strong (very close)
        if (
          !connectedIdRef.current &&
          !connectingRef.current &&
          typeof device.rssi === 'number' &&
          device.rssi >= DEFAULT_TX_POWER
        ) {
          appendLog(
            `Auto-connecting to nearby device: ${device.name ?? 'Unnamed'} (${device.id}), RSSI: ${device.rssi}`
          );
          connectingRef.current = true;
          connectTo(device)
            .catch((e) => appendLog('Auto-connect error: ' + (e?.message ?? String(e))))
            .finally(() => {
              connectingRef.current = false;
            });
        }
      }
    );
  }, [ensureAndroidPerms]);

  const stopScan = useCallback(() => {
    //@ts-ignore
    scanSubRef.current?.remove?.();
    manager.stopDeviceScan();
    setScanning(false);
  }, []);

  const connectTo = useCallback(
    async (device: Device) => {
      try {
        stopScan();
        const d = await device.connect();
        const ready = await d.discoverAllServicesAndCharacteristics();
        try {
          await device.requestMTU(247); // max practical on many Androids
        } catch {}
        setConnectedId(ready.id);
        appendLog('Connected!');
        // await d.discoverAllServicesAndCharacteristics();
        setDevice(d);
        setDevices({});

        // optional: listen for disconnects
        ready.onDisconnected(() => {
          setConnectedId((curr) => (curr === ready.id ? null : curr));
          setDevice(null);
          // Reset device info states
          setLogo(null);
          setBanner(null);
          setDescription(null);
          setFrequency(null);
          setOptions([]);
          setAllowCustomtext(false);
          setPaymentRequirements(null);
          // Resume scanning after disconnect
          startScan();
        });
      } catch (e: any) {
        Alert.alert('Connect error', e?.message ?? String(e));
      }
    },
    [stopScan, startScan]
  );

  const disconnectDevice = useCallback(async () => {
    if (device) {
      try {
        await device.cancelConnection();
        setConnectedId(null);
        setDevice(null);
        // Reset device info states
        setLogo(null);
        setBanner(null);
        setDescription(null);
        setFrequency(null);
        setOptions([]);
        setAllowCustomtext(false);
        setPaymentRequirements(null);
        appendLog('Disconnected');
        // Resume scanning after manual disconnect
        startScan();
      } catch (e: any) {
        appendLog('Disconnect error: ' + (e?.message ?? String(e)));
      }
    }
  }, [device, startScan]);

  const fetchAllData = async () => {
    await sendMessage('[LOGO]');
    await sendMessage('[BANNER]');
    await sendMessage('[DESC]');
    await sendMessage('[CONFIG]');
    await sendMessage('[OPTIONS]');
  };

  // Start scanning once on mount
  useEffect(() => {
    startScan();
  }, []);

  useEffect(() => {
    subscribeToTX(device);
    fetchAllData();
    return () => {
      // Cleanup if needed
    };
  }, [device]);

  useEffect(() => {
    return () => {
      // Only stop scanning on unmount; keep manager alive for future mounts.
      stopScan();
    };
  }, [stopScan]);

  // When this screen gains focus, ensure scanning restarts if we're not connected
  useFocusEffect(
    React.useCallback(() => {
      if (!connectedIdRef.current && !scanningRef.current) {
        startScan();
      }
      return () => {
        // no-op on blur; we keep scanning policy as-is
      };
    }, [startScan])
  );

  const list = useMemo(() => Object.values(devices), [devices]);

  // If connected to a device, show the Device window
  if (connectedId && device) {
    return (
      <>
        <DeviceWindow
          address={account.address}
          deviceName={device.name ?? 'Unknown Device'}
          banner={banner}
          logo={logo}
          description={description}
          handlePayNow={handlePayNow}
          frequency={frequency ? parseInt(frequency) : null}
          allowCustomtext={allowCustomtext}
          options={options}
          paymentRequirements={paymentRequirements}
          getPrice={getPrice}
          setWaitingToStartAutoPay={setWaitingToStartAutoPay}
          waitingToStartAutoPay={waitingToStartAutoPay}
          onDisconnect={disconnectDevice}
        />

        {showRecurringDialog && paymentRequirements && frequency && (
          <RecurringDialog
            address={account.address}
            frequency={parseInt(frequency)}
            price={paymentRequirements.maxAmountRequired}
            userActiveContext={userActiveCContext}
            userActiveOptions={userActiveOptions}
            lastSuccessfullTransaction={lastSuccessfullTransaction}
            handlePay={handlePayNow}
            onCancel={() => {
              setShowRecurringDialog(false);
              setWaitingToStartAutoPay(false);
            }}
          />
        )}
      </>
    );
  }

  // Otherwise, show the scan screen
  return (
    <View className="flex-1 bg-black px-4 pt-20">
      <View className="mb-6 items-center">
        <Text className="text-3xl font-bold text-white">x402-BLE Scanner </Text>
      </View>
      <View className="flex-1 items-center justify-center ">
        <Text className=" text-center text-2xl text-blue-400">
          {connectedId ? `Connected: ${connectedId}` : 'Tap the device\nOR'}
        </Text>

        <View className="mb-4 mt-6 flex-row justify-center">
          <Pressable
            onPress={scanning ? stopScan : startScan}
            className={`flex h-[100px] w-[100px] items-center justify-center rounded-full px-5 py-3 ${scanning ? 'bg-red-600' : 'bg-blue-600'}`}>
            <Text className="text-2xl font-semibold  text-white">{scanning ? 'STOP' : 'SCAN'}</Text>
          </Pressable>
        </View>
        {scanning && (
          <FlatList
            data={list}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <View className="h-[1px] bg-neutral-800" />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => connectTo(item)}
                className="px-4 py-3 active:bg-neutral-900">
                <Text className="text-base text-white">
                  {item.name ?? 'Unnamed'} <Text className="text-neutral-400">({item.id})</Text>
                </Text>
                <Text className="mt-1 text-xs text-neutral-400">RSSI: {item.rssi ?? 'N/A'}</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <View className="mt-12 items-center">
                <Text className="text-neutral-500">
                  {scanning ? 'Scanning…' : 'No devices yet.'}
                </Text>
                {/* <Text className="w-full bg-blue-400 text-white">{log}</Text> */}
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}
