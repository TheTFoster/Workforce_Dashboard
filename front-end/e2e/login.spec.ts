import { expect, test } from "@playwright/test";

const APP_BASE = process.env.E2E_APP_BASE ?? "/cec-employee-database";

test.describe("login flow", () => {
  test("renders login form and toggles password visibility", async ({ page }) => {
    await page.goto(`${APP_BASE}/login`);

    await expect(
      page.getByRole("heading", { name: /employee database/i })
    ).toBeVisible();
    await expect(page.getByLabel(/username \(cec id\)/i)).toBeVisible();
    const passwordInput = page.getByLabel("Password", { exact: true });
    await expect(passwordInput).toBeVisible();

    const toggle = page.getByRole("button", { name: /password/i });
    await toggle.click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: /hide password/i }).click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("shows validation error when credentials are missing", async ({ page }) => {
    await page.goto(`${APP_BASE}/login`);
    await page.getByLabel(/username \(cec id\)/i).fill(" ");
    await page.getByLabel("Password", { exact: true }).fill(" ");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page.getByText(/enter your cec id and password/i)).toBeVisible();
    await expect(page.getByRole("alert")).toContainText(
      /enter your cec id and password/i
    );
  });

  test("logs in and redirects when the backend returns success", async ({ page }) => {
    // Mock the backend endpoints the login form calls
    await page.route("**/csrf-token", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ token: "csrf-token" }),
      })
    );
    await page.route("**/api/v1/auth/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      })
    );

    await page.goto(`${APP_BASE}/login`);
    await page.evaluate(() => {
      sessionStorage.setItem("postLoginRedirect", "/ping");
    });

    await page.getByLabel(/username \(cec id\)/i).fill("demo");
    await page.getByLabel("Password", { exact: true }).fill("password123!");
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page).toHaveURL(/\/ping$/);
    await expect(page.getByText("OK")).toBeVisible();
  });
});
