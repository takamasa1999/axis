"use client";

import { createAuthClient } from "better-auth/react";

/** 画面側から使う認証クライアント（メールアドレス＋パスワードのみ） */
export const authClient = createAuthClient();
