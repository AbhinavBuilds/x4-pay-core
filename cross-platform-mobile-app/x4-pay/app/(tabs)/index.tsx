import {
  View,
  Text,
  Pressable,
  PermissionsAndroid,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BleManager, Device } from 'react-native-ble-plx';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, base } from 'viem/chains';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { Buffer } from 'buffer';
import { chunkString } from 'utils/communication-utils';
import { PaymentRequirements } from 'types';
import { buildPaymentRequirements, createPaymentPayload } from 'utils/x402-utils';
import DeviceWindow from '../Device';
import RecurringDialog from '../RecurringDialog';
import { Header } from '../../components/Header';
import { PinSetupModal } from '../../components/PinSetup';
import { WelcomeScreen } from '../../components/WelcomeScreen';
import { TermsAndPrivacy } from '../../components/TermsAndPrivacy';
import {  useCustomAlert } from '../../components/CustomAlert';
import {
  getActiveWallet,
  getWalletPrivateKey,
  storeRecurringPrivateKey,
  clearRecurringPrivateKey,
  validatePin,
  isFirstAppLaunch,
  markFirstLaunchComplete,
  hasAcceptedTerms,
  markTermsAccepted,
} from 'utils/pin-utils';
global.Buffer = global.Buffer || Buffer;

// Black and white icons
const ScanIcon = ({ size = 16 }: { size?: number }) => (
  <View style={{ width: size, height: size }} className="items-center justify-center">
    <Text style={{ fontSize: size * 0.9, color: 'currentColor' }}>⊕</Text>
  </View>
);

const DeviceIcon = ({ size = 20 }: { size?: number }) => (
  <View style={{ width: size, height: size }} className="items-center justify-center">
    <Text style={{ fontSize: size * 0.8, color: 'currentColor' }}>▷</Text>
  </View>
);

// Signal strength component - Apple-inspired refined bars
const SignalBars = ({ strength = 4 }) => (
  <View className="flex-row items-end gap-1">
    {[1, 2, 3, 4].map((bar) => (
      <View
        key={bar}
        className={`w-1.5 rounded-full transition-all duration-300 ${
          bar <= strength ? 'bg-white shadow-sm' : 'bg-white/20'
        }`}
        style={{
          height: bar * 3 + 6,
          shadowColor: '#ffffff',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: bar <= strength ? 0.3 : 0,
          shadowRadius: 2,
        }}
      />
    ))}
  </View>
);

export const SERVICE_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
export const TX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
export const RX_CHAR_UUID = '6e400004-b5a3-f393-e0a9-e50e24dcca9e';

// --- RSSI → distance helpers ---
const DEFAULT_TX_POWER = -40; // beacon “measured power” at 1 m; calibrate this per device if you can

// const PRIVATE_KEY = '0xc4398cef5513a0c22257919021ab128d6c7eb3fe2086f692e946267c59ad82c6';
// const account = privateKeyToAccount(PRIVATE_KEY);

// const wallet = createWalletClient({
//   account,
//   chain: baseSepolia,
//   transport: http(),
// });
const manager = new BleManager();

