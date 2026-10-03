"use client";

import { magicLinkClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** 画面側から使う認証クライアント */
export const authClient = createAuthClient({
  plugins: [magicLinkClient(), twoFactorClient()],
});
