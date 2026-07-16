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
  await expect(page.locator(".analysis-status")).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "How long did it really run?",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Drop session files", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Choose session files", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".method")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "KO" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "GitHub ↗" }).first(),
  ).toHaveAttribute("href", "https://github.com/team-attention/howlong");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const initialDropzoneBox = await dropzone.boundingBox();
  expect(initialDropzoneBox).not.toBeNull();
  expect(initialDropzoneBox!.y + initialDropzoneBox!.height).toBeLessThanOrEqual(
    testInfo.project.name === "mobile-chromium" ? 844 : 1000,
  );
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.locator("#session-files")).toBeFocused();
  expect(
    await dropzone.evaluate(
      (element) => getComputedStyle(element).outlineWidth,
    ),
  ).toBe("2px");
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

  const initialChooserPromise = page.waitForEvent("filechooser");
  await dropzone.click();
  const initialChooser = await initialChooserPromise;
  await initialChooser.setFiles(fixtures);
  await expect(page.locator("#results")).toBeVisible();
  await expect(page.locator("#upload")).toHaveCount(0);
  await expect(page.locator("#session-files")).toHaveValue("");
  await expect(page.locator("#session-files")).toBeEnabled();
  await expect(page.locator(".analysis-status")).toHaveCount(0);
  await expect(page.locator("#results-title")).toBeFocused();
  await expect
    .poll(async () => (await page.locator("#results").boundingBox())?.y ?? 9999)
    .toBeLessThan(80);
  await expect(page.getByTestId("longest-run")).toContainText("3m 0s");
  await expect(
    page.getByText("OpenCode WAL snapshot may be stale."),
  ).toBeVisible();
  await expect(page.locator(".metric-strip")).toContainText("12");
  await expect(
    page.getByRole("button", { name: "Analyze another" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Clear analysis" }),
  ).toHaveCount(0);

  const html = await page.content();
  const aria = await page.locator("body").ariaSnapshot();
  expect(html).not.toContain(PRIVATE_CANARY);
  expect(aria).not.toContain(PRIVATE_CANARY);
  expect(html).not.toContain("codex-stable.jsonl");
  expect(consoleMessages.join("\n")).not.toContain(PRIVATE_CANARY);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("howlong-metadata.json");
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const exportText = readFileSync(downloadPath!, "utf8");
  expect(exportText).not.toContain(PRIVATE_CANARY);
  const exported = JSON.parse(exportText) as {
    product: string;
    runs: Array<Record<string, unknown>>;
  };
  expect(exported.product).toBe("Howlong");
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
      ? "howlong-desktop.png"
      : "howlong-mobile.png";
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

  const replacementChooserPromise = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Analyze another" })
    .click();
  const replacementChooser = await replacementChooserPromise;
  await replacementChooser.setFiles([fixtures[0]!]);
  await expect(
    page.locator(".metric-strip > div").filter({ hasText: "Runs" }),
  ).toContainText("2");
  await page.getByText("Import details").click();
  await expect(page.locator(".import-summary")).toContainText("1 sources");
  await expect(page.locator("#session-files")).toHaveValue("");
  await expect(page.locator("#session-files")).toBeEnabled();

  expect(allRequests.slice(bootstrapRequestCount)).toEqual([]);
  expect(blockedRequests).toEqual([]);
  expect(websocketUrls).toEqual([]);
  expect(pageErrors).toEqual([]);
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

  await expect(page.locator("#results")).toHaveCount(0);
  await expect(
    page.getByText("No valid sessions were found in those files."),
  ).toBeVisible();
  expect(await page.content()).not.toContain(PRIVATE_CANARY);
  expect(await page.content()).not.toContain("private-notes.txt");
  await expect(page.locator(".dropzone")).toHaveAttribute("data-ready", "true");
});

test("invalid replacement preserves the current result", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".dropzone")).toHaveAttribute("data-ready", "true");
  await page.locator("#session-files").setInputFiles([fixtures[0]!]);
  await expect(page.getByTestId("longest-run")).toContainText("1m 0s");

  const chooserPromise = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Analyze another" })
    .click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: "replacement-private.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(`${PRIVATE_CANARY}\nnot a supported session`),
  });

  await expect(page.getByTestId("longest-run")).toContainText("1m 0s");
  await expect(
    page.locator("#results").getByText(
      "Couldn’t analyze those files. Previous results are unchanged.",
    ),
  ).toBeVisible();
  expect(await page.content()).not.toContain(PRIVATE_CANARY);
  expect(await page.content()).not.toContain("replacement-private.txt");
});