export default function Screen() {
  // Custom Alert Hook
  const { showAlert, AlertComponent } = useCustomAlert();

  // BLE states
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<Record<string, Device>>({});
  const [connectedId, setConnectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<any>(null);
  const [log, setLog] = useState<string>('Started.\n');

  // Animation for scanning icon
  const spinValue = useRef(new Animated.Value(0)).current;

  // Start/stop spin animation based on scanning state
  useEffect(() => {
    if (scanning) {
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();
      return () => {
        spinAnimation.stop();
        spinValue.setValue(0);
      };
    } else {
      spinValue.setValue(0);
    }
  }, [scanning, spinValue]);

  // Create the spin interpolation once
  const spinInterpolation = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
  const [lastSuccessfullTransaction, setLastSuccessfullTransaction] = useState<string | null>(null);
  const [lastTransactionStatus, setLastTransactionStatus] = useState<
    'NOT-STARTED' | 'FAILED' | 'SUCCESS' | 'STARTED'
  >('NOT-STARTED');
  const [waitingToStartAutoPay, setWaitingToStartAutoPay] = useState<boolean>(false);
  
  // Create stable callback to prevent re-renders in child components
  const handleSetWaitingToStartAutoPay = useCallback((waiting: boolean) => {
    setWaitingToStartAutoPay(waiting);
  }, []);
  
  const [showPinVerify, setShowPinVerify] = useState<boolean>(false);
  const [showWelcome, setShowWelcome] = useState<boolean>(false);
  const [showTerms, setShowTerms] = useState<boolean>(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<{
    address: `0x${string}` | undefined;
    options: string[];
    customizedtext: string;
  } | null>(null);

  // Recurring payment session state
  const [recurringSessionId, setRecurringSessionId] = useState<string | null>(null);
  const [recurringPrivateKey, setRecurringPrivateKey] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null);

  // Check for first app launch
  useEffect(() => {
    const checkFirstLaunch = async () => {
      const isFirst = await isFirstAppLaunch();
      if (isFirst) {
        setShowWelcome(true);
      } else {
        // If not first launch, check if terms were accepted
        const termsAccepted = await hasAcceptedTerms();
        if (!termsAccepted) {
          setShowTerms(true);
        }
      }
    };
    
    checkFirstLaunch();
  }, []);

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

  // Function to load active wallet address
  const loadActiveWalletAddress = async () => {
    try {
      // Check if PIN is set up
      const pinSetup = await validatePin('dummy'); // This will return false but won't crash
      if (!pinSetup) {
        console.log('PIN not set up yet');
        return;
      }

      // We need to ask for PIN to get the active wallet
      // For now, we'll load it when PIN is provided
      console.log('Active wallet will be loaded when PIN is provided');
    } catch (error) {
      console.log('Error checking wallet setup:', error);
    }
  };

  // Function to refresh wallet address with current PIN (when user switches wallets)
  const refreshWalletAddress = async (pin: string) => {
    try {
      const activeWallet = await getActiveWallet(pin);
      if (activeWallet) {
        setWalletAddress(activeWallet.address as `0x${string}`);
        console.log('Refreshed wallet address:', activeWallet.address);
        appendLog(`Active wallet updated: ${activeWallet.name} (${activeWallet.address})`);
      }
    } catch (error) {
      console.log('Error refreshing wallet address:', error);
    }
  };

  const scanSubRef = useRef<ReturnType<typeof manager.startDeviceScan> | null>(null);
  const characteristicMonitorRef = useRef<any>(null);

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
    
    try {
      const services = await device.services();
      const uart = services.find((s: any) => s.uuid === SERVICE_UUID);
      
      if (!uart) {
        appendLog('UART service not found');
        return;
      }

      const chars = await uart.characteristics();
      const tx = chars.find((c: any) => c.uuid === TX_CHAR_UUID);
      
      if (!tx) {
        appendLog('TX characteristic not found');
        return;
      }

      // Clean up any existing monitor before creating a new one
      if (characteristicMonitorRef.current) {
        characteristicMonitorRef.current = null;
      }

      characteristicMonitorRef.current = tx.monitor((error: any, characteristic: any) => {
        if (error) {
          console.log('Monitor error:', error);
          return;
        }
        const text = Buffer.from(characteristic?.value ?? '', 'base64').toString('utf-8');

      console.log('text', text);

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
          setLastSuccessfullTransaction(txHash);
          const isAuto = waitingToStartAutoPayRef.current;
          setLastTransactionStatus('SUCCESS');

          if (isAuto) setShowRecurringDialog(true);
        }
        // PAYMENT:COMPLETE VERIFIED:false
        else {
          setLastSuccessfullTransaction(null);
          setLastTransactionStatus('FAILED');
        }
      }
    });
    
    } catch (error) {
      console.log('Error setting up TX monitor:', error);
      appendLog('Failed to set up device monitor');
    }
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

  const handleWelcomeComplete = async () => {
    setShowWelcome(false);
    await markFirstLaunchComplete();
    setShowTerms(true);
  };

  const handleTermsAccepted = async () => {
    setShowTerms(false);
    await markTermsAccepted();
  };

  const handlePinVerifyComplete = async (pin: string | undefined) => {
    setShowPinVerify(false);

    if (!pin || !pendingPaymentData) {
      setPendingPaymentData(null);
      return;
    }

    try {
      // Always get the CURRENT active wallet (in case user switched wallets)
      const activeWallet = await getActiveWallet(pin);
      if (!activeWallet) {
        showAlert('Error', 'No active wallet found');
        return;
      }

      console.log('Using active wallet:', activeWallet.name, activeWallet.address);

      // Set the wallet address for use in device components
      setWalletAddress(activeWallet.address as `0x${string}`);

      // Get the decrypted private key using the PIN and wallet ID
      const decryptedPrivateKey = await getWalletPrivateKey(pin, activeWallet.id);
      if (!decryptedPrivateKey) {
        showAlert('Error', 'Failed to decrypt private key');
        return;
      }

      console.log('Decrypted Private Key for wallet:', activeWallet.name);
      appendLog(`Using wallet: ${activeWallet.name} (${activeWallet.address})`);
      appendLog('Private key decrypted successfully');

      // If this is for a recurring payment, store the private key
      if (frequency && parseInt(frequency) > 0) {
        const sessionId = Date.now().toString();
        await storeRecurringPrivateKey(decryptedPrivateKey, sessionId);
        setRecurringSessionId(sessionId);
        setRecurringPrivateKey(decryptedPrivateKey);
        console.log('Stored private key for recurring payments with session ID:', sessionId);
      }

      // Continue with the original payment logic using the decrypted key
      await processPaymentWithPrivateKey(decryptedPrivateKey, pendingPaymentData);
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.error('Error decrypting private key:', error);
      appendLog('PIN verification error: ' + errorMsg);
      setLastTransactionStatus('FAILED');
      showAlert('PIN Error', 'Invalid PIN or decryption failed');
    } finally {
      setPendingPaymentData(null);
    }
  };

  const processPaymentWithPrivateKey = async (
    privateKey: string,
    paymentData: {
      address: `0x${string}` | undefined;
      options: string[];
      customizedtext: string;
    }
  ) => {
    const { options, customizedtext } = paymentData;

    // Derive the address from the private key to ensure consistency
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const address = account.address;

    console.log('Process payment with private key', privateKey, address, options, customizedtext);

    if (!paymentRequirements) {
      appendLog('No payment requirements, getting price...');
      await getPrice(options, customizedtext);
      return;
    }

    try {
      // Determine the chain based on payment requirements network
      let selectedChain;
      const network = paymentRequirements.network?.toLowerCase();

      if (network === 'base' || network === 'base-mainnet') {
        selectedChain = base;
      } else if (network === 'base-sepolia' || network === 'base sepolia') {
        selectedChain = baseSepolia;
      } else {
        // Default to base sepolia if network is not specified or unknown
        selectedChain = baseSepolia;
        appendLog(`Unknown network: ${paymentRequirements.network}, defaulting to Base Sepolia`);
      }

      appendLog(`Using chain: ${selectedChain.name} (${selectedChain.id})`);

      // Create wallet client dynamically from the decoded private key
      const walletClient = createWalletClient({
        account,
        chain: selectedChain,
        transport: http(),
      });

      const payload = await createPaymentPayload(address, walletClient, paymentRequirements);

      const completeChunks = `${JSON.stringify(payload)}--${
        customizedtext.length > 0 ? customizedtext : '""'
      }--${options.length > 0 ? '[' + options.join(',') + ']' : '[]'}`;

      appendLog('completeChunks' + completeChunks);

      const chunks = chunkString(completeChunks, 150);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        let data = '';

        console.log('chunk', chunk);

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
      setLastTransactionStatus('FAILED');
      showAlert('Payment Error', errorMsg);
    }
  };

  const handlePayNow = async (
    address: `0x${string}` | undefined,
    options: string[],
    customizedtext: string
  ) => {
    console.log('handlePayNow called - opening PIN verification');
    setLastTransactionStatus('STARTED');

    // Store the payment data and show PIN verification
    setPendingPaymentData({ address, options, customizedtext });
    setShowPinVerify(true);
  };

  // Handle recurring payments with stored private key
  const handleRecurringPay = async (
    address: `0x${string}` | undefined,
    options: string[],
    customizedtext: string,
    privateKey: string
  ) => {
    console.log('handleRecurringPay called with stored private key');
    setLastTransactionStatus('STARTED');
    const paymentData = { address, options, customizedtext };
    await processPaymentWithPrivateKey(privateKey, paymentData);
  };

  const startScan = useCallback(async () => {
    console.log('Scanning...');
    const ok = await ensureAndroidPerms();
    if (!ok) {
      showAlert('Permissions', 'Bluetooth permissions not granted.');
      return;
    }
    if (scanningRef.current) {
      console.log('Scan already running.');
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
          // Alert.alert('Scan error', error.message);
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
    console.log('STRAT scan : END');
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
        // ready.onDisconnected(() => {
        //   setConnectedId((curr) => (curr === ready.id ? null : curr));
        //   setDevice(null);
        //   // Reset device info states
        //   setLogo(null);
        //   setBanner(null);
        //   setDescription(null);
        //   setFrequency(null);
        //   setOptions([]);
        //   setAllowCustomtext(false);
        //   setPaymentRequirements(null);
        //   // Resume scanning after disconnect
        //   startScan();
        // });
      } catch (e: any) {
        showAlert('Connect error', e?.message ?? String(e));
      }
    },
    [stopScan, startScan]
  );

  const disconnectDevice = useCallback(async () => {
    if (!device?.id) return;

    try {
      // Clean up monitor first, but silently ignore errors
      if (characteristicMonitorRef.current) {
        characteristicMonitorRef.current = null;
        appendLog('Monitor cleaned up.');
      }

      // Then disconnect the device
      await manager.cancelDeviceConnection(device.id);
      appendLog('Disconnected');

      // Reset all states after successful disconnection
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
      
      // Resume scanning after manual disconnect
      console.log('Starting scan after disconnect...');
      setTimeout(() => {
        startScan();
      }, 1000); // Small delay to ensure cleanup is complete
      
    } catch (e: any) {
      console.log('Disconnect error:', e?.message ?? String(e));
      appendLog('Disconnect error: ' + (e?.message ?? String(e)));
      
      // Even if disconnect fails, clean up our state
      setConnectedId(null);
      setDevice(null);
      characteristicMonitorRef.current = null;
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
    loadActiveWalletAddress();
  }, []);

  useEffect(() => {
    subscribeToTX(device);
    fetchAllData();
    return () => {
      // Only clean up if we're changing devices or unmounting
      if (characteristicMonitorRef.current) {
        characteristicMonitorRef.current = null;
      }
    };
  }, [device]);

  // When this screen gains focus, ensure scanning restarts if we're not connected
  useEffect(() => {
    if (!connectedIdRef.current && !scanningRef.current) {
      startScan();
    }
  }, []); // Empty dependency array means this runs once on mount

  const list = useMemo(() => Object.values(devices), [devices]);

  // If connected to a device, show the Device window
  if (connectedId && device && banner && logo) {
    return (
      <>
        <DeviceWindow
          address={walletAddress || '0x0000000000000000000000000000000000000000'}
          deviceName={device.name ?? 'Unknown Device'}
          banner={banner}
          logo={logo}
          lastTransactionStatus={lastTransactionStatus}
          description={description}
          handlePayNow={handlePayNow}
          frequency={frequency ? parseInt(frequency) : null}
          allowCustomtext={allowCustomtext}
          options={options}
          paymentRequirements={paymentRequirements}
          getPrice={getPrice}
          setWaitingToStartAutoPay={handleSetWaitingToStartAutoPay}
          waitingToStartAutoPay={waitingToStartAutoPay}
          onDisconnect={disconnectDevice}
        />

        {showRecurringDialog &&
          paymentRequirements &&
          frequency &&
          recurringSessionId &&
          recurringPrivateKey && (
            <RecurringDialog
              address={walletAddress || '0x0000000000000000000000000000000000000000'}
              frequency={parseInt(frequency)}
              price={paymentRequirements.maxAmountRequired}
              userActiveContext={userActiveCContext}
              userActiveOptions={userActiveOptions}
              lastSuccessfullTransaction={lastSuccessfullTransaction}
              handlePay={handleRecurringPay}
              sessionId={recurringSessionId}
              privateKey={recurringPrivateKey}
              onCancel={async () => {
                if (recurringSessionId) {
                  await clearRecurringPrivateKey(recurringSessionId);
                  setRecurringSessionId(null);
                  setRecurringPrivateKey(null);
                }
                setShowRecurringDialog(false);
                handleSetWaitingToStartAutoPay(false);
              }}
            />
          )}

        <PinSetupModal
          visible={showPinVerify}
          onComplete={handlePinVerifyComplete}
          mode="verify"
          title="Verify PIN to Pay"
        />

        {AlertComponent}
      </>
    );
  }

  // Otherwise, show the scan screen with Apple-refined design
  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="mx-auto min-h-full bg-black">
        {/* Header */}
        <Header
          title="x4 Pay"
          subtitle="discover devices"
        />

        {/* Main Content */}
        <ScrollView className="px-4 pb-8" showsVerticalScrollIndicator={false}>
          <View className="gap-5">
            {/* Main Device Card */}
            <View className="mx-2 mt-4">
              <View className="border-white/12 bg-white/4 rounded-3xl border p-6 backdrop-blur-xl">
                {/* Header Section */}
                <View className="mb-6 items-center">
                  <View className="bg-white/8 mb-4 h-16 w-16 items-center justify-center rounded-2xl">
                    <Text className="text-2xl text-white">⊕</Text>
                  </View>
                  <Text className="mb-2 text-center text-xl font-semibold text-white">
                    Device Scanner
                  </Text>
                  <Text className="max-w-sm text-center text-sm leading-5 text-white/60">
                    Discover and connect to nearby payment devices
                  </Text>
                </View>

                {/* Status and Scan Button */}
                <View className="mb-6 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View
                      className={`h-3 w-3 rounded-full ${connectedId ? 'bg-white/80' : 'bg-white/30'}`}
                    />
                    <Text className="text-base font-medium text-white">
                      {connectedId ? 'Connected' : 'Ready to tap'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={scanning ? stopScan : startScan}
                    disabled={scanning}
                    className={`flex-row items-center gap-2 rounded-2xl px-4 py-2.5 ${
                      scanning
                        ? 'border border-white/10 bg-white/5'
                        : 'border border-white/15 bg-black'
                    }`}>
                    <Animated.View
                      style={{
                        transform: [{ rotate: spinInterpolation }],
                      }}>
                      <ScanIcon size={14} />
                    </Animated.View>
                    <Text
                      className={`text-sm font-semibold ${scanning ? 'text-white/60' : 'text-white'}`}>
                      {scanning ? 'Scanning...' : 'Scan Devices'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Device List */}
            {list.length > 0 && (
              <View className="mx-2">
                <Text className="mb-3 px-2 text-sm font-medium text-white/60">
                  Available Devices ({list.length})
                </Text>
                <View className="gap-2">
                  {list.map((item, index) => {
                    // Calculate signal strength based on RSSI (simplified)
                    const getSignalStrength = (rssi: number | null) => {
                      if (!rssi) return 1;
                      if (rssi >= -50) return 4;
                      if (rssi >= -60) return 3;
                      if (rssi >= -70) return 2;
                      return 1;
                    };

                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => connectTo(item)}
                        className="active:bg-white/8 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1 flex-row items-center gap-3">
                            <View className="h-10 w-10 items-center justify-center rounded-full bg-white/10">
                              <DeviceIcon size={16} />
                            </View>
                            <View className="flex-1">
                              <Text className="mb-0.5 text-sm font-medium text-white">
                                {item.name ?? 'Unnamed Device'}
                              </Text>
                              <Text className="font-mono text-xs text-white/50">
                                {item.id.slice(0, 8)}...{item.id.slice(-4)}
                              </Text>
                            </View>
                          </View>
                          <View className="flex-row items-center gap-2">
                            <SignalBars strength={getSignalStrength(item.rssi)} />
                            <Text className="w-8 text-right text-xs text-white/40">
                              {item.rssi}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Empty States */}
            {list.length === 0 && (
              <View className="mx-2">
                {scanning ? (
                  <View className="items-center justify-center py-12">
                    <Animated.View
                      className="mb-4 h-12 w-12 rounded-full border-2 border-white/20 border-t-white"
                      style={{
                        transform: [{ rotate: spinInterpolation }],
                      }}
                    />
                    <Text className="mb-2 text-base font-medium text-white">
                      Scanning for devices...
                    </Text>
                    <Text className="max-w-sm text-center text-sm text-white/50">
                      Looking for nearby payment devices and embedded systems
                    </Text>
                  </View>
                ) : (
                  <View className="items-center justify-center py-12">
                    <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-white/10">
                      <Text className="text-lg text-white/60">◯</Text>
                    </View>
                    <Text className="mb-2 text-base font-medium text-white">No devices nearby</Text>
                    <Text className="max-w-sm text-center text-sm text-white/50">
                      Make sure your device is discoverable and try scanning again
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Social Footer */}
            <View className="mx-2 mt-4">
              <Pressable
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
                onPress={() => {
                  // Handle social link
                }}>
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-white/10">
                    <Text className="text-sm text-white">𝕏</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="mb-1 text-xs font-medium text-white/60">
                      Follow development
                    </Text>
                    <Text className="text-sm font-semibold text-white">@AbhinavBuilds</Text>
                  </View>
                  <View className="h-5 w-5 items-center justify-center">
                    <Text className="text-xs text-white/40">→</Text>
                  </View>
                </View>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
      {AlertComponent}
      
      <WelcomeScreen
        visible={showWelcome}
        onComplete={handleWelcomeComplete}
      />
      
      <TermsAndPrivacy
        visible={showTerms}
        onAccept={handleTermsAccepted}
      />
      
      <PinSetupModal
        visible={showPinVerify}
        onComplete={handlePinVerifyComplete}
        mode="verify"
      />
    </SafeAreaView>
  );
}
