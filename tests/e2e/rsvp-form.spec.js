const { test, expect } = require("@playwright/test");

const FIRST_VISIT_LOADER_KEY = "leonor_invite_first_visit_loader_v1";
const SUBMISSION_LOCK_KEY = "leonor_invite_submission_lock_v1";
const PIPEDREAM_ENDPOINT_REGEX = /https:\/\/.*\.m\.pipedream\.net\/?/i;

const messages = {
  required: "Preenche todos os campos obrigatórios assinalados com *.",
  invalidEmail: "Introduz um email válido.",
  guestCountRange: "O número de pessoas deve estar entre 1 e 20.",
  successSimple: "Resposta enviada com sucesso.",
  successRedirect: "Resposta enviada com sucesso. A redirecionar...",
  submitSending: "A enviar...",
  submitDefault: "Enviar resposta",
  submitLocked: "Resposta já enviada",
  submissionLockPrefix: "Já recebemos a tua resposta neste dispositivo",
  sendErrorPrefix: "Não foi possível enviar: "
};

async function openInvite(page, options = {}) {
  const { lockEntry = null } = options;

  await page.addInitScript(
    ({ loaderKey }) => {
      try {
        window.localStorage.setItem(loaderKey, "1");
      } catch (error) {
        // Ignore localStorage restrictions when unavailable.
      }
    },
    {
      loaderKey: FIRST_VISIT_LOADER_KEY
    }
  );

  await page.goto("/");
  await expect(page.locator("#rsvpForm")).toBeVisible();

  if (lockEntry) {
    await page.evaluate(
      ({ lockKey, entry }) => {
        window.localStorage.setItem(lockKey, JSON.stringify(entry));
      },
      {
        lockKey: SUBMISSION_LOCK_KEY,
        entry: lockEntry
      }
    );

    await page.reload();
    await expect(page.locator("#rsvpForm")).toBeVisible();
  }
}

async function fillValidForm(page, overrides = {}) {
  const data = {
    guestName: "Maria Silva",
    guestPhone: "912 345 678",
    guestEmail: "maria.silva@example.com",
    guestCount: "3",
    attendance: "coming",
    message: "Vamos estar presentes e felizes por celebrar.",
    ...overrides
  };

  await page.fill("#guestName", data.guestName);
  await page.fill("#guestPhone", data.guestPhone);
  await page.fill("#guestEmail", data.guestEmail);
  await page.fill("#guestCount", data.guestCount);
  await page.selectOption("#attendance", data.attendance);
  await page.fill("#message", data.message);

  return data;
}

function buildSuccessfulRoute(page, options = {}) {
  const { status = 200, body = { ok: true }, delayMs = 0 } = options;
  const calls = [];

  return page.route(PIPEDREAM_ENDPOINT_REGEX, async (route) => {
    const request = route.request();
    const rawBody = request.postData() || "{}";

    calls.push({
      url: request.url(),
      method: request.method(),
      body: JSON.parse(rawBody)
    });

    if (delayMs > 0) {
      await new Promise((resolve) => {
        setTimeout(resolve, delayMs);
      });
    }

    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body)
    });
  }).then(() => calls);
}

