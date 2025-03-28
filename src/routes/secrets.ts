import { Hono } from "@hono/hono";
import { getCookie } from "@hono/hono/cookie";
import { privy } from "../services/privy.ts";
import redis from "../services/upstash.ts";
import { logger } from "../config/logger.ts";
import { Hex } from "viem";

const app = new Hono();

interface SecretRequest {
  key: string;
  value: string;
}

interface WalletAccount {
  type: string;
  walletClientType: string;
  address: Hex;
}

app.post("/", async (c) => {
  try {
    const { key, value }: SecretRequest = await c.req.json();
    const idToken = getCookie(c, "privy-id-token");

    if (!idToken) {
      logger.warn("Unauthorized request: missing privy-id-token");
      return c.json({ error: "Unauthorized" }, 401);
    }

    const user = await privy.getUser({
      idToken,
    });

    const embeddedWallet = user.linkedAccounts.find(
      (account) =>
        account.type === "wallet" && account.walletClientType === "privy"
    ) as WalletAccount | undefined;

    if (!embeddedWallet) {
      logger.warn("Unauthorized request: no embedded wallet found");
      return c.json({ error: "Unauthorized" }, 401);
    }

    const multi = redis.multi();
    multi.set(`secret:${embeddedWallet.address.toLowerCase()}:${key}`, value);
    multi.sadd(`secret:${embeddedWallet.address.toLowerCase()}:keys`, key);
    await multi.exec();

    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error processing POST request: ${message}`);
    return c.json({ error: message }, 500);
  }
});

app.get("/", async (c) => {
  try {
    const idToken = getCookie(c, "privy-id-token");

    if (!idToken) {
      logger.warn("Unauthorized request: missing privy-id-token");
      return c.json({ error: "Unauthorized" }, 401);
    }

    const user = await privy.getUser({
      idToken,
    });

    const embeddedWallet = user.linkedAccounts.find(
      (account) =>
        account.type === "wallet" && account.walletClientType === "privy"
    ) as WalletAccount | undefined;

    if (!embeddedWallet) {
      logger.warn("Unauthorized request: no embedded wallet found");
      return c.json({ error: "Unauthorized" }, 401);
    }

    const keys = await redis.smembers(
      `secret:${embeddedWallet.address.toLowerCase()}:keys`
    );

    return c.json({ keys });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error processing GET request: ${message}`);
    return c.json({ error: message }, 500);
  }
});

app.delete("/", async (c) => {
  try {
    const idToken = getCookie(c, "privy-id-token");

    if (!idToken) {
      logger.warn("Unauthorized request: missing privy-id-token");
      return c.json({ error: "Unauthorized" }, 401);
    }

    const user = await privy.getUser({
      idToken,
    });

    const embeddedWallet = user.linkedAccounts.find(
      (account) =>
        account.type === "wallet" && account.walletClientType === "privy"
    ) as WalletAccount | undefined;

    if (!embeddedWallet) {
      logger.warn("Unauthorized request: no embedded wallet found");
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { key }: SecretRequest = await c.req.json();
    const multi = redis.multi();
    multi.del(`secret:${embeddedWallet.address.toLowerCase()}:${key}`);
    multi.srem(`secret:${embeddedWallet.address.toLowerCase()}:keys`, key);
    await multi.exec();

    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error processing DELETE request: ${message}`);
    return c.json({ error: message }, 500);
  }
});

export default app;
