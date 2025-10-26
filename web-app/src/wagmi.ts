import { getDefaultConfig } from '@rainbow-me/rainbowkit';
//@ts-ignore
import { base, baseSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'X402 Magic',
  projectId: 'YOUR_PROJECT_ID', // Get this from https://cloud.walletconnect.com
  chains: [baseSepolia],
  ssr: false, // If your dApp uses server side rendering (SSR)
});