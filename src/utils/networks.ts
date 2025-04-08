/**
 * Network to Chain ID mapping for both EVM and non-EVM networks
 */
import * as chains from "viem/chains";
import { CHAIN_ID } from "../config/env.ts";

// Types
export type NetworkType = "evm" | "solana";

export interface NetworkInfo {
  chainId: number;
  type: NetworkType;
  name: string;
  displayName: string;
  isTestnet: boolean;
}

// EVM Networks mapping using viem chains
export const EVMNetworks: { [key: string]: NetworkInfo } = Object.entries(
  chains,
).reduce((acc, [key, chain]) => {
  // Only include chain objects with an id property
  if (typeof chain === "object" && chain !== null && "id" in chain) {
    // Convert camelCase to lowercase for the name (e.g., arbitrumSepolia -> arbitrumsepolia)
    const name = key.toLowerCase();

    // Determine if it's a testnet by checking common testnet indicators in the name
    const isTestnet = name.includes("testnet") ||
      name.includes("sepolia") ||
      name.includes("goerli") ||
      name.includes("mumbai") ||
      name.includes("fuji") ||
      name.includes("anvil") ||
      name.includes("hardhat");

    acc[key] = {
      chainId: chain.id,
      type: "evm",
      name,
      displayName: chain.name,
      isTestnet,
    };
  }
  return acc;
}, {} as { [key: string]: NetworkInfo });

// Solana Networks mapping
export const SolanaNetworks: { [key: string]: NetworkInfo } = {
  solana: {
    chainId: 101,
    type: "solana",
    name: "solana",
    displayName: "Solana",
    isTestnet: false,
  },
  solanaDevnet: {
    chainId: 103,
    type: "solana",
    name: "solanaDevnet",
    displayName: "Solana Devnet",
    isTestnet: true,
  },
  solanaTestnet: {
    chainId: 102,
    type: "solana",
    name: "solanaTestnet",
    displayName: "Solana Testnet",
    isTestnet: true,
  },
};

// Combined networks mapping
export const Networks = {
  ...EVMNetworks,
  ...SolanaNetworks,
};

// Helper functions
export const getNetworkByChainId = (
  chainId: number,
): NetworkInfo => {
  return Object.values(Networks).find((network) =>
    network.chainId === chainId
  ) ?? Networks[CHAIN_ID];
};

/**
 * Get chain ID by network name
 * @param networkName The network name (case-insensitive)
 * @returns The chain ID for the given network, or undefined if not found
 */
export const getChainId = (networkName: string) => {
  // Try exact match first
  if (Networks[networkName]) {
    return Networks[networkName].chainId;
  }

  // Try case-insensitive match
  const normalizedName = networkName.toLowerCase();
  const network = Object.values(Networks).find((n) =>
    n.name.toLowerCase() === normalizedName ||
    n.displayName.toLowerCase() === normalizedName
  );

  return network?.chainId ?? CHAIN_ID;
};

export const isEVMNetwork = (network: string): boolean => {
  return network in EVMNetworks;
};

export const isSolanaNetwork = (network: string): boolean => {
  return network in SolanaNetworks;
};

export const isTestnet = (network: string): boolean => {
  return Networks[network]?.isTestnet ?? false;
};

// For direct access to viem chain definitions
export { chains as viemChains };
