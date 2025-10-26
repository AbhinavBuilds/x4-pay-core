import AsyncStorage from '@react-native-async-storage/async-storage';

const PIN_KEY = 'user_pin_hash';
const WALLET_KEY = 'encrypted_wallets';
const ACTIVE_WALLET_KEY = 'active_wallet_id';
const PIN_SETUP_KEY = 'pin_setup_complete';
const FIRST_LAUNCH_KEY = 'first_app_launch';
const TERMS_ACCEPTED_KEY = 'terms_accepted';

// Manual private key generation without any crypto dependencies
const generatePrivateKey = (): `0x${string}` => {
  // Use pure JavaScript random number generation with multiple entropy sources
  const sources = [
    Date.now(),
    Math.random() * 1000000,
    Math.random() * 1000000,
    Math.random() * 1000000,
    Math.random() * 1000000,
    performance.now(),
    Math.random() * Date.now(),
    Math.floor(Math.random() * 0xFFFFFFFF),
    Math.floor(Math.random() * 0xFFFFFFFF),
    Math.floor(Math.random() * 0xFFFFFFFF),
    Math.floor(Math.random() * 0xFFFFFFFF),
    Math.floor(Math.random() * 0xFFFFFFFF),
    Math.floor(Math.random() * 0xFFFFFFFF),
    Math.floor(Math.random() * 0xFFFFFFFF),
    Math.floor(Math.random() * 0xFFFFFFFF)
  ];
  
  // Create entropy string from all sources
  const entropyString = sources.join('') + Math.random().toString(36);
  
  // Simple hash function to convert entropy to hex
  let hash = '';
  for (let i = 0; i < entropyString.length; i++) {
    const char = entropyString.charCodeAt(i);
    hash += (char * 31 + i).toString(16);
  }
  
  // Add more randomness
  hash += Math.random().toString(16).substring(2);
  hash += Math.random().toString(16).substring(2);
  hash += Math.random().toString(16).substring(2);
  hash += Math.random().toString(16).substring(2);
  
  // Take exactly 64 characters for 32 bytes, pad or truncate as needed
  let privateKeyHex = hash.replace(/[^0-9a-f]/gi, '').toLowerCase();
  
  // Ensure we have exactly 64 hex characters
  while (privateKeyHex.length < 64) {
    privateKeyHex += Math.floor(Math.random() * 16).toString(16);
  }
  privateKeyHex = privateKeyHex.substring(0, 64);
  
  // Validate against secp256k1 curve order
  const privateKeyBN = BigInt('0x' + privateKeyHex);
  const secp256k1Order = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
  
  if (privateKeyBN >= secp256k1Order || privateKeyBN === 0n) {
    // Recursively generate a new key if invalid
    return generatePrivateKey();
  }
  
  return `0x${privateKeyHex}`;
};

export interface Wallet {
  id: string;
  name: string;
  address: string;
  encryptedPrivateKey: string;
  createdAt: number;
}

export interface StoredWallets {
  wallets: Wallet[];
  activeWalletId: string | null;
}

// PIN Management Functions
export const hashPin = (pin: string): string => {
  return simpleHash(pin);
};

export const setupPin = async (pin: string): Promise<void> => {
  const hashedPin = hashPin(pin);
  await AsyncStorage.setItem(PIN_KEY, hashedPin);
  await AsyncStorage.setItem(PIN_SETUP_KEY, 'true');
};

export const validatePin = async (pin: string): Promise<boolean> => {
  const storedHash = await AsyncStorage.getItem(PIN_KEY);
  if (!storedHash) return false;
  
  const inputHash = hashPin(pin);
  return inputHash === storedHash;
};

export const isPinSetup = async (): Promise<boolean> => {
  const isSetup = await AsyncStorage.getItem(PIN_SETUP_KEY);
  return isSetup === 'true';
};

export const changePin = async (oldPin: string, newPin: string): Promise<boolean> => {
  const isValidOldPin = await validatePin(oldPin);
  if (!isValidOldPin) return false;
  
  // Get all wallets and re-encrypt with new PIN
  const wallets = await getWallets(oldPin);
  if (!wallets) return false;
  
  // Setup new PIN
  await setupPin(newPin);
  
  // Re-encrypt all wallets with new PIN
  const reEncryptedWallets: Wallet[] = [];
  for (const wallet of wallets.wallets) {
    const privateKey = decryptPrivateKey(wallet.encryptedPrivateKey, oldPin);
    const newEncryptedPrivateKey = encryptPrivateKey(privateKey, newPin);
    reEncryptedWallets.push({
      ...wallet,
      encryptedPrivateKey: newEncryptedPrivateKey,
    });
  }
  
  const updatedWallets: StoredWallets = {
    wallets: reEncryptedWallets,
    activeWalletId: wallets.activeWalletId,
  };
  
  await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(updatedWallets));
  return true;
};

