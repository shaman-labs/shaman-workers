import { createPublicClient, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { ARB_SEPOLIA_RPC_URL } from "../config/env.ts";


export const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(ARB_SEPOLIA_RPC_URL, {
    batch: true,
  }),
});