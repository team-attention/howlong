import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const fixtures = [
  "codex-stable.jsonl",
  "claude-current.jsonl",
  "opencode-latest.sqlite",
  "opencode-export.json",
].map((name) => path.join(process.cwd(), "tests", "fixtures", name));

const PRIVATE_CANARY = "TURNSPAN_PRIVATE_CANARY_7f3b";

test("analyzes local files offline without exposing raw content", async ({
  page,
  context,
}, testInfo) => {
  const allRequests: string[] = [];
  const blockedRequests: string[] = [];
  const websocketUrls: string[] = [];
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  context.on("request", (request) => allRequests.push(request.url()));
  page.on("websocket", (socket) => websocketUrls.push(socket.url()));
  page.on("console", (message) => consoleMessages.push(message.text()));
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const navigation = await page.goto("/");
  expect(navigation).not.toBeNull();
  expect(navigation!.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(navigation!.headers()["x-content-type-options"]).toBe("nosniff");
  const dropzone = page.locator(".dropzone");
  await expect(dropzone).toHaveAttribute("data-ready", "true");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.locator("#session-files")).toBeFocused();
  expect(
    await dropzone.evaluate(
      (element) => getComputedStyle(element).outlineWidth,
    ),
  ).toBe("3px");
  const localBadgeAria = await page.locator(".local-badge").ariaSnapshot();
  expect(localBadgeAria).toContain("Local only · zero uploads");
  expect(localBadgeAria.match(/Local only/g)).toHaveLength(1);

  expect(
    allRequests.every(
      (url) => new URL(url).origin === "http://127.0.0.1:4173",
    ),
  ).toBe(true);
  expect(
    allRequests.every((url) => {
      const pathname = new URL(url).pathname;
      return (
        pathname === "/" ||
        pathname === "/favicon.svg" ||
        pathname.startsWith("/assets/")
      );
    }),
  ).toBe(true);
  const bootstrapRequestCount = allRequests.length;
  await context.route("**/*", async (route) => {
    blockedRequests.push(route.request().url());
    await route.abort("blockedbyclient");
  });
  await context.setOffline(true);

  await page.locator("#session-files").setInputFiles(fixtures);
  await expect(page.locator("#results")).toBeVisible();
  await expect(page.locator("#session-files")).toHaveValue("");
  await expect(dropzone).toHaveAttribute("data-ready", "false");
  await expect(page.getByTestId("longest-run")).toContainText("3m 0s");
  await expect(page.getByText("OpenCode WAL snapshot detected.")).toBeVisible();
  await expect(page.locator(".metric-grid")).toContainText("12");

  expect(allRequests.slice(bootstrapRequestCount)).toEqual([]);
  expect(blockedRequests).toEqual([]);
  expect(websocketUrls).toEqual([]);
  expect(pageErrors).toEqual([]);

  const html = await page.content();
  const aria = await page.locator("body").ariaSnapshot();
  expect(html).not.toContain(PRIVATE_CANARY);
  expect(aria).not.toContain(PRIVATE_CANARY);
  expect(html).not.toContain("codex-stable.jsonl");
  expect(consoleMessages.join("\n")).not.toContain(PRIVATE_CANARY);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download metadata JSON" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const exportText = readFileSync(downloadPath!, "utf8");
  expect(exportText).not.toContain(PRIVATE_CANARY);
  const exported = JSON.parse(exportText) as {
    product: string;
    runs: Array<Record<string, unknown>>;
  };
  expect(exported.product).toBe("Turnspan");
  expect(exported.runs).toHaveLength(12);
  expect(Object.keys(exported.runs[0]!).sort()).toEqual(
    [
      "cacheReadTokens",
      "cacheWriteTokens",
      "completionEvidence",
      "completionStatus",
      "durationMs",
      "endedAt",
      "id",
      "inputTokens",
      "model",
      "outputTokens",
      "provider",
      "reasoningTokens",
      "sourceOrdinal",
      "startedAt",
      "totalTokens",
      "turnOrdinal",
      "warningCodes",
    ].sort(),
  );

  const storage = await page.evaluate(async () => {
    const databases =
      "databases" in indexedDB ? await indexedDB.databases() : [];
    const cacheNames = "caches" in window ? await caches.keys() : [];
    const opfsNames: string[] = [];
    const serviceWorkers = await navigator.serviceWorker.getRegistrations();
    if ("getDirectory" in navigator.storage) {
      const root = await navigator.storage.getDirectory();
      for await (const [name] of root.entries()) {
        opfsNames.push(name);
      }
    }
    return {
      localStorage: localStorage.length,
      sessionStorage: sessionStorage.length,
      databases: databases.map((database) => database.name),
      caches: cacheNames,
      opfs: opfsNames,
      serviceWorkers: serviceWorkers.map((registration) => registration.scope),
    };
  });
  expect(storage).toEqual({
    localStorage: 0,
    sessionStorage: 0,
    databases: [],
    caches: [],
    opfs: [],
    serviceWorkers: [],
  });
  expect(await context.cookies()).toEqual([]);

  const screenshotName =
    testInfo.project.name === "desktop-chromium"
      ? "turnspan-desktop.png"
      : "turnspan-mobile.png";
  await page.screenshot({
    path: path.join(process.cwd(), "docs", "screenshots", screenshotName),
    fullPage: true,
  });

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  if (testInfo.project.name === "mobile-chromium") {
    await page.setViewportSize({ width: 320, height: 800 });
    const narrowOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(narrowOverflow).toBeLessThanOrEqual(0);
  }
});

test("unsupported input fails closed without reflecting source text", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".dropzone")).toHaveAttribute("data-ready", "true");
  await page.locator("#session-files").setInputFiles({
    name: "private-notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(`${PRIVATE_CANARY}\nnot a supported session`),
  });

  await expect(page.locator("#results")).toBeVisible();
  await expect(page.getByText("No valid runs were detected")).toBeVisible();
  expect(await page.content()).not.toContain(PRIVATE_CANARY);
  expect(await page.content()).not.toContain("private-notes.txt");

  await page.getByRole("button", { name: "Clear analysis" }).click();
  await expect(page.locator(".dropzone")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await expect(page.locator("#session-files")).toBeFocused();
});