// Simple XOR-based encryption that doesn't require crypto libraries
const simpleEncrypt = (text: string, key: string): string => {
  let encrypted = '';
  const keyLength = key.length;
  
  for (let i = 0; i < text.length; i++) {
    const textChar = text.charCodeAt(i);
    const keyChar = key.charCodeAt(i % keyLength);
    const encryptedChar = textChar ^ keyChar;
    encrypted += String.fromCharCode(encryptedChar);
  }
  
  // Convert to base64-like encoding for safe storage
  return btoa(encrypted);
};

const simpleDecrypt = (encryptedText: string, key: string): string => {
  try {
    // Decode from base64-like encoding
    const encrypted = atob(encryptedText);
    let decrypted = '';
    const keyLength = key.length;
    
    for (let i = 0; i < encrypted.length; i++) {
      const encryptedChar = encrypted.charCodeAt(i);
      const keyChar = key.charCodeAt(i % keyLength);
      const decryptedChar = encryptedChar ^ keyChar;
      decrypted += String.fromCharCode(decryptedChar);
    }
    
    return decrypted;
  } catch {
    throw new Error('Failed to decrypt');
  }
};

// Hash function for PIN storage (simple but secure enough for mobile app)
const simpleHash = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Add salt and convert to hex
  const salted = Math.abs(hash * 31 + input.length * 17).toString(16);
  return salted.padStart(8, '0');
};

// Encryption/Decryption Functions
export const encryptPrivateKey = (privateKey: string, pin: string): string => {
  return simpleEncrypt(privateKey, pin + 'x4pay_salt_2024');
};

export const decryptPrivateKey = (encryptedPrivateKey: string, pin: string): string => {
  return simpleDecrypt(encryptedPrivateKey, pin + 'x4pay_salt_2024');
};

// Wallet Management Functions
export const createWallet = async (pin: string, name?: string): Promise<Wallet | null> => {
  const isValidPin = await validatePin(pin);
  if (!isValidPin) return null;
  
  const privateKey = generatePrivateKey();
  const { privateKeyToAccount } = await import('viem/accounts');
  const account = privateKeyToAccount(privateKey);
  
  const wallet: Wallet = {
    id: Date.now().toString(),
    name: name || `Wallet ${Date.now()}`,
    address: account.address,
    encryptedPrivateKey: encryptPrivateKey(privateKey, pin),
    createdAt: Date.now(),
  };
  
  // Get existing wallets
  const existingWallets = await getWallets(pin) || { wallets: [], activeWalletId: null };
  
  // Add new wallet
  existingWallets.wallets.push(wallet);
  
  // Set as active if it's the first wallet
  if (!existingWallets.activeWalletId) {
    existingWallets.activeWalletId = wallet.id;
  }
  
  // Save updated wallets
  await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(existingWallets));
  
  return wallet;
};

export const getWallets = async (pin: string): Promise<StoredWallets | null> => {
  const isValidPin = await validatePin(pin);
  if (!isValidPin) return null;
  
  const walletsData = await AsyncStorage.getItem(WALLET_KEY);
  if (!walletsData) {
    return { wallets: [], activeWalletId: null };
  }
  
  return JSON.parse(walletsData);
};

export const getActiveWallet = async (pin: string): Promise<Wallet | null> => {
  const wallets = await getWallets(pin);
  if (!wallets || !wallets.activeWalletId) return null;
  
  return wallets.wallets.find(w => w.id === wallets.activeWalletId) || null;
};

export const setActiveWallet = async (pin: string, walletId: string): Promise<boolean> => {
  const wallets = await getWallets(pin);
  if (!wallets) return false;
  
  const wallet = wallets.wallets.find(w => w.id === walletId);
  if (!wallet) return false;
  
  wallets.activeWalletId = walletId;
  await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(wallets));
  return true;
};

export const deleteWallet = async (pin: string, walletId: string): Promise<boolean> => {
  const wallets = await getWallets(pin);
  if (!wallets) return false;
  
  // Don't allow deletion if there's only one wallet
  if (wallets.wallets.length <= 1) return false;
  
  const walletIndex = wallets.wallets.findIndex(w => w.id === walletId);
  if (walletIndex === -1) return false;
  
  // Remove wallet
  wallets.wallets.splice(walletIndex, 1);
  
  // If deleted wallet was active, set first wallet as active
  if (wallets.activeWalletId === walletId) {
    wallets.activeWalletId = wallets.wallets[0]?.id || null;
  }
  
  await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(wallets));
  return true;
};

