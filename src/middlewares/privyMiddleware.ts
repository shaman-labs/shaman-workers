import { createMiddleware } from "@hono/hono/factory";
import { privy } from "../services/privy.ts";
import { logger } from "../config/logger.ts";
import { WalletWithMetadata } from "@privy-io/server-auth";

export interface User {
  id: string;
  wallet: WalletWithMetadata;
}

const privyMiddleware = createMiddleware<{
  Variables: {
    user: User;
  };
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const idToken = authHeader?.replace("Bearer ", "");

  if (!idToken) {
    logger.warn("Unauthorized request: missing Authorization header");
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = await privy.getUser({
    idToken,
  });

  const embeddedWallet = user.linkedAccounts.find(
    (account) =>
      account.type === "wallet" && account.walletClientType === "privy",
  ) as WalletWithMetadata | undefined;

  if (!embeddedWallet) {
    logger.warn("Unauthorized request: no embedded wallet found");
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", {
    id: user.id,
    wallet: embeddedWallet,
  });

  await next();
});

export default privyMiddleware;