test.describe("RSVP form critical flow", () => {
  test("shows required fields error when submitting empty form", async ({ page }) => {
    await openInvite(page);

    await page.click("#submitBtn");

    await expect(page.locator("#formFeedback")).toHaveText(messages.required);
  });

  test("shows invalid email error", async ({ page }) => {
    await openInvite(page);
    await fillValidForm(page, { guestEmail: "email-invalido" });

    await page.click("#submitBtn");

    await expect(page.locator("#formFeedback")).toHaveText(messages.invalidEmail);
  });

  test("shows guest count range error when value is outside allowed limits", async ({ page }) => {
    await openInvite(page);
    await fillValidForm(page, { guestCount: "21" });

    await page.click("#submitBtn");

    await expect(page.locator("#formFeedback")).toHaveText(messages.guestCountRange);
  });

  test("honeypot submission exits early and does not call webhook", async ({ page }) => {
    let webhookHits = 0;

    await page.route(PIPEDREAM_ENDPOINT_REGEX, async (route) => {
      webhookHits += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true })
      });
    });

    await openInvite(page);
    await page.evaluate(() => {
      const botTrap = document.getElementById("botTrap");
      botTrap.value = "spam-bot";
    });
    await page.click("#submitBtn");

    await expect(page.locator("#formFeedback")).toHaveText(messages.successSimple);
    expect(webhookHits).toBe(0);
  });

  test("submits successfully, sends expected payload, and redirects to thank-you page", async ({ page }) => {
    const calls = await buildSuccessfulRoute(page, { delayMs: 250 });

    await openInvite(page);
    const validData = await fillValidForm(page);

    await page.click("#submitBtn");

    await expect(page.locator("#submitBtn")).toHaveText(messages.submitSending);
    await expect(page.locator("#formFeedback")).toHaveText(messages.successRedirect);
    await page.waitForURL(/\/pages\/agradecimento\.html\?/);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].body.name).toBe(validData.guestName);
    expect(calls[0].body.email).toBe(validData.guestEmail);
    expect(calls[0].body.phone).toBe("912345678");
    expect(calls[0].body.guests).toBe(validData.guestCount);
    expect(calls[0].body.attendance).toBe(validData.attendance);
    expect(calls[0].body.message).toBe(validData.message);
    expect(typeof calls[0].body.ticketCode).toBe("string");
    expect(calls[0].body.ticketCode.length).toBeGreaterThan(0);

    const currentUrl = new URL(page.url());
    expect(currentUrl.pathname).toContain("/pages/agradecimento.html");
    expect(currentUrl.searchParams.get("nome")).toBe(validData.guestName);
    expect(currentUrl.searchParams.get("presenca")).toBe(validData.attendance);
    expect(currentUrl.searchParams.get("pessoas")).toBe(validData.guestCount);
    expect(currentUrl.searchParams.get("ingressoAtivo")).toBe("1");
    expect(currentUrl.searchParams.get("ingresso")).toBeTruthy();
  });

  test("shows webhook error details and keeps submit button ready for retry", async ({ page }) => {
    await page.route(PIPEDREAM_ENDPOINT_REGEX, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Webhook fora de serviço" })
      });
    });

    await openInvite(page);
    await fillValidForm(page);
    await page.click("#submitBtn");

    await expect(page.locator("#formFeedback")).toHaveText(messages.sendErrorPrefix + "Webhook fora de serviço");
    await expect(page.locator("#submitBtn")).toHaveText(messages.submitDefault);
    await expect(page).toHaveURL(/\/index\.html$|\/$/);
  });

  test("locks form after a successful submission when returning to the invitation page", async ({ page }) => {
    await page.route(PIPEDREAM_ENDPOINT_REGEX, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true })
      });
    });

    await openInvite(page);
    await fillValidForm(page);
    await page.click("#submitBtn");
    await page.waitForURL(/\/pages\/agradecimento\.html\?/);

    await page.goto("/index.html");

    await expect(page.locator("#formFeedback")).toContainText(messages.submissionLockPrefix);
    await expect(page.locator("#submitBtn")).toBeDisabled();
    await expect(page.locator("#submitBtn")).toHaveText(messages.submitLocked);
    await expect(page.locator("#guestName")).toBeDisabled();
  });

  test("prevents duplicate webhook calls from fast repeated submissions", async ({ page }) => {
    const calls = await buildSuccessfulRoute(page, { delayMs: 350 });

    await openInvite(page);
    await fillValidForm(page);

    await page.dblclick("#submitBtn");

    await page.waitForURL(/\/pages\/agradecimento\.html\?/);

    expect(calls).toHaveLength(1);
  });
});