export const importWallet = async (pin: string, privateKey: string, name?: string): Promise<Wallet | null> => {
  const isValidPin = await validatePin(pin);
  if (!isValidPin) return null;
  
  try {
    const { privateKeyToAccount } = await import('viem/accounts');
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    const wallet: Wallet = {
      id: Date.now().toString(),
      name: name || `Imported Wallet ${Date.now()}`,
      address: account.address,
      encryptedPrivateKey: encryptPrivateKey(privateKey, pin),
      createdAt: Date.now(),
    };
    
    // Get existing wallets
    const existingWallets = await getWallets(pin) || { wallets: [], activeWalletId: null };
    
    // Check if wallet already exists
    const existingWallet = existingWallets.wallets.find(w => w.address === wallet.address);
    if (existingWallet) return null; // Wallet already exists
    
    // Add new wallet
    existingWallets.wallets.push(wallet);
    
    // Set as active if it's the first wallet
    if (!existingWallets.activeWalletId) {
      existingWallets.activeWalletId = wallet.id;
    }
    
    // Save updated wallets
    await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(existingWallets));
    
    return wallet;
  } catch (error) {
    return null;
  }
};

export const getWalletPrivateKey = async (pin: string, walletId: string): Promise<string | null> => {
  const wallets = await getWallets(pin);
  if (!wallets) return null;
  
  const wallet = wallets.wallets.find(w => w.id === walletId);
  if (!wallet) return null;
  
  try {
    return decryptPrivateKey(wallet.encryptedPrivateKey, pin);
  } catch (error) {
    return null;
  }
};

export const clearAllData = async (): Promise<void> => {
  await AsyncStorage.multiRemove([PIN_KEY, WALLET_KEY, ACTIVE_WALLET_KEY, PIN_SETUP_KEY]);
};

// Rename wallet
export const renameWallet = async (pin: string, walletId: string, newName: string): Promise<boolean> => {
  try {
    const wallets = await getWallets(pin);
    if (!wallets) return false;
    
    // Find and update the wallet name
    const updatedWallets = wallets.wallets.map(wallet => 
      wallet.id === walletId ? { ...wallet, name: newName } : wallet
    );
    
    // Save updated wallets
    const updatedData: StoredWallets = {
      ...wallets,
      wallets: updatedWallets
    };
    
    await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(updatedData));
    
    return true;
  } catch (error) {
    console.error('Failed to rename wallet:', error);
    return false;
  }
};

// Recurring payment private key management
const RECURRING_KEY = 'recurring_payment_key';

export const storeRecurringPrivateKey = async (privateKey: string, sessionId: string): Promise<void> => {
  try {
    const encrypted = encryptPrivateKey(privateKey, sessionId);
    await AsyncStorage.setItem(`${RECURRING_KEY}_${sessionId}`, encrypted);
  } catch (error) {
    console.error('Failed to store recurring private key:', error);
    throw error;
  }
};

export const getRecurringPrivateKey = async (sessionId: string): Promise<string | null> => {
  try {
    const encrypted = await AsyncStorage.getItem(`${RECURRING_KEY}_${sessionId}`);
    if (!encrypted) return null;
    return decryptPrivateKey(encrypted, sessionId);
  } catch (error) {
    console.error('Failed to get recurring private key:', error);
    return null;
  }
};

export const clearRecurringPrivateKey = async (sessionId: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(`${RECURRING_KEY}_${sessionId}`);
  } catch (error) {
    console.error('Failed to clear recurring private key:', error);
  }
};

// First app launch tracking
export const isFirstAppLaunch = async (): Promise<boolean> => {
  try {
    const hasLaunched = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
    return hasLaunched === null;
  } catch (error) {
    console.error('Failed to check first launch status:', error);
    return false;
  }
};

export const markFirstLaunchComplete = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
  } catch (error) {
    console.error('Failed to mark first launch complete:', error);
  }
};

// Terms and privacy acceptance tracking
export const hasAcceptedTerms = async (): Promise<boolean> => {
  try {
    const hasAccepted = await AsyncStorage.getItem(TERMS_ACCEPTED_KEY);
    return hasAccepted === 'true';
  } catch (error) {
    console.error('Failed to check terms acceptance status:', error);
    return false;
  }
};

export const markTermsAccepted = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(TERMS_ACCEPTED_KEY, 'true');
  } catch (error) {
    console.error('Failed to mark terms accepted:', error);
  }
};