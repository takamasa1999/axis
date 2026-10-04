/**
 * 掲示板の E2E（T069 / quickstart.md のシナリオ）。
 * 前提：`npm run db:seed` 済みのローカル環境（サンプルの企業・求人・求職者・運営）。
 * パスワードは .env.local の SEED_STAFF_PASSWORD。
 */
import { expect, type Page, test } from "@playwright/test";

const PASSWORD = process.env.SEED_STAFF_PASSWORD ?? "axis-dev-password";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill(PASSWORD);
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

test.describe("ログインなしで求人を探す（US2）", () => {
  test("トップから求人の一覧・詳細を見られ、応募は登録に案内される", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /仕事と人の掲示板/ })).toBeVisible();
    await page.getByRole("link", { name: "仕事をさがす" }).first().click();
    await expect(page).toHaveURL(/\/jobs/);

    await page
      .getByRole("link", { name: /カフェのホールスタッフ/ })
      .first()
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("カフェのホールスタッフ");
    await expect(page.getByText(/掲載日/)).toBeVisible();
    await expect(page.getByText(/最終更新日/)).toBeVisible();
    // Google の求人検索用の構造化データ
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(JSON.parse(jsonLd ?? "{}")["@type"]).toBe("JobPosting");

    await page.getByRole("link", { name: "応募する" }).click();
    await expect(page).toHaveURL(/\/signup\?as=seeker&next=/);
  });

  test("並び順は名前で分かる基準だけ", async ({ page }) => {
    await page.goto("/jobs?sort=SALARY_DESC");
    await page.getByText("くわしい条件").click();
    const options = await page.locator('select[name="sort"] option').allTextContents();
    expect(options.map((o) => o.replace(/（.*）/, ""))).toEqual(["新着順", "給与の高い順"]);
  });
});

test.describe("求職者（US3）", () => {
  test("求人に質問すると会話が始まる", async ({ page }) => {
    await login(page, "seeker@axis.example");
    await page.goto("/jobs?q=キッチン");
    await page
      .getByRole("link", { name: /焼き菓子づくり/ })
      .first()
      .click();
    await page.getByRole("link", { name: "質問してみる" }).click();
    const question = `見学はできますか？（E2E ${Date.now()}）`;
    await page.getByLabel("質問").fill(question);
    await page.getByRole("button", { name: "質問を送る" }).click();
    await expect(page).toHaveURL(/\/messages\//);
    await expect(page.getByText(question)).toBeVisible();
    await expect(
      page.getByText("このメッセージは、運営も読めません", { exact: false }),
    ).toBeVisible();
  });
});

test.describe("企業（US1・US4）", () => {
  test("マイページと「人をさがす」が見られる", async ({ page }) => {
    await login(page, "cafe@axis.example");
    await expect(page).toHaveURL(/\/employer/);
    await expect(page.getByText("公開中の求人")).toBeVisible();
    await page.goto("/seekers");
    await expect(page.getByText("平日の昼に、接客のお仕事をさがしています")).toBeVisible();
  });

  test("求人の作成は5つのステップで、必須項目が欠けると公開できない", async ({ page }) => {
    await login(page, "cafe@axis.example");
    await page.goto("/employer/jobs/new");
    await page.getByLabel("求人のタイトル").fill(`E2E テスト求人 ${Date.now()}`);
    await page.getByRole("button", { name: /保存して次へ/ }).click();
    await expect(page).toHaveURL(/\/employer\/jobs\/.+\/edit/);
    await page.getByRole("button", { name: /確認して公開/ }).click();
    await expect(page.getByText(/公開する前に、あと \d+ か所あります/)).toBeVisible();
    await expect(page.getByRole("button", { name: "この内容で公開する" })).toBeDisabled();
  });
});

test.describe("運営と通信の秘密（US5）", () => {
  test("ログインしていない人は求職の投稿を見られない", async ({ page }) => {
    await page.goto("/seekers");
    await expect(page).toHaveURL(/\/login/);
  });

  test("運営は会話の画面を開けない", async ({ page, browser }) => {
    // 求職者の会話の URL を用意する
    const seeker = await browser.newPage();
    await login(seeker, "seeker@axis.example");
    await seeker.goto("/messages");
    const href = await seeker.locator('a[href^="/messages/"]').first().getAttribute("href");
    await seeker.close();
    test.skip(!href, "会話がまだない");

    await login(page, "ops@axis.example");
    await expect(page).toHaveURL(/\/ops/);
    await page.goto(href as string);
    await expect(page).not.toHaveURL(/\/messages\//);
  });
});

test.describe("スマートフォンの幅（FR-049）", () => {
  for (const path of ["/", "/jobs", "/signup", "/login", "/contact", "/terms"]) {
    test(`${path} は横スクロールしない`, async ({ page }, info) => {
      test.skip(info.project.name !== "mobile", "スマートフォンの幅だけで確認する");
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
