const { test, expect } = require("@playwright/test");

function buildThankYouQuery(overrides = {}) {
  const params = new URLSearchParams({
    nome: "Ana Silva",
    presenca: "coming",
    pessoas: "2",
    ingressoAtivo: "1",
    ingresso: "LEO-ANA02-ABCD",
    evento: "Aniversario da Leonor - 1 ano",
    dataEvento: "Sábado, 9 de Maio",
    horaEvento: "15h30",
    localEvento: "Av. Xanana Gusmao 369, 4460-840 Custoias - Matosinhos",
    ...overrides
  });

  return params.toString();
}

async function openThankYouPage(page, queryString = "") {
  const search = queryString ? `?${queryString}` : "";

  await page.goto(`/pages/agradecimento.html${search}`);
  await expect(page.locator("#thanksTitle")).toBeVisible();
}

async function enableMaintenanceMode(page) {
  await page.route("**/assets/js/site-mode.js", async (route) => {
    const response = await route.fetch();
    const originalBody = await response.text();
    const patchedBody = originalBody.replace("enableMaintenanceMode: false", "enableMaintenanceMode: true");

    await route.fulfill({
      response,
      body: patchedBody,
      headers: {
        ...response.headers(),
        "content-type": "application/javascript; charset=utf-8"
      }
    });
  });
}

test.describe("Thank-you page coverage", () => {
  test("renders personalized ticket and calendar actions for confirmed presence", async ({ page }) => {
    await openThankYouPage(page, buildThankYouQuery());

    await expect(page.locator("#thanksTitle")).toHaveText("Obrigada, Ana Silva.");
    await expect(page.locator("#thanksSubtitle")).toHaveText("Que bom! Vamos adorar celebrar contigo.");

    await expect(page.locator("#ticketPanel")).toBeVisible();
    await expect(page.locator("#ticketGuestName")).toHaveText("Ana Silva");
    await expect(page.locator("#ticketGuestCount")).toHaveText("2 pessoas");
    await expect(page.locator("#ticketDate")).toHaveText("Sábado, 9 de Maio");
    await expect(page.locator("#ticketTime")).toHaveText("15h30");
    await expect(page.locator("#ticketCode")).toHaveText("LEO-ANA02-ABCD");

    const calendarHref = await page.getAttribute("#googleCalendarLink", "href");
    expect(calendarHref).toContain("https://calendar.google.com/calendar/render?");

    const calendarUrl = new URL(calendarHref);
    expect(calendarUrl.searchParams.get("action")).toBe("TEMPLATE");
    expect(calendarUrl.searchParams.get("text")).toBe("Aniversario da Leonor - 1 ano");
    expect(calendarUrl.searchParams.get("location")).toBe("Av. Xanana Gusmao 369, 4460-840 Custoias - Matosinhos");

    const icsDownloadPromise = page.waitForEvent("download");
    await page.click("#downloadIcsBtn");
    const icsDownload = await icsDownloadPromise;

    expect(icsDownload.suggestedFilename()).toBe("aniversario-leonor.ics");
  });

  test("hides digital ticket when attendance is not-coming", async ({ page }) => {
    await openThankYouPage(page, buildThankYouQuery({ presenca: "not-coming" }));

    await expect(page.locator("#thanksTitle")).toHaveText("Obrigada, Ana Silva.");
    await expect(page.locator("#thanksSubtitle")).toHaveText("Obrigada pelo carinho da resposta. Vais fazer falta nesta festa.");
    await expect(page.locator("#ticketPanel")).toBeHidden();
  });

  test("hides digital ticket when ingressoAtivo is disabled", async ({ page }) => {
    await openThankYouPage(page, buildThankYouQuery({ ingressoAtivo: "0", presenca: "coming" }));

    await expect(page.locator("#ticketPanel")).toBeHidden();
    await expect(page.locator("#thanksSubtitle")).toHaveText("Que bom! Vamos adorar celebrar contigo.");
  });

  test("uses fallback guest context when query is empty", async ({ page }) => {
    await openThankYouPage(page);

    await expect(page.locator("#thanksTitle")).toHaveText("Obrigada, Convidado(a).");
    await expect(page.locator("#ticketPanel")).toBeHidden();
  });
});

test.describe("Maintenance mode coverage", () => {
  test("redirects index page to maintenance page when maintenance mode is enabled", async ({ page }) => {
    await enableMaintenanceMode(page);

    await page.goto("/index.html");
    await page.waitForURL(/\/pages\/manutencao\.html$/);

    await expect(page.locator("#maintenanceTitle")).toHaveText("Estamos em manutencao.");
  });

  test("redirects pages folder routes to maintenance page", async ({ page }) => {
    await enableMaintenanceMode(page);

    await page.goto("/pages/agradecimento.html?nome=Ana&presenca=coming");
    await page.waitForURL(/\/pages\/manutencao\.html$/);

    await expect(page.locator(".maintenance-status")).toHaveText("Modo manutencao ativo");
  });

  test("does not redirect away from maintenance page itself", async ({ page }) => {
    await enableMaintenanceMode(page);

    await page.goto("/pages/manutencao.html");

    await expect(page).toHaveURL(/\/pages\/manutencao\.html$/);
    await expect(page.locator("#maintenanceTitle")).toHaveText("Estamos em manutencao.");
  });
});