import { getContract, Hex } from "viem";
import { WORLD_ADDRESS } from "../config/env.ts";
import { publicClient, walletClient } from "../services/evm.ts";
import { worldAbi } from "./abi/worldAbi.ts";

export const worldContract = getContract({
  address: WORLD_ADDRESS as Hex,
  abi: worldAbi,
  client: {
    public: publicClient,
    wallet: walletClient,
  },
});
