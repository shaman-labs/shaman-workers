import { PrivyClient } from "@privy-io/server-auth";
import { Hex, toHex } from "viem";
import {
  PRIVY_APP_ID,
  PRIVY_APP_SECRET,
  PRIVY_AUTH_PRIVATE_KEY,
} from "../config/env.ts";
import { Transaction } from "../types/shaman.ts";
import { logger } from "../config/logger.ts";

export const privy = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET, {
  walletApi: {
    authorizationPrivateKey: PRIVY_AUTH_PRIVATE_KEY,
  },
});

export const createServerClient = (address: Hex, chainId: number) => {
  return {
    account: address,
    chainId,
    sendTransaction: async (tx: Transaction) => {
      logger.info(`Sending transaction: ${JSON.stringify(tx)}`);
      const { hash } = await privy.walletApi.ethereum.sendTransaction({
        address,
        chainType: "ethereum",
        caip2: `eip155:${chainId}`,
        transaction: {
          to: tx.to,
          value: toHex(tx.value?.toString() ?? "0x0"),
          data: tx.data,
          chainId,
        },
      });

      return hash;
    },
  };
};
