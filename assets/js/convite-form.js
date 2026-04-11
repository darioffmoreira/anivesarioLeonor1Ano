(function (app) {
    if (!app) {
        return;
    }

    const elements = app.elements;
    const state = app.state;
    const flags = app.flags;
    const constants = app.constants;
    const texts = app.texts;
    const config = app.INVITE_CONFIG;

    function formatSubmissionDate(value) {
        const submissionDate = new Date(value);

        if (!Number.isFinite(submissionDate.getTime())) {
            return "";
        }

        return submissionDate.toLocaleString("pt-PT", {
            dateStyle: "short",
            timeStyle: "short"
        });
    }

    function applyConfig() {
        app.setText("themeEyebrow", config.themeEyebrow);
        app.setText("title", config.title);
        app.setText("heroSubtitle", config.heroSubtitle);

        app.setText("dateLabel", config.labels.date);
        app.setText("timeLabel", config.labels.time);
        app.setText("locationLabel", config.labels.location);
        app.setText("quickContactLabel", config.labels.quickContact);
        app.setText("parkingInfoLabel", config.labels.parkingInfo);
        app.setText("confirmUntilLabel", config.labels.confirmUntil);
        app.setText("timezoneLabel", config.labels.timezone);

        app.setText("dateValue", config.eventDateText);
        app.setText("timeValue", config.eventTimeText);
        app.setText("locationValue", config.eventLocationText);
        app.setText("parkingInfoValue", config.parkingInfoText);
        app.setText("confirmUntilValue", config.confirmUntilText);
        app.setText("timezoneValue", config.eventTimezone);

        app.setHref("locationValue", config.mapDirectionsUrl || config.mapUrl);
        app.setHref("quickContactSms", app.buildSmsHref(config.quickContactPhone || config.quickContactText, config.quickContactSmsMessage));
        app.setHref("quickContactCall", app.buildPhoneHref(config.quickContactPhone || config.quickContactText));
        app.setHref("quickContactWhatsapp", app.buildWhatsAppHref(config.quickContactPhone || config.quickContactText, config.quickContactWhatsappMessage));
        app.setHref("mapLink", config.mapUrl);
        app.setSrc("mapEmbed", config.mapEmbedUrl);
        app.setHref("privacyPolicyLink", config.privacyPolicyUrl || "pages/privacidade.html");
    }

    function updateCountdown() {
        if (!elements.countdownEl) {
            return;
        }

        const diff = app.eventDate.getTime() - Date.now();

        if (diff <= 0) {
            elements.countdownEl.textContent = texts.COUNTDOWN_TODAY_TEXT;
            return;
        }

        const day = 24 * 60 * 60 * 1000;
        const hour = 60 * 60 * 1000;
        const minute = 60 * 1000;

        const days = Math.floor(diff / day);
        const hours = Math.floor((diff % day) / hour);
        const minutes = Math.floor((diff % hour) / minute);

        elements.countdownEl.textContent = app.formatTextTemplate(texts.COUNTDOWN_RUNNING_TEMPLATE, {
            days: days,
            hours: hours,
            minutes: minutes
        });
    }

    function clearSubmissionLockStorage() {
        try {
            window.localStorage.removeItem(constants.SUBMISSION_LOCK_KEY);
        } catch (error) {
            return;
        }
    }

    function readSubmissionLock() {
        if (!flags.isSingleSubmissionLockEnabled) {
            return null;
        }

        try {
            const rawLock = window.localStorage.getItem(constants.SUBMISSION_LOCK_KEY);

            if (!rawLock) {
                return null;
            }

            const parsedLock = JSON.parse(rawLock);

            if (!parsedLock || typeof parsedLock !== "object") {
                clearSubmissionLockStorage();
                return null;
            }

            if (!Number.isFinite(parsedLock.expiresAt) || parsedLock.expiresAt <= Date.now()) {
                // Treat legacy locks without expiresAt as expired to avoid permanent blocks.
                clearSubmissionLockStorage();
                return null;
            }

            return parsedLock;
        } catch (error) {
            clearSubmissionLockStorage();
            return null;
        }
    }

    function storeSubmissionLock(entry) {
        if (!flags.isSingleSubmissionLockEnabled) {
            return;
        }

        const lockPayload = {
            submittedAt: entry.submittedAt,
            guestName: entry.guestName,
            guestCount: entry.guestCount,
            attendance: entry.attendance,
            expiresAt: Date.now() + constants.SUBMISSION_LOCK_TTL_MS
        };

        state.existingSubmissionLock = lockPayload;

        try {
            window.localStorage.setItem(constants.SUBMISSION_LOCK_KEY, JSON.stringify(lockPayload));
        } catch (error) {
            return;
        }
    }

    function applySubmissionLockState() {
        let lockedMessage;
        let submittedAtText;

        if (!flags.isSingleSubmissionLockEnabled || !state.existingSubmissionLock || !elements.form) {
            return;
        }

        elements.form.querySelectorAll("input, select, textarea, button").forEach(function (field) {
            field.disabled = true;
        });

        if (elements.submitBtn) {
            elements.submitBtn.disabled = true;
            setSubmitButtonLoadingState(false);
            elements.submitBtn.textContent = texts.FORM_SUBMIT_LOCKED_TEXT;
        }

        submittedAtText = formatSubmissionDate(state.existingSubmissionLock.submittedAt);
        lockedMessage = submittedAtText
            ? app.formatTextTemplate(texts.SUBMISSION_LOCK_WITH_DATE_TEMPLATE, { submittedAt: submittedAtText })
            : texts.SUBMISSION_LOCK_WITHOUT_DATE_TEXT;

        app.showFeedback("ok", lockedMessage);
    }

    function buildWebhookPayload(entry) {
        const payload = {
            source: "leonor-invite-site",
            submittedAt: entry.submittedAt,
            name: entry.guestName,
            email: entry.guestEmail,
            phone: entry.guestPhone,
            guests: String(entry.guestCount),
            attendance: entry.attendance,
            attendanceLabel: entry.attendanceText,
            message: entry.message,
            eventTitle: config.title,
            eventDateText: config.eventDateText,
            eventTimeText: config.eventTimeText,
            eventLocation: config.eventLocationText,
            consentPrivacyAccepted: entry.consentPrivacyAccepted,
            consentPrivacyAcceptedAt: entry.consentPrivacyAcceptedAt,
            consentPrivacyPolicyVersion: entry.consentPrivacyPolicyVersion
        };

        if (flags.isDigitalTicketEnabled) {
            payload.ticketCode = entry.ticketCode || app.generateTicketCode(entry);
        }

        return payload;
    }

    async function getWebhookErrorMessage(response) {
        let rawPayload = "";
        const statusHint = "Falha no envio (" + response.status + ")";

        try {
            rawPayload = await response.text();
        } catch (error) {
            return statusHint;
        }

        if (!rawPayload) {
            return statusHint;
        }

        try {
            const parsedPayload = JSON.parse(rawPayload);

            if (parsedPayload && typeof parsedPayload.error === "string") {
                return parsedPayload.error;
            }

            if (parsedPayload && typeof parsedPayload.message === "string") {
                return parsedPayload.message;
            }

            if (Array.isArray(parsedPayload.errors) && parsedPayload.errors.length > 0) {
                return parsedPayload.errors.map(function (entry) {
                    return entry && entry.message ? entry.message : "";
                }).filter(Boolean).join(" ");
            }
        } catch (error) {
            // Keep raw payload fallback when response is not JSON.
        }

        return statusHint + ": " + rawPayload.slice(0, 200);
    }

    function buildThankYouUrl(entry) {
        const params = new URLSearchParams();
        const ticketCode = entry.ticketCode || app.generateTicketCode(entry);

        params.set("nome", entry.guestName);
        params.set("presenca", entry.attendance || "coming");
        params.set("pessoas", String(app.normalizeGuestCount(entry.guestCount)));
        params.set("ingressoAtivo", flags.isDigitalTicketEnabled ? "1" : "0");

        if (flags.isDigitalTicketEnabled) {
            params.set("ingresso", ticketCode);
        }

        params.set("evento", config.title);
        params.set("dataEvento", config.eventDateText);
        params.set("horaEvento", config.eventTimeText);
        params.set("localEvento", config.eventLocationText);

        return "pages/agradecimento.html?" + params.toString();
    }

    function sanitizePhoneInput(value) {
        return String(value || "").trim().replace(/[^\d+]/g, "");
    }

    function normalizePhoneE164Lite(value) {
        const sanitized = sanitizePhoneInput(value);
        const plusMatches = sanitized.match(/\+/g);
        const plusCount = plusMatches ? plusMatches.length : 0;

        if (!sanitized) {
            return "";
        }

        if (plusCount > 1 || sanitized.indexOf("+") > 0) {
            return sanitized;
        }

        return sanitized.charAt(0) === "+"
            ? "+" + sanitized.slice(1).replace(/\D+/g, "")
            : sanitized.replace(/\D+/g, "");
    }

    function isValidPhoneE164Lite(value) {
        return /^\+?\d{9,15}$/.test(String(value || ""));
    }

    function readFormValues() {
        const attendanceSelect = elements.attendanceInput;
        const messageEl = document.getElementById("message");
        const guestName = elements.guestNameInput ? elements.guestNameInput.value.trim() : "";
        const guestPhoneRaw = elements.guestPhoneInput ? elements.guestPhoneInput.value : "";
        const guestPhone = normalizePhoneE164Lite(guestPhoneRaw);
        const guestEmail = elements.guestEmailInput ? elements.guestEmailInput.value.trim() : "";

        if (elements.guestPhoneInput) {
            elements.guestPhoneInput.value = guestPhone;
        }

        if (elements.guestEmailInput) {
            elements.guestEmailInput.value = guestEmail;
        }

        return {
            guestName: guestName,
            guestPhone: guestPhone,
            guestEmail: guestEmail,
            guestCount: elements.guestCountInput ? elements.guestCountInput.value : "",
            attendance: attendanceSelect ? attendanceSelect.value : "",
            attendanceText: attendanceSelect && attendanceSelect.selectedIndex >= 0
                ? attendanceSelect.options[attendanceSelect.selectedIndex].text
                : "",
            message: messageEl ? messageEl.value.trim() : "",
            hasPrivacyConsent: !!(elements.privacyConsentInput && elements.privacyConsentInput.checked),
            botTrapValue: elements.botTrapInput ? elements.botTrapInput.value.trim() : ""
        };
    }

    function validateEntry(values) {
        const numericGuestCount = Number(values.guestCount || 1);
        const isNativeEmailValid = elements.guestEmailInput && typeof elements.guestEmailInput.checkValidity === "function"
            ? elements.guestEmailInput.checkValidity()
            : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.guestEmail);

        if (!values.guestName || !values.guestPhone || !values.guestEmail || !values.guestCount || !values.attendance || !values.message) {
            return { error: texts.FORM_REQUIRED_FIELDS_TEXT };
        }

        if (!isNativeEmailValid) {
            return { error: texts.FORM_INVALID_EMAIL_TEXT };
        }

        if (!values.hasPrivacyConsent) {
            return { error: texts.FORM_PRIVACY_CONSENT_REQUIRED_TEXT };
        }

        if (!isValidPhoneE164Lite(values.guestPhone)) {
            return { error: texts.FORM_INVALID_PHONE_TEXT };
        }

        if (!Number.isFinite(numericGuestCount) || numericGuestCount < 1 || numericGuestCount > 20) {
            return { error: texts.FORM_GUEST_COUNT_RANGE_TEXT };
        }

        return {
            error: "",
            numericGuestCount: numericGuestCount
        };
    }

    function buildEntry(values, numericGuestCount) {
        const submittedAt = new Date().toISOString();

        return {
            submittedAt: submittedAt,
            guestName: values.guestName,
            guestPhone: values.guestPhone,
            guestEmail: values.guestEmail,
            guestCount: numericGuestCount,
            attendance: values.attendance,
            attendanceText: values.attendanceText,
            message: values.message,
            consentPrivacyAccepted: values.hasPrivacyConsent,
            consentPrivacyAcceptedAt: submittedAt,
            consentPrivacyPolicyVersion: String(config.privacyPolicyVersion || "")
        };
    }

    function setSubmitButtonLoadingState(isLoading) {
        if (!elements.submitBtn) {
            return;
        }

        elements.submitBtn.classList.toggle("is-loading", !!isLoading);
        elements.submitBtn.setAttribute("aria-busy", isLoading ? "true" : "false");
    }

    function setupPhoneNormalization() {
        if (!elements.guestPhoneInput) {
            return;
        }

        elements.guestPhoneInput.addEventListener("input", function () {
            this.value = sanitizePhoneInput(this.value);
        });
    }

    function setupRsvpForm() {
        if (!elements.form || state.formSubmitBound) {
            return;
        }

        state.formSubmitBound = true;
        setupPhoneNormalization();

        elements.form.addEventListener("submit", async function (event) {
            event.preventDefault();
            let entry;
            let formValues;
            let validation;

            if (flags.isSingleSubmissionLockEnabled && state.existingSubmissionLock) {
                applySubmissionLockState();
                return;
            }

            formValues = readFormValues();
            validation = validateEntry(formValues);

            if (formValues.botTrapValue) {
                app.showFeedback("ok", texts.FORM_SUCCESS_SIMPLE_TEXT);
                return;
            }

            if (validation.error) {
                app.showFeedback("error", validation.error);
                return;
            }

            entry = buildEntry(formValues, validation.numericGuestCount);
            entry.ticketCode = flags.isDigitalTicketEnabled ? app.generateTicketCode(entry) : "";

            if (!config.emailService.enabled || config.emailService.endpoint.indexOf("SEU_WEBHOOK_AQUI") !== -1) {
                app.showFeedback("error", texts.FORM_CONFIGURE_WEBHOOK_TEXT);
                return;
            }

            if (elements.submitBtn) {
                elements.submitBtn.disabled = true;
                setSubmitButtonLoadingState(true);
                elements.submitBtn.textContent = texts.FORM_SUBMIT_SENDING_TEXT;
            }

            try {
                const body = buildWebhookPayload(entry);
                const response = await fetch(config.emailService.endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    const detailedError = await getWebhookErrorMessage(response);
                    throw new Error(detailedError);
                }

                storeSubmissionLock(entry);
                elements.form.reset();
                if (elements.guestCountInput) {
                    elements.guestCountInput.value = "1";
                }
                app.showFeedback("ok", texts.FORM_SUCCESS_REDIRECT_TEXT);

                if (app.audio && typeof app.audio.stopBackgroundMusic === "function") {
                    app.audio.stopBackgroundMusic();
                }

                window.setTimeout(function () {
                    window.location.href = buildThankYouUrl(entry);
                }, 900);
            } catch (error) {
                const errorMessage = error && error.message ? error.message : "";
                const isFileProtocol = window.location.protocol === "file:";
                const isNetworkError = /failed to fetch|networkerror|load failed/i.test(errorMessage);

                if (isFileProtocol && isNetworkError) {
                    app.showFeedback("error", texts.FORM_LOCAL_MODE_SEND_ERROR_TEXT);
                } else if (errorMessage) {
                    app.showFeedback("error", texts.FORM_SEND_ERROR_PREFIX_TEXT + errorMessage);
                } else {
                    app.showFeedback("error", texts.FORM_GENERIC_SEND_ERROR_TEXT);
                }

                console.error("Falha no envio do formulário:", error);
            } finally {
                if (elements.submitBtn) {
                    setSubmitButtonLoadingState(false);

                    if (flags.isSingleSubmissionLockEnabled && state.existingSubmissionLock) {
                        elements.submitBtn.disabled = true;
                        elements.submitBtn.textContent = texts.FORM_SUBMIT_LOCKED_TEXT;
                    } else {
                        elements.submitBtn.disabled = false;
                        elements.submitBtn.textContent = texts.FORM_SUBMIT_DEFAULT_TEXT;
                    }
                }
            }
        });
    }

    app.form = {
        applyConfig: applyConfig,
        updateCountdown: updateCountdown,
        readSubmissionLock: readSubmissionLock,
        applySubmissionLockState: applySubmissionLockState,
        setupRsvpForm: setupRsvpForm
    };
})(window.LEONOR_INVITE);
