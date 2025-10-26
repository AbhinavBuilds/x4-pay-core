import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';
import { Header } from '../../components/Header';
import React, { useState, useEffect, useCallback } from 'react';
import { PinSetupModal, usePinSetup } from 'components/PinSetup';
import { WelcomeScreen } from '../../components/WelcomeScreen';
import {
  createWallet,
  getWallets,
  getActiveWallet,
  setActiveWallet,
  deleteWallet,
  importWallet,
  getWalletPrivateKey,
  renameWallet,
  type Wallet,
} from 'utils/pin-utils';
import {
  getAllUSDCBalances,
  getTotalUSDCValue,
  transferUSDC,
  SUPPORTED_CHAINS,
  formatAddress,
  isValidAddress,
  getExplorerUrl,
  getTransactionHistory,
  getTransactionsByChain,
  updateTransactionStatus,
  fetchUSDCTransactionsFromBlockchain,
  type WalletBalance,
  type SupportedChain,
  type TransactionHistory,
} from 'utils/wallet-utils';

// Icons - Black and White
const WalletIcon = ({ size = 20, color = 'currentColor' }) => (
  <View style={{ width: size, height: size }}>
    <Text style={{ color, fontSize: 16, textAlign: 'center', lineHeight: size }}>◉</Text>
  </View>
);

const RefreshIcon = ({ size = 20, color = 'currentColor' }) => (
  <View style={{ width: size, height: size }}>
    <Text style={{ color, fontSize: 16, textAlign: 'center', lineHeight: size }}>↻</Text>
  </View>
);

const ChainIcon = ({ size = 20, color = 'currentColor' }) => (
  <View style={{ width: size, height: size }}>
    <Text style={{ color, fontSize: 16, textAlign: 'center', lineHeight: size }}>◆</Text>
  </View>
);

const SendIcon = ({ size = 20, color = 'currentColor' }) => (
  <View style={{ width: size, height: size }}>
    <Text style={{ color, fontSize: 16, textAlign: 'center', lineHeight: size }}>↗</Text>
  </View>
);

const ReceiveIcon = ({ size = 20, color = 'currentColor' }) => (
  <View style={{ width: size, height: size }}>
    <Text style={{ color, fontSize: 16, textAlign: 'center', lineHeight: size }}>↙</Text>
  </View>
);

const AddIcon = ({ size = 20, color = 'currentColor' }) => (
  <View style={{ width: size, height: size }}>
    <Text style={{ color, fontSize: 16, textAlign: 'center', lineHeight: size }}>+</Text>
  </View>
);

const BackupIcon = ({ size = 20, color = 'currentColor' }) => (
  <View style={{ width: size, height: size }}>
    <Text style={{ color, fontSize: 16, textAlign: 'center', lineHeight: size }}>⧉</Text>
  </View>
);

const DeleteIcon = ({ size = 20, color = 'currentColor' }) => (
  <View style={{ width: size, height: size }}>
    <Text style={{ color, fontSize: 16, textAlign: 'center', lineHeight: size }}>×</Text>
  </View>
);

const HistoryIcon = ({ size = 20, color = 'currentColor' }) => (
  <View style={{ width: size, height: size }}>
    <Text style={{ color, fontSize: 16, textAlign: 'center', lineHeight: size }}>⧖</Text>
  </View>
);

const MoreIcon = ({ size = 20, color = 'currentColor' }) => (
  <View style={{ width: size, height: size }}>
    <Text style={{ color, fontSize: 16, textAlign: 'center', lineHeight: size }}>⋯</Text>
  </View>
);

export default function WalletScreen() {
  const { isSetup, refreshSetupStatus } = usePinSetup();
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [userPin, setUserPin] = useState<string>('');

  // Welcome and onboarding states
  const [hasWallet, setHasWallet] = useState(false);
  const [showCreateWalletModal, setShowCreateWalletModal] = useState(false);
  const [creatingWallet, setCreatingWallet] = useState(false);

  // Wallet state
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [activeWallet, setActiveWalletState] = useState<Wallet | null>(null);
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [selectedChain, setSelectedChain] = useState<SupportedChain>(SUPPORTED_CHAINS[0]);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  // Transaction history state
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionHistory[]>([]);
  const [selectedTxChain, setSelectedTxChain] = useState<SupportedChain | null>(null);
  const [isLoadingTx, setIsLoadingTx] = useState(false);

  // Send form state
  const [sendAmount, setSendAmount] = useState('');
  const [sendAddress, setSendAddress] = useState('');
  const [sending, setSending] = useState(false);

  // Import form state
  const [importPrivateKey, setImportPrivateKey] = useState('');
  const [importName, setImportName] = useState('');
  const [importing, setImporting] = useState(false);

  // Wallet menu state
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinAction, setPinAction] = useState<'backup' | 'delete' | null>(null);

  // Load wallet data when PIN is available
  const loadWalletData = useCallback(async () => {
    if (!userPin) return;

    try {
      const walletsData = await getWallets(userPin);
      if (walletsData) {
        setWallets(walletsData.wallets);
        const active = await getActiveWallet(userPin);
        setActiveWalletState(active);

        // Load balances for active wallet
        if (active) {
          const walletBalances = await getAllUSDCBalances(active.address);
          setBalances(walletBalances);
        }
      }

      // Load transaction history
      await loadTransactionHistory();
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  }, [userPin]);

  const loadTransactionHistory = useCallback(async () => {
    if (!activeWallet) return;
    
    try {
      setIsLoadingTx(true);
      
      // Fetch transactions from blockchain events 
      const chainIdToFetch = selectedTxChain?.id;
      const txHistory = await fetchUSDCTransactionsFromBlockchain(
        activeWallet.address, 
        chainIdToFetch
      );
      
      setTransactions(txHistory);
      setFilteredTransactions(txHistory);
    } catch (error) {
      console.error('Error loading transaction history:', error);
      // Fallback to local storage if blockchain fetch fails
      try {
        const localTxHistory = await getTransactionHistory();
        setTransactions(localTxHistory);
        
        // Apply chain filter if selected
        if (selectedTxChain) {
          const filtered = await getTransactionsByChain(selectedTxChain.id);
          setFilteredTransactions(filtered);
        } else {
          setFilteredTransactions(localTxHistory);
        }
      } catch (localError) {
        console.error('Error loading local transaction history:', localError);
      }
    } finally {
      setIsLoadingTx(false);
    }
  }, [activeWallet, selectedTxChain]);

  const refreshBalances = useCallback(async () => {
    if (!activeWallet) return;
    
    setRefreshing(true);
    try {
      const walletBalances = await getAllUSDCBalances(activeWallet.address);
      setBalances(walletBalances);
    } catch (error) {
      console.error('Error refreshing balances:', error);
    } finally {
      setRefreshing(false);
    }
  }, [activeWallet]);

  // Check PIN setup status and wallet existence on mount
  useEffect(() => {
    const initializeApp = async () => {
      if (isSetup === false) {
        // No PIN setup, go directly to PIN setup
        setShowPinSetup(true);
      } else if (isSetup === true && !userPin) {
        // PIN exists but not entered, verify PIN
        setShowPinVerify(true);
      } else if (isSetup === true && userPin) {
        // PIN verified, check if wallets exist
        await checkWalletExistence();
      }
    };

    initializeApp();
  }, [isSetup, userPin]);

  // Check if user has any wallets
  const checkWalletExistence = async () => {
    if (!userPin) return;

    try {
      const walletsData = await getWallets(userPin);
      if (walletsData && walletsData.wallets.length > 0) {
        setHasWallet(true);
        await loadWalletData();
      } else {
        setHasWallet(false);
        // No wallets exist, show create wallet modal
        setShowCreateWalletModal(true);
      }
    } catch (error) {
      console.error('Error checking wallet existence:', error);
      setHasWallet(false);
      setShowCreateWalletModal(true);
    }
  };

  // Load wallet data when PIN is set
  useEffect(() => {
    if (userPin && hasWallet) {
      loadWalletData();
    }
  }, [userPin, hasWallet, loadWalletData]);

  // Refresh data when screen is focused
  useEffect(() => {
    if (activeWallet) {
      refreshBalances();
    }
  }, [activeWallet]); // Refresh when activeWallet changes

  const handlePinSetupComplete = async (pin?: string) => {
    setShowPinSetup(false);
    await refreshSetupStatus();
    
    if (pin) {
      setUserPin(pin);
      // After PIN is set, check wallet existence
      await checkWalletExistence();
    }
  };

  const handlePinVerifyComplete = async (pin?: string) => {
    setShowPinVerify(false);
    if (pin) {
      setUserPin(pin);
      // After PIN is verified, check wallet existence
      await checkWalletExistence();
    }
  };

  const handleCreateFirstWallet = async () => {
    if (!userPin) return;

    setCreatingWallet(true);
    try {
      const newWallet = await createWallet(userPin, 'My Wallet');
      if (newWallet) {
        setHasWallet(true);
        setShowCreateWalletModal(false);
        await loadWalletData();
        Alert.alert(
          'Wallet Created!', 
          `Your wallet has been created successfully.\n\nAddress: ${formatAddress(newWallet.address)}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error creating wallet:', error);
      Alert.alert('Error', 'Failed to create wallet. Please try again.');
    } finally {
      setCreatingWallet(false);
    }
  };

  const handleCreateNewWallet = async () => {
    if (!userPin) return;

    try {
      const newWallet = await createWallet(userPin, `Wallet ${wallets.length + 1}`);
      if (newWallet) {
        await loadWalletData();
        setShowAccountModal(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create wallet');
    }
  };

  const handleSwitchWallet = async (walletId: string) => {
    if (!userPin) return;

    try {
      await setActiveWallet(userPin, walletId);
      await loadWalletData();
      setShowAccountModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to switch wallet');
    }
  };

  const handleDeleteWallet = async (walletId: string) => {
    Alert.alert(
      'Delete Wallet',
      'Are you sure you want to delete this wallet? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setSelectedWalletId(walletId);
            setPinAction('delete');
            setShowPinPrompt(true);
            setShowWalletMenu(false);
          },
        },
      ]
    );
  };

  const handleBackupWallet = async (walletId: string) => {
    setSelectedWalletId(walletId);
    setPinAction('backup');
    setShowPinPrompt(true);
  };

  const handleRenameWallet = (walletId: string, currentName: string) => {
    setSelectedWalletId(walletId);
    setNewWalletName(currentName);
    setShowRenameModal(true);
    setShowWalletMenu(false);
  };

  const confirmRenameWallet = async () => {
    if (!userPin || !selectedWalletId || !newWalletName.trim()) return;

    try {
      const success = await renameWallet(userPin, selectedWalletId, newWalletName.trim());
      if (success) {
        await loadWalletData();
        setShowRenameModal(false);
        setNewWalletName('');
        setSelectedWalletId(null);
      } else {
        Alert.alert('Error', 'Failed to rename wallet');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to rename wallet');
    }
  };

  const handlePinVerified = async (pin: string) => {
    if (!selectedWalletId || !pinAction) return;

    if (pinAction === 'backup') {
      try {
        const privateKey = await getWalletPrivateKey(pin, selectedWalletId);
        if (privateKey) {
          Share.share({
            message: `Your wallet private key (keep this secure!):\n\n${privateKey}`,
            title: 'Wallet Backup',
          });
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to backup wallet');
      }
    } else if (pinAction === 'delete') {
      try {
        const success = await deleteWallet(pin, selectedWalletId);
        if (success) {
          await loadWalletData();
          setShowAccountModal(false);
        } else {
          Alert.alert('Error', 'Cannot delete the only wallet');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to delete wallet');
      }
    }

    setShowPinPrompt(false);
    setPinAction(null);
    setSelectedWalletId(null);
    setShowWalletMenu(false);
  };

  const handleSend = async () => {
    if (!activeWallet || !userPin) return;

    if (!isValidAddress(sendAddress)) {
      Alert.alert('Invalid Address', 'Please enter a valid address');
      return;
    }

    if (!sendAmount || parseFloat(sendAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    setSending(true);
    try {
      const hash = await transferUSDC(sendAddress, sendAmount, selectedChain, userPin, activeWallet.id);
      if (hash) {
        Alert.alert(
          'Transaction Sent',
          `Transaction hash: ${hash}`,
          [
            { text: 'OK', onPress: () => {
              setShowSendModal(false);
              setSendAmount('');
              setSendAddress('');
              refreshBalances();
              loadTransactionHistory(); // Reload transaction history
            }}
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to send transaction');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send transaction');
    } finally {
      setSending(false);
    }
  };

  const handleImportFirstWallet = async () => {
    if (!userPin) return;

    if (!importPrivateKey.startsWith('0x') || importPrivateKey.length !== 66) {
      Alert.alert('Invalid Private Key', 'Please enter a valid private key (64 characters starting with 0x)');
      return;
    }

    setImporting(true);
    try {
      const wallet = await importWallet(userPin, importPrivateKey, importName || 'Imported Wallet');
      if (wallet) {
        setHasWallet(true);
        setShowImportModal(false);
        setImportPrivateKey('');
        setImportName('');
        await loadWalletData();
        Alert.alert(
          'Wallet Imported!', 
          `Your wallet has been imported successfully.\n\nAddress: ${formatAddress(wallet.address)}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to import wallet or wallet already exists');
      }
    } catch (error) {
      console.error('Error importing wallet:', error);
      Alert.alert('Error', 'Failed to import wallet. Please check your private key and try again.');
    } finally {
      setImporting(false);
    }
  };

  const handleImportWallet = async () => {
    if (!userPin) return;

    if (!importPrivateKey.startsWith('0x') || importPrivateKey.length !== 66) {
      Alert.alert('Invalid Private Key', 'Please enter a valid private key');
      return;
    }

    setImporting(true);
    try {
      const wallet = await importWallet(userPin, importPrivateKey, importName || undefined);
      if (wallet) {
        await loadWalletData();
        setShowImportModal(false);
        setImportPrivateKey('');
        setImportName('');
      } else {
        Alert.alert('Error', 'Failed to import wallet or wallet already exists');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to import wallet');
    } finally {
      setImporting(false);
    }
  };

  const handleReceive = () => {
    setShowReceiveModal(true);
  };

  // Show loading state while checking setup
  if (isSetup === null) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-white/60 text-center text-base">
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show welcome screen, PIN setup, or create wallet modals
  if (showPinSetup || showPinVerify || (userPin && !hasWallet)) {
    return (
      <>
        <SafeAreaView className="flex-1 bg-black">
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-20 h-20 bg-white/10 rounded-full items-center justify-center mb-8">
              <WalletIcon size={32} color="white" />
            </View>
            <Text className="text-3xl font-light text-white text-center mb-3 tracking-tight">
              {!isSetup ? 'Welcome to x4 Pay' : hasWallet ? 'x4 Pay' : 'Create Your Wallet'}
            </Text>
            <Text className="text-white/60 text-center text-base leading-6 max-w-sm">
              {!isSetup 
                ? 'Secure cryptocurrency payments over Bluetooth' 
                : !userPin 
                  ? 'Enter your PIN to access your wallet' 
                  : !hasWallet 
                    ? 'Create your first wallet to get started'
                    : 'Loading your wallet...'}
            </Text>
          </View>
        </SafeAreaView>
        
        <PinSetupModal
          visible={showPinSetup}
          onComplete={handlePinSetupComplete}
          mode="setup"
        />
        
        <PinSetupModal
          visible={showPinVerify}
          onComplete={handlePinVerifyComplete}
          mode="verify"
        />

        {/* Create Wallet Modal - First Time */}
        <Modal visible={showCreateWalletModal} animationType="slide" presentationStyle="formSheet">
          <SafeAreaView className="flex-1 bg-black">
            <View className="flex-1 px-6 py-8">
              <View className="items-center mb-12">
                <View className="w-16 h-16 bg-white/10 rounded-full items-center justify-center mb-6">
                  <WalletIcon size={24} color="white" />
                </View>
                <Text className="text-2xl font-light text-white mb-3 text-center tracking-tight">
                  Create Your First Wallet
                </Text>
                <Text className="text-white/60 text-center text-base leading-6 max-w-sm">
                  Choose how you want to create your wallet. Your private key will be encrypted with your PIN.
                </Text>
              </View>

              <View className="gap-4">
                <Pressable
                  onPress={handleCreateFirstWallet}
                  disabled={creatingWallet}
                  className={`py-5 px-6 rounded-2xl border ${
                    creatingWallet ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/20'
                  }`}
                >
                  <View className="flex-row items-center gap-4">
                    <View className="w-12 h-12 bg-white/10 rounded-full items-center justify-center">
                      <Text className="text-white text-lg">🎲</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-medium text-base mb-1">
                        Create New Wallet
                      </Text>
                      <Text className="text-white/60 text-sm">
                        Generate a new random private key
                      </Text>
                    </View>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setShowImportModal(true)}
                  disabled={creatingWallet}
                  className={`py-5 px-6 rounded-2xl border ${
                    creatingWallet ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/20'
                  }`}
                >
                  <View className="flex-row items-center gap-4">
                    <View className="w-12 h-12 bg-white/10 rounded-full items-center justify-center">
                      <Text className="text-white text-lg">↙</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-medium text-base mb-1">
                        Import Existing Wallet
                      </Text>
                      <Text className="text-white/60 text-sm">
                        Import from private key
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Import Wallet Modal */}
        <Modal visible={showImportModal} animationType="slide" presentationStyle="formSheet">
          <SafeAreaView className="flex-1 bg-black" >
            <View className="flex-1 px-6 py-8">
              <View className="flex-row items-center justify-between mb-8">
                <Text className="text-2xl font-light text-white tracking-tight">Import Wallet</Text>
                <Pressable
                  onPress={() => {
                    setShowImportModal(false);
                    setImportPrivateKey('');
                    setImportName('');
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 items-center justify-center"
                >
                  <Text className="text-white text-lg">×</Text>
                </Pressable>
              </View>

              <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="gap-6">
                  <View>
                    <Text className="text-white/60 text-sm font-medium mb-3">Private Key</Text>
                    <TextInput
                      value={importPrivateKey}
                      onChangeText={setImportPrivateKey}
                      placeholder="0x..."
                      placeholderTextColor="#ffffff60"
                      secureTextEntry
                      className="bg-white/5 border border-white/20 rounded-2xl px-5 py-4 text-white text-base font-mono"
                      multiline
                      numberOfLines={3}
                    />
                    <Text className="text-white/40 text-xs mt-2">
                      Enter your 64-character private key starting with 0x
                    </Text>
                  </View>

                  <View>
                    <Text className="text-white/60 text-sm font-medium mb-3">Wallet Name (Optional)</Text>
                    <TextInput
                      value={importName}
                      onChangeText={setImportName}
                      placeholder="My Wallet"
                      placeholderTextColor="#ffffff60"
                      className="bg-white/5 border border-white/20 rounded-2xl px-5 py-4 text-white text-base"
                    />
                  </View>
                </View>
              </ScrollView>

              <View className="gap-4 mt-6">
                <Pressable
                  onPress={handleImportFirstWallet}
                  disabled={!importPrivateKey.trim() || importing}
                  className={`py-5 px-6 rounded-2xl border border-white/15 ${
                    importPrivateKey.trim() && !importing
                      ? 'bg-black'
                      : 'bg-black/50'
                  }`}
                >
                  <Text
                    className={`text-center font-medium text-base ${
                      importPrivateKey.trim() && !importing ? 'text-white' : 'text-white/40'
                    }`}
                  >
                    {importing ? 'Importing...' : 'Import Wallet'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      </>
    );
  }

  const totalValue = getTotalUSDCValue(balances);
  const selectedChainBalance = balances.find(b => b.chainId === selectedChain.id);

  return (
    <SafeAreaView className="flex-1 bg-black">
            <Header 
        title="Wallet" 
        subtitle={`${totalValue} USDC`}
      />
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshBalances} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Wallet Card - Compact Design */}
        <View className="px-4 pt-4 pb-6">
          <View className="mx-2 rounded-3xl border border-white/20 bg-white/8 p-6">
            {/* Balance at top */}
            <View className="items-center mb-4">
              <Text className="text-sm text-white/60 font-medium mb-1 tracking-wide">TOTAL BALANCE</Text>
              <View className="flex-row items-baseline mb-1">
                <Text className="text-4xl font-light text-white tracking-tight mr-2">${totalValue}</Text>
                <Text className="text-base text-white/70 font-light">USD</Text>
              </View>
              <Text className="text-xs text-white/50 font-light">USDC across all networks</Text>
            </View>

            {/* Active Wallet Info - Integrated */}
            {activeWallet && (
              <View className="border-t border-white/10 pt-4">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-white/10 rounded-xl items-center justify-center">
                    <WalletIcon size={16} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium text-sm">{activeWallet.name}</Text>
                    <Text className="text-white/60 text-xs font-mono">{formatAddress(activeWallet.address)}</Text>
                  </View>
                  <Pressable
                    onPress={() => setShowAccountModal(true)}
                    className="w-8 h-8 bg-white/10 rounded-full items-center justify-center"
                  >
                    <Text className="text-white/70 text-sm">⚙</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions - Prominent */}
        <View className="px-4 pb-6">
          <View className="mx-2 flex-row gap-2">
            <Pressable
              onPress={() => setShowSendModal(true)}
              className="flex-1 bg-black rounded-2xl p-4 flex-row items-center justify-center gap-2 border border-white/15"
            >
              <SendIcon size={16} color="white" />
              <Text className="text-white font-semibold text-sm">Send</Text>
            </Pressable>
            
            <Pressable
              onPress={handleReceive}
              className="flex-1 bg-black border border-white/15 rounded-2xl p-4 flex-row items-center justify-center gap-2"
            >
              <ReceiveIcon size={16} color="white" />
              <Text className="text-white font-semibold text-sm">Receive</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setShowTransactionModal(true);
                loadTransactionHistory();
              }}
              className="flex-1 bg-black border border-white/15 rounded-2xl p-4 flex-row items-center justify-center gap-2"
            >
              <HistoryIcon size={16} color="white" />
              <Text className="text-white font-semibold text-sm">History</Text>
            </Pressable>
          </View>
        </View>

        {/* Network Balances - Compact List */}
        <View className="px-4 pb-8">
          <View className="mx-2">
            <View className="flex-row items-center justify-between mb-4 px-2">
              <Text className="text-white/60 text-sm font-medium tracking-wide">NETWORKS</Text>
              <Text className="text-white/40 text-xs">{balances.length} chains</Text>
            </View>
            
            <View className="gap-2">
              {balances.map((balance, index) => {
                const isSelected = selectedChain.id === balance.chainId;
                return (
                  <Pressable
                    key={balance.chainId}
                    onPress={() => {
                      const chain = SUPPORTED_CHAINS.find(c => c.id === balance.chainId);
                      if (chain) setSelectedChain(chain);
                    }}
                    className={`rounded-2xl border p-4 flex-row items-center justify-between ${
                      isSelected 
                        ? 'bg-black border-white/15' 
                        : 'bg-white/6 border-white/10'
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className={`w-8 h-8 rounded-xl items-center justify-center ${
                        isSelected ? 'bg-white/15' : 'bg-white/10'
                      }`}>
                        <ChainIcon size={14} color="white" />
                      </View>
                      <Text className={`font-medium text-sm ${
                        isSelected ? 'text-white' : 'text-white/90'
                      }`}>
                        {balance.chainName}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className={`font-light text-base ${
                        isSelected ? 'text-white' : 'text-white/90'
                      }`}>
                        {balance.balance}
                      </Text>
                      <Text className="text-xs text-white/50">USDC</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Account Management Modal - Compact */}
      <Modal visible={showAccountModal} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView className="flex-1 bg-black">
          <View className="px-6 py-4 border-b border-white/10">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-medium text-white">Accounts</Text>
              <Pressable
                onPress={() => setShowAccountModal(false)}
                className="w-8 h-8 items-center justify-center bg-white/10 rounded-full"
              >
                <Text className="text-white/80 text-base">×</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            {/* Wallet List - Compact */}
            <View className="gap-3 mb-6">
              {wallets.map((wallet) => (
                <View
                  key={wallet.id}
                  className={`p-4 rounded-2xl border ${
                    activeWallet?.id === wallet.id
                      ? 'bg-black border-white/15'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className={`font-medium text-sm ${
                        activeWallet?.id === wallet.id ? 'text-white' : 'text-white/90'
                      }`}>
                        {wallet.name}
                      </Text>
                      <Text className={`text-xs mt-1 font-mono ${
                        activeWallet?.id === wallet.id ? 'text-white/60' : 'text-white/50'
                      }`}>
                        {formatAddress(wallet.address)}
                      </Text>
                    </View>
                    
                    <View className="flex-row items-center gap-2">
                      {activeWallet?.id !== wallet.id && (
                        <Pressable
                          onPress={() => handleSwitchWallet(wallet.id)}
                          className="px-3 py-1.5 bg-white/10 rounded-full"
                        >
                          <Text className="text-white text-xs font-medium">Switch</Text>
                        </Pressable>
                      )}
                      
                      <Pressable
                        onPress={() => {
                          setSelectedWalletId(wallet.id);
                          setShowWalletMenu(true);
                        }}
                        className="w-8 h-8 bg-white/10 rounded-full items-center justify-center"
                      >
                        <MoreIcon size={14} color="white" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Action Buttons - Compact */}
            <View className="gap-3">
              <Pressable
                onPress={handleCreateNewWallet}
                className="bg-black border border-white/15 rounded-2xl p-4 flex-row items-center justify-center gap-2"
              >
                <AddIcon size={16} color="white" />
                <Text className="text-white font-medium text-sm">Create New Wallet</Text>
              </Pressable>
              
              <Pressable
                onPress={() => setShowImportModal(true)}
                className="bg-black border border-white/15 rounded-2xl p-4 flex-row items-center justify-center gap-2"
              >
                <Text className="text-white font-medium text-sm">Import Wallet</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Send Modal - Compact */}
      <Modal visible={showSendModal} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView className="flex-1 bg-black">
          <View className="px-6 py-4 border-b border-white/10">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-medium text-white">Send USDC</Text>
              <Pressable
                onPress={() => setShowSendModal(false)}
                className="w-8 h-8 items-center justify-center bg-white/10 rounded-full"
              >
                <Text className="text-white/80 text-base">×</Text>
              </Pressable>
            </View>
          </View>

          <View className="flex-1 px-6 py-4">
            <View className="gap-4">
              <View>
                <Text className="text-white/60 text-sm font-medium mb-2">To Address</Text>
                <TextInput
                  value={sendAddress}
                  onChangeText={setSendAddress}
                  placeholder="0x..."
                  placeholderTextColor="#ffffff60"
                  className="bg-white/5 border border-white/20 rounded-2xl px-4 py-3 text-white text-base"
                />
              </View>

              <View>
                <Text className="text-white/60 text-sm font-medium mb-2">Amount</Text>
                <TextInput
                  value={sendAmount}
                  onChangeText={setSendAmount}
                  placeholder="0.00"
                  placeholderTextColor="#ffffff60"
                  keyboardType="numeric"
                  className="bg-white/5 border border-white/20 rounded-2xl px-4 py-3 text-white text-base"
                />
                <Text className="text-white/40 text-xs mt-1">
                  Available: {selectedChainBalance?.balance || '0.00'} USDC
                </Text>
              </View>

              <View>
                <Text className="text-white/60 text-sm font-medium mb-3">Network</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                  <View className="flex-row gap-2">
                    {SUPPORTED_CHAINS.map((chain) => {
                      const chainBalance = balances.find(b => b.chainId === chain.id);
                      const isSelected = selectedChain.id === chain.id;
                      return (
                        <Pressable
                          key={chain.id}
                          onPress={() => setSelectedChain(chain)}
                          className={`px-4 py-3 rounded-2xl border flex-row items-center gap-2 min-w-[120px] ${
                            isSelected 
                              ? 'bg-white/15 border-white/30' 
                              : 'bg-white/5 border-white/15'
                          }`}
                        >
                          <ChainIcon size={14} color="white" />
                          <View className="flex-1">
                            <Text className={`font-medium text-sm ${
                              isSelected ? 'text-white' : 'text-white/80'
                            }`}>
                              {chain.name}
                            </Text>
                            <Text className={`text-xs ${
                              isSelected ? 'text-white/70' : 'text-white/50'
                            }`}>
                              {chainBalance?.balance || '0.00'} USDC
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
                <Text className="text-white/40 text-xs">
                  Available: {selectedChainBalance?.balance || '0.00'} USDC on {selectedChain.name}
                </Text>
              </View>
            </View>

            <View className="mt-6">
              <Pressable
                onPress={handleSend}
                disabled={sending || !sendAddress || !sendAmount}
                className={`py-4 px-6 rounded-2xl border ${
                  !sending && sendAddress && sendAmount
                    ? 'bg-black border-white/15'
                    : 'bg-black/50 border-white/10'
                }`}
              >
                <Text
                  className={`text-center font-medium text-base ${
                    !sending && sendAddress && sendAmount ? 'text-white' : 'text-white/40'
                  }`}
                >
                  {sending ? 'Sending...' : 'Send'}
                </Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Import Wallet Modal */}
      <Modal visible={showImportModal} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView className="flex-1 bg-black">
          <View className="px-6 py-5 border-b border-white/10">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-medium text-white">Import Wallet</Text>
              <Pressable
                onPress={() => setShowImportModal(false)}
                className="w-9 h-9 items-center justify-center bg-white/10 rounded-full"
              >
                <Text className="text-white/80 text-lg">×</Text>
              </Pressable>
            </View>
          </View>

          <View className="flex-1 px-6 py-6">
            <View className="gap-6">
              <View>
                <Text className="text-white/60 text-sm font-medium mb-3">Private Key</Text>
                <TextInput
                  value={importPrivateKey}
                  onChangeText={setImportPrivateKey}
                  placeholder="0x..."
                  placeholderTextColor="#ffffff60"
                  secureTextEntry
                  className="bg-white/5 border border-white/20 rounded-2xl px-5 py-4 text-white text-base font-mono"
                />
              </View>

              <View>
                <Text className="text-white/60 text-sm font-medium mb-3">Wallet Name (Optional)</Text>
                <TextInput
                  value={importName}
                  onChangeText={setImportName}
                  placeholder="My Wallet"
                  placeholderTextColor="#ffffff60"
                  className="bg-white/5 border border-white/20 rounded-2xl px-5 py-4 text-white text-base"
                />
              </View>
            </View>

            <View className="mt-8">
              <Pressable
                onPress={handleImportWallet}
                disabled={importing || !importPrivateKey}
                className={`py-5 px-6 rounded-2xl ${
                  !importing && importPrivateKey
                    ? 'bg-white'
                    : 'bg-white/10'
                }`}
              >
                <Text
                  className={`text-center font-medium text-base ${
                    !importing && importPrivateKey ? 'text-black' : 'text-white/40'
                  }`}
                >
                  {importing ? 'Importing...' : 'Import Wallet'}
                </Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Receive Modal */}
      <Modal visible={showReceiveModal} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView className="flex-1 bg-black">
          <View className="px-6 py-5 border-b border-white/10">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-medium text-white">Receive USDC</Text>
              <Pressable
                onPress={() => setShowReceiveModal(false)}
                className="w-9 h-9 items-center justify-center bg-white/10 rounded-full"
              >
                <Text className="text-white/80 text-lg">×</Text>
              </Pressable>
            </View>
          </View>

          <View className="flex-1 px-6 py-8 items-center justify-center">
            {activeWallet && (
              <View className="items-center gap-8 w-full max-w-sm">
                {/* QR Code */}
                <View className="bg-white p-6 rounded-3xl shadow-lg">
                  <QRCode
                    value={activeWallet.address}
                    size={200}
                    backgroundColor="white"
                    color="black"
                  />
                </View>

                {/* Address */}
                <View className="items-center w-full">
                  <Text className="text-white/60 text-sm font-medium mb-3">Your Address</Text>
                  <Pressable
                    onPress={() => {
                      Clipboard.setString(activeWallet.address);
                      Alert.alert('Address Copied', 'Your wallet address has been copied to clipboard');
                    }}
                    className="bg-white/5 border border-white/20 rounded-2xl p-5 w-full"
                  >
                    <Text className="text-white text-center font-mono text-sm leading-5">
                      {activeWallet.address}
                    </Text>
                  </Pressable>
                  <Text className="text-white/40 text-sm mt-3 text-center">
                    Tap to copy address
                  </Text>
                </View>

                {/* Network Info */}
                <View className="bg-white/5 border border-white/20 rounded-2xl p-5 w-full">
                  <Text className="text-white/60 text-sm font-medium mb-4">Supported Networks</Text>
                  {SUPPORTED_CHAINS.map((chain) => (
                    <View key={chain.id} className="flex-row items-center gap-3 py-2">
                      <ChainIcon size={16} color="white" />
                      <Text className="text-white text-base">{chain.name}</Text>
                    </View>
                  ))}
                </View>

                {/* Warning */}
                <View className="bg-white/5 border border-white/20 rounded-2xl p-5 w-full">
                  <Text className="text-white/80 text-sm text-center leading-5">
                    ⚠️ Only send USDC on Base or Base Sepolia networks to this address
                  </Text>
                </View>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Transaction History Modal */}
      <Modal visible={showTransactionModal} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView className="flex-1 bg-black">
          <View className="px-6 py-4 border-b border-white/10">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-medium text-white">Transaction History</Text>
              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={loadTransactionHistory}
                  disabled={isLoadingTx}
                  className={`w-8 h-8 items-center justify-center rounded-full ${
                    isLoadingTx ? 'bg-white/5' : 'bg-white/10'
                  }`}
                >
                  <Text className={`text-white/80 text-base ${isLoadingTx ? 'animate-spin' : ''}`}>
                    ⟳
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowTransactionModal(false)}
                  className="w-8 h-8 items-center justify-center bg-white/10 rounded-full"
                >
                  <Text className="text-white/80 text-base">×</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Chain Filter */}
          <View className="px-6 py-4 border-b border-white/10">
            <Text className="text-white/60 text-sm font-medium mb-3">Filter by Network</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => {
                    setSelectedTxChain(null);
                    loadTransactionHistory();
                  }}
                  className={`px-4 py-2 rounded-full border ${
                    !selectedTxChain 
                      ? 'bg-white/10 border-white/20' 
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <Text className={`text-sm font-medium ${
                    !selectedTxChain ? 'text-white' : 'text-white/70'
                  }`}>
                    All Networks
                  </Text>
                </Pressable>
                
                {SUPPORTED_CHAINS.map((chain) => (
                  <Pressable
                    key={chain.id}
                    onPress={() => {
                      setSelectedTxChain(chain);
                      loadTransactionHistory();
                    }}
                    className={`px-4 py-2 rounded-full border ${
                      selectedTxChain?.id === chain.id 
                        ? 'bg-white/10 border-white/20' 
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${
                      selectedTxChain?.id === chain.id ? 'text-white' : 'text-white/70'
                    }`}>
                      {chain.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Transaction List */}
          <ScrollView className="flex-1 px-6 py-4">
            {isLoadingTx ? (
              <View className="flex-1 items-center justify-center py-16">
                <View className="w-16 h-16 bg-white/10 rounded-full items-center justify-center mb-4 animate-spin">
                  <Text className="text-white text-2xl">⟳</Text>
                </View>
                <Text className="text-white font-medium text-lg mb-2">Loading Transactions</Text>
                <Text className="text-white/60 text-center text-sm max-w-sm">
                  Fetching your transaction history from blockchain...
                </Text>
              </View>
            ) : filteredTransactions.length > 0 ? (
              <View className="gap-3">
                {filteredTransactions.map((tx) => (
                  <View
                    key={tx.hash}
                    className="bg-white/5 border border-white/10 rounded-2xl p-4"
                  >
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center gap-3">
                        <View className={`w-8 h-8 rounded-full items-center justify-center ${
                          tx.type === 'sent' ? 'bg-white/10' : 'bg-white/10'
                        }`}>
                          {tx.type === 'sent' ? (
                            <SendIcon size={14} color="white" />
                          ) : (
                            <ReceiveIcon size={14} color="white" />
                          )}
                        </View>
                        <View>
                          <Text className="text-white font-medium text-sm capitalize">
                            {tx.type}
                          </Text>
                          <Text className="text-white/60 text-xs">
                            {SUPPORTED_CHAINS.find(c => c.id === tx.chainId)?.name || 'Unknown'}
                          </Text>
                        </View>
                      </View>
                      
                      <View className="items-end">
                        <Text className={`font-medium text-base ${
                          tx.type === 'sent' ? 'text-white' : 'text-white'
                        }`}>
                          {tx.type === 'sent' ? '-' : '+'}{tx.amount} USDC
                        </Text>
                        <View className={`px-2 py-1 rounded-full ${
                          tx.status === 'confirmed' ? 'bg-white/10' : 
                          tx.status === 'failed' ? 'bg-red-900/30' : 'bg-yellow-900/30'
                        }`}>
                          <Text className={`text-xs font-medium ${
                            tx.status === 'confirmed' ? 'text-white/80' : 
                            tx.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            {tx.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <View className="gap-2">
                      {tx.fromAddress && (
                        <View>
                          <Text className="text-white/60 text-xs">From:</Text>
                          <Text className="text-white text-sm font-mono">
                            {formatAddress(tx.fromAddress)}
                          </Text>
                        </View>
                      )}
                      
                      {tx.toAddress && (
                        <View>
                          <Text className="text-white/60 text-xs">To:</Text>
                          <Text className="text-white text-sm font-mono">
                            {formatAddress(tx.toAddress)}
                          </Text>
                        </View>
                      )}
                      
                      <View>
                        <Text className="text-white/60 text-xs">Hash:</Text>
                        <Text className="text-white text-sm font-mono">
                          {formatAddress(tx.hash)}
                        </Text>
                      </View>
                      
                      <View>
                        <Text className="text-white/60 text-xs">
                          {new Date(tx.timestamp).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="flex-1 items-center justify-center py-16">
                <View className="w-16 h-16 bg-white/10 rounded-full items-center justify-center mb-4">
                  <HistoryIcon size={24} color="white" />
                </View>
                <Text className="text-white font-medium text-lg mb-2">No Transactions</Text>
                <Text className="text-white/60 text-center text-sm max-w-sm">
                  {selectedTxChain 
                    ? `No transactions found on ${selectedTxChain.name}`
                    : 'Your transaction history will appear here when you send or receive USDC'
                  }
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Wallet Menu Modal */}
      <Modal visible={showWalletMenu} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView className="flex-1 bg-black">
          <View className="px-6 py-4 border-b border-white/10">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-medium text-white">Wallet Options</Text>
              <Pressable
                onPress={() => {
                  setShowWalletMenu(false);
                  setSelectedWalletId(null);
                }}
                className="w-8 h-8 items-center justify-center bg-white/10 rounded-full"
              >
                <Text className="text-white/80 text-base">×</Text>
              </Pressable>
            </View>
          </View>

          <View className="flex-1 px-6 py-6">
            {selectedWalletId && (
              <View className="gap-4">
                <Pressable
                  onPress={() => {
                    const wallet = wallets.find(w => w.id === selectedWalletId);
                    if (wallet) {
                      handleRenameWallet(selectedWalletId, wallet.name);
                    }
                  }}
                  className="bg-white/5 border border-white/15 rounded-2xl p-4 flex-row items-center gap-3"
                >
                  <View className="w-10 h-10 bg-white/10 rounded-full items-center justify-center">
                    <Text className="text-white text-lg">✏</Text>
                  </View>
                  <View>
                    <Text className="text-white font-medium text-base">Rename Wallet</Text>
                    <Text className="text-white/60 text-sm">Change wallet display name</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => handleBackupWallet(selectedWalletId)}
                  className="bg-white/5 border border-white/15 rounded-2xl p-4 flex-row items-center gap-3"
                >
                  <View className="w-10 h-10 bg-white/10 rounded-full items-center justify-center">
                    <BackupIcon size={18} color="white" />
                  </View>
                  <View>
                    <Text className="text-white font-medium text-base">Backup Wallet</Text>
                    <Text className="text-white/60 text-sm">Export private key (requires PIN)</Text>
                  </View>
                </Pressable>

                {wallets.length > 1 && (
                  <Pressable
                    onPress={() => handleDeleteWallet(selectedWalletId)}
                    className="bg-white/5 border border-red-500/30 rounded-2xl p-4 flex-row items-center gap-3"
                  >
                    <View className="w-10 h-10 bg-red-500/20 rounded-full items-center justify-center">
                      <DeleteIcon size={18} color="#ef4444" />
                    </View>
                    <View>
                      <Text className="text-red-400 font-medium text-base">Delete Wallet</Text>
                      <Text className="text-red-400/60 text-sm">Remove wallet permanently (requires PIN)</Text>
                    </View>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Rename Wallet Modal */}
      <Modal visible={showRenameModal} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView className="flex-1 bg-black">
          <View className="px-6 py-4 border-b border-white/10">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-medium text-white">Rename Wallet</Text>
              <Pressable
                onPress={() => {
                  setShowRenameModal(false);
                  setNewWalletName('');
                  setSelectedWalletId(null);
                }}
                className="w-8 h-8 items-center justify-center bg-white/10 rounded-full"
              >
                <Text className="text-white/80 text-base">×</Text>
              </Pressable>
            </View>
          </View>

          <View className="flex-1 px-6 py-6">
            <View className="gap-6">
              <View>
                <Text className="text-white/60 text-sm font-medium mb-3">Wallet Name</Text>
                <TextInput
                  value={newWalletName}
                  onChangeText={setNewWalletName}
                  placeholder="Enter wallet name"
                  placeholderTextColor="#ffffff60"
                  className="bg-white/5 border border-white/20 rounded-2xl px-4 py-3 text-white text-base"
                  autoFocus
                />
              </View>

              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => {
                    setShowRenameModal(false);
                    setNewWalletName('');
                    setSelectedWalletId(null);
                  }}
                  className="flex-1 py-4 px-6 rounded-2xl border border-white/15 bg-white/5"
                >
                  <Text className="text-center font-medium text-base text-white/80">Cancel</Text>
                </Pressable>

                <Pressable
                  onPress={confirmRenameWallet}
                  disabled={!newWalletName.trim()}
                  className={`flex-1 py-4 px-6 rounded-2xl border ${
                    newWalletName.trim()
                      ? 'bg-black border-white/15'
                      : 'bg-black/50 border-white/10'
                  }`}
                >
                  <Text
                    className={`text-center font-medium text-base ${
                      newWalletName.trim() ? 'text-white' : 'text-white/40'
                    }`}
                  >
                    Save
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* PIN Prompt Modal */}
      <PinSetupModal
        visible={showPinPrompt}
        onComplete={(pin) => {
          if (pin) {
            handlePinVerified(pin);
          } else {
            setShowPinPrompt(false);
            setPinAction(null);
            setSelectedWalletId(null);
          }
        }}
        mode="verify"
        title={pinAction === 'backup' ? 'Enter PIN to Backup' : pinAction === 'delete' ? 'Enter PIN to Delete' : 'Enter PIN'}
      />
    </SafeAreaView>
  );
}