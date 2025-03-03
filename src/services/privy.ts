import { PrivyClient } from "@privy-io/server-auth";
import { Hex } from "viem";
import {
  PRIVY_APP_ID,
  PRIVY_APP_SECRET,
  PRIVY_AUTH_PRIVATE_KEY,
} from "../config/env.ts";
import { logger } from "../config/logger.ts";
import { Transaction } from "../types/common.ts";

export class ServerWalletClient {
  constructor(public address: Hex, public chainId: number) {
  }

  async sendTransaction(tx: Transaction) {
    logger.info(
      `Sending transaction to: ${tx.to}, value: ${tx.value}, chainId: ${this.chainId}`,
    );
    const { hash } = await privy.walletApi.ethereum.sendTransaction({
      address: this.address,
      chainType: "ethereum",
      caip2: `eip155:${this.chainId}`,
      transaction: {
        to: tx.to,
        value: Number(tx.value),
        data: tx.data,
        chainId: this.chainId,
      },
    });

    return hash;
  }
}

export const privy = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET, {
  walletApi: {
    authorizationPrivateKey: PRIVY_AUTH_PRIVATE_KEY,
  },
});
