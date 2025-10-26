import { createPublicClient, createWalletClient, http, formatUnits, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { getWalletPrivateKey } from './pin-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// USDC Contract Addresses
export const USDC_CONTRACTS = {
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
  [baseSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
} as const;

// Chain configurations
export const SUPPORTED_CHAINS = [base, baseSepolia] as const;

export type SupportedChain = typeof SUPPORTED_CHAINS[number];

// USDC ABI (minimal for balance and transfer + events)
export const USDC_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
] as const;

export interface WalletBalance {
  chainId: number;
  chainName: string;
  balance: string; // USDC balance as string (formatted)
  rawBalance: bigint; // Raw balance for calculations
}

export interface ChainConfig {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: {
    default: {
      http: string[];
    };
  };
  blockExplorers: {
    default: {
      name: string;
      url: string;
    };
  };
  testnet?: boolean;
}

// Get public client for a chain
export const getPublicClient = (chain: SupportedChain) => {
  return createPublicClient({
    chain,
    transport: http(),
  });
};

// Get wallet client for a chain
export const getWalletClient = async (chain: SupportedChain, pin: string, walletId: string) => {
  const privateKey = await getWalletPrivateKey(pin, walletId);
  if (!privateKey) return null;
  
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  
  return createWalletClient({
    account,
    chain,
    transport: http(),
  });
};

// Get USDC balance for a specific chain
export const getUSDCBalance = async (address: string, chain: SupportedChain): Promise<WalletBalance | null> => {
  try {
    const publicClient = getPublicClient(chain);
    const usdcAddress = USDC_CONTRACTS[chain.id];
    
    if (!usdcAddress) {
      throw new Error(`USDC contract not found for chain ${chain.id}`);
    }
    
    const balance = await publicClient.readContract({
      address: usdcAddress as `0x${string}`,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    }) as bigint;
    
    // USDC has 6 decimals
    const formattedBalance = formatUnits(balance, 6);
    
    return {
      chainId: chain.id,
      chainName: chain.name,
      balance: formattedBalance,
      rawBalance: balance,
    };
  } catch (error) {
    console.error(`Error fetching USDC balance for ${chain.name}:`, error);
    return null;
  }
};

// Get USDC balances for all supported chains
export const getAllUSDCBalances = async (address: string): Promise<WalletBalance[]> => {
  const balancePromises = SUPPORTED_CHAINS.map(chain => getUSDCBalance(address, chain));
  const balances = await Promise.all(balancePromises);
  
  return balances.filter((balance): balance is WalletBalance => balance !== null);
};

// Get total USDC value across all chains
export const getTotalUSDCValue = (balances: WalletBalance[]): string => {
  // Filter out testnet balances (Base Sepolia) from total calculation
  const mainnetBalances = balances.filter(balance => balance.chainId !== baseSepolia.id);
  
  const total = mainnetBalances.reduce((sum, balance) => {
    return sum + parseFloat(balance.balance);
  }, 0);
  
  return total.toFixed(2);
};

// Transfer USDC
export const transferUSDC = async (
  to: string,
  amount: string,
  chain: SupportedChain,
  pin: string,
  walletId: string
): Promise<string | null> => {
  try {
    const walletClient = await getWalletClient(chain, pin, walletId);
    if (!walletClient) return null;
    
    const usdcAddress = USDC_CONTRACTS[chain.id];
    if (!usdcAddress) {
      throw new Error(`USDC contract not found for chain ${chain.id}`);
    }
    
    // Convert amount to proper format (USDC has 6 decimals)
    const amountInWei = parseUnits(amount, 6);
    
    const hash = await walletClient.writeContract({
      address: usdcAddress as `0x${string}`,
      abi: USDC_ABI,
      functionName: 'transfer',
      args: [to as `0x${string}`, amountInWei],
    });

    // Record the transaction in history
    const transaction: TransactionHistory = {
      hash,
      type: 'sent',
      amount,
      fromAddress: walletClient.account.address,
      toAddress: to,
      chainId: chain.id,
      timestamp: Date.now(),
      blockNumber: BigInt(0), // Will be updated when confirmed
      status: 'pending'
    };
    
    await addTransaction(transaction);
    
    return hash;
  } catch (error) {
    console.error('Error transferring USDC:', error);
    return null;
  }
};

// Get transaction receipt
export const getTransactionReceipt = async (hash: string, chain: SupportedChain) => {
  try {
    const publicClient = getPublicClient(chain);
    return await publicClient.getTransactionReceipt({ hash: hash as `0x${string}` });
  } catch (error) {
    console.error('Error getting transaction receipt:', error);
    return null;
  }
};

// Validate address format
export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Format address for display
export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Get chain by ID
export const getChainById = (chainId: number): SupportedChain | undefined => {
  return SUPPORTED_CHAINS.find(chain => chain.id === chainId);
};

// Get explorer URL for transaction
export const getExplorerUrl = (hash: string, chain: SupportedChain): string => {
  return `${chain.blockExplorers.default.url}/tx/${hash}`;
};

// Get explorer URL for address
export const getExplorerAddressUrl = (address: string, chain: SupportedChain): string => {
  return `${chain.blockExplorers.default.url}/address/${address}`;
};

// Transaction History Types
export interface TransactionHistory {
  hash: string;
  type: 'sent' | 'received';
  amount: string;
  fromAddress: string;
  toAddress: string;
  chainId: number;
  timestamp: number;
  blockNumber: bigint;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface BlockchainTransaction {
  hash: string;
  blockNumber: bigint;
  from: string;
  to: string;
  value: bigint;
  timestamp?: number;
}

// Transaction storage functions
const TRANSACTION_HISTORY_KEY = 'transaction_history';

// Legacy functions - keeping for backward compatibility and fallback
export const saveTransactionHistory = async (transactions: TransactionHistory[]): Promise<void> => {
  try {
    await AsyncStorage.setItem('transactionHistory', JSON.stringify(transactions));
  } catch (error) {
    console.error('Failed to save transaction history:', error);
  }
};

export const getTransactionHistory = async (): Promise<TransactionHistory[]> => {
  try {
    const stored = await AsyncStorage.getItem('transactionHistory');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to get transaction history:', error);
    return [];
  }
};

export const addTransaction = async (transaction: TransactionHistory): Promise<void> => {
  try {
    const existing = await getTransactionHistory();
    const updated = [transaction, ...existing];
    await saveTransactionHistory(updated);
  } catch (error) {
    console.error('Failed to add transaction:', error);
  }
};

export const updateTransactionStatus = async (
  hash: string, 
  status: 'confirmed' | 'failed', 
  blockNumber?: bigint
): Promise<void> => {
  try {
    const transactions = await getTransactionHistory();
    const updatedTransactions = transactions.map(tx => 
      tx.hash === hash ? { ...tx, status, blockNumber: blockNumber || tx.blockNumber } : tx
    );
    await saveTransactionHistory(updatedTransactions);
  } catch (error) {
    console.error('Failed to update transaction status:', error);
  }
};

export const getTransactionsByChain = async (chainId?: number): Promise<TransactionHistory[]> => {
  try {
    const transactions = await getTransactionHistory();
    if (!chainId) return transactions;
    return transactions.filter(tx => tx.chainId === chainId);
  } catch (error) {
    console.error('Failed to get transactions by chain:', error);
    return [];
  }
};

// New function to fetch USDC transactions from blockchain events
export const fetchUSDCTransactionsFromBlockchain = async (
  walletAddress: string,
  chainId?: number
): Promise<TransactionHistory[]> => {
  try {
    const chainsToFetch = chainId ? [chainId] : [base.id, baseSepolia.id];
    const allTransactions: TransactionHistory[] = [];

    for (const currentChainId of chainsToFetch) {
      const chain = currentChainId === base.id ? base : baseSepolia;
      const usdcAddress = USDC_CONTRACTS[currentChainId as keyof typeof USDC_CONTRACTS];

      const client = createPublicClient({
        chain,
        transport: http(),
      });

      // Get current block number
      const currentBlock = await client.getBlockNumber();
      const fromBlock = currentBlock - BigInt(10000); // Look back ~10000 blocks

      // Fetch Transfer events where user is sender (sent transactions)
      const sentEvents = await client.getLogs({
        address: usdcAddress as `0x${string}`,
        event: {
          type: 'event',
          name: 'Transfer',
          inputs: [
            { indexed: true, name: 'from', type: 'address' },
            { indexed: true, name: 'to', type: 'address' },
            { indexed: false, name: 'value', type: 'uint256' },
          ],
        },
        args: {
          from: walletAddress as `0x${string}`,
        },
        fromBlock,
        toBlock: 'latest',
      });

      // Fetch Transfer events where user is receiver (received transactions)
      const receivedEvents = await client.getLogs({
        address: usdcAddress as `0x${string}`,
        event: {
          type: 'event',
          name: 'Transfer',
          inputs: [
            { indexed: true, name: 'from', type: 'address' },
            { indexed: true, name: 'to', type: 'address' },
            { indexed: false, name: 'value', type: 'uint256' },
          ],
        },
        args: {
          to: walletAddress as `0x${string}`,
        },
        fromBlock,
        toBlock: 'latest',
      });

      // Process sent transactions
      for (const event of sentEvents) {
        if (!event.args) continue;
        
        const block = await client.getBlock({ blockNumber: event.blockNumber });
        const amount = formatUnits(event.args.value as bigint, 6); // USDC has 6 decimals

        allTransactions.push({
          hash: event.transactionHash!,
          type: 'sent',
          amount,
          fromAddress: event.args.from as string,
          toAddress: event.args.to as string,
          chainId: currentChainId,
          timestamp: Number(block.timestamp) * 1000, // Convert to milliseconds
          blockNumber: event.blockNumber,
          status: 'confirmed',
        });
      }

      // Process received transactions
      for (const event of receivedEvents) {
        if (!event.args) continue;
        
        const block = await client.getBlock({ blockNumber: event.blockNumber });
        const amount = formatUnits(event.args.value as bigint, 6); // USDC has 6 decimals

        allTransactions.push({
          hash: event.transactionHash!,
          type: 'received',
          amount,
          fromAddress: event.args.from as string,
          toAddress: event.args.to as string,
          chainId: currentChainId,
          timestamp: Number(block.timestamp) * 1000, // Convert to milliseconds
          blockNumber: event.blockNumber,
          status: 'confirmed',
        });
      }
    }

    // Sort by timestamp (newest first)
    return allTransactions.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to fetch transactions from blockchain:', error);
    return [];
  }
};

export const clearTransactionHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TRANSACTION_HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear transaction history:', error);
  }
};