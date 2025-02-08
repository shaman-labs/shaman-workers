import { createPublicClient, createWalletClient, Hex, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { ARB_SEPOLIA_RPC_URL, OPERATOR_PRIVATE_KEY } from "../config/env.ts";
import { privateKeyToAccount } from 'viem/accounts'


export const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(ARB_SEPOLIA_RPC_URL, {
    batch: true,
  }),
});

export const operatorAccount = privateKeyToAccount(OPERATOR_PRIVATE_KEY as Hex);

export const walletClient = createWalletClient({
  account: operatorAccount,
  chain: arbitrumSepolia,
  transport: http(ARB_SEPOLIA_RPC_URL, {
    batch: true,
  }),
});