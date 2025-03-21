import { createPublicClient, createWalletClient, Hex, http } from "viem";
import { arbitrumSepolia, base } from "viem/chains";
import { CHAIN_ID, OPERATOR_PRIVATE_KEY, RPC_URL } from "../config/env.ts";
import { privateKeyToAccount } from "viem/accounts";

export const availableChains = [arbitrumSepolia, base];
export const chain = availableChains.find((chain) => chain.id === CHAIN_ID) ??
  arbitrumSepolia;

export const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL, {
    batch: true,
  }),
});

export const operatorAccount = privateKeyToAccount(OPERATOR_PRIVATE_KEY as Hex);

export const walletClient = createWalletClient({
  account: operatorAccount,
  chain,
  transport: http(RPC_URL, {
    batch: true,
  }),
});
