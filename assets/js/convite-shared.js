(function () {
    if (window.LEONOR_INVITE) {
        return;
    }

    const INVITE_CONFIG = {
        themeEyebrow: "Festa de Aniversário Minnie",
        title: "A Leonor faz 1 aninho",
        heroSubtitle: "Junta-te a nós para celebrar este dia tão especial!",
        eventDateISO: "2026-05-09T15:30:00+01:00",
        eventTimezone: "Europe/Lisbon",
        eventDateText: "Sábado, 9 de Maio",
        eventTimeText: "15h30",
        eventLocationText: "Av. Xanana Gusmão 369, 4460-840 Custoias - Matosinhos",
        quickContactText: "+351912686014",
        quickContactPhone: "+351912686014",
        quickContactSmsMessage: "Ola! Tenho uma duvida sobre o convite da Leonor.",
        quickContactWhatsappMessage: "Ola! Tenho uma duvida sobre o convite da Leonor.",
        parkingInfoText: "Estacionamento gratuito ao redor.",
        confirmUntilText: "30 Abril",
        mapUrl: "https://maps.app.goo.gl/zihM4u8z5jqbvsU6A",
        mapDirectionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Av.%20Xanana%20Gusmao%20369%2C%204460-840%20Custoias%20-%20Matosinhos",
        mapEmbedUrl: "https://maps.google.com/maps?q=Av.%20Xanana%20Gusmao%20369%2C%204460-840%20Custoias%20-%20Matosinhos&z=16&output=embed",
        backgroundMusicUrl: "assets/media/audio.mp3",
        backgroundMusicVolume: 0.45,
        backgroundMusicAutoPauseAfterCycles: 3,
        privacyPolicyUrl: "pages/privacidade.html",
        privacyPolicyVersion: "2026-04-11",
        emailService: {
            endpoint: "https://904aad8ee6a35604b384ac2cde5a6617.m.pipedream.net",
            enabled: true
        },
        features: {
            enableDigitalTicket: true,
            enableSingleSubmissionLock: true
        },
        labels: {
            date: "Data:",
            time: "Hora:",
            location: "Local:",
            quickContact: "Contacto rápido:",
            parkingInfo: "Estacionamento:",
            confirmUntil: "Confirma até:",
            timezone: "Fuso horário:"
        }
    };

    const conviteTextConfig = (window.SITE_TEXTS_PT_PT && window.SITE_TEXTS_PT_PT.convite) || {};
    const audioTextConfig = conviteTextConfig.audio || {};
    const countdownTextConfig = conviteTextConfig.countdown || {};
    const minnieTextConfig = conviteTextConfig.minnie || {};
    const formTextConfig = conviteTextConfig.form || {};
    const submissionLockTextConfig = conviteTextConfig.submissionLock || {};

    const AUDIO_PAUSE_LABEL = typeof audioTextConfig.pauseLabel === "string" ? audioTextConfig.pauseLabel : "Pausar música";
    const AUDIO_RESUME_LABEL = typeof audioTextConfig.resumeLabel === "string" ? audioTextConfig.resumeLabel : "Retomar música";
    const AUDIO_UNLOCK_HINT_TEXT = typeof audioTextConfig.unlockHint === "string" ? audioTextConfig.unlockHint : "Toque para ativar som";

    const COUNTDOWN_LOADING_TEXT = typeof countdownTextConfig.loading === "string" ? countdownTextConfig.loading : "A carregar contagem decrescente...";
    const COUNTDOWN_TODAY_TEXT = typeof countdownTextConfig.today === "string" ? countdownTextConfig.today : "Hoje é dia de festa.";
    const COUNTDOWN_RUNNING_TEMPLATE = typeof countdownTextConfig.runningTemplate === "string"
        ? countdownTextConfig.runningTemplate
        : "A festa começa em {days} dias, {hours} horas e {minutes} minutos.";

    const FORM_SUBMIT_DEFAULT_TEXT = typeof formTextConfig.submitDefault === "string" ? formTextConfig.submitDefault : "Enviar resposta";
    const FORM_SUBMIT_SENDING_TEXT = typeof formTextConfig.submitSending === "string" ? formTextConfig.submitSending : "A enviar...";
    const FORM_SUBMIT_LOCKED_TEXT = typeof formTextConfig.submitLocked === "string" ? formTextConfig.submitLocked : "Resposta já enviada";
    const FORM_SUCCESS_SIMPLE_TEXT = typeof formTextConfig.successSimple === "string" ? formTextConfig.successSimple : "Resposta enviada com sucesso.";
    const FORM_SUCCESS_REDIRECT_TEXT = typeof formTextConfig.successRedirect === "string" ? formTextConfig.successRedirect : "Resposta enviada com sucesso. A redirecionar...";
    const FORM_REQUIRED_FIELDS_TEXT = typeof formTextConfig.requiredFields === "string" ? formTextConfig.requiredFields : "Preenche todos os campos obrigatórios assinalados com *.";
    const FORM_INVALID_EMAIL_TEXT = typeof formTextConfig.invalidEmail === "string" ? formTextConfig.invalidEmail : "Introduz um email válido.";
    const FORM_INVALID_PHONE_TEXT = typeof formTextConfig.invalidPhone === "string"
        ? formTextConfig.invalidPhone
        : "Introduz um telemóvel válido (9 a 15 dígitos, com + opcional no início).";
    const FORM_GUEST_COUNT_RANGE_TEXT = typeof formTextConfig.guestCountRange === "string" ? formTextConfig.guestCountRange : "O número de pessoas deve estar entre 1 e 20.";
    const FORM_PRIVACY_CONSENT_REQUIRED_TEXT = typeof formTextConfig.privacyConsentRequired === "string"
        ? formTextConfig.privacyConsentRequired
        : "Para enviar a resposta, tens de aceitar a Política de Privacidade.";
    const FORM_CONFIGURE_WEBHOOK_TEXT = typeof formTextConfig.configureWebhook === "string"
        ? formTextConfig.configureWebhook
        : "Configura primeiro o endpoint do webhook no Pipedream no INVITE_CONFIG.";
    const FORM_LOCAL_MODE_SEND_ERROR_TEXT = typeof formTextConfig.localModeSendError === "string"
        ? formTextConfig.localModeSendError
        : "Não foi possível enviar em modo local. Abre o convite num servidor (http/https) e tenta novamente.";
    const FORM_SEND_ERROR_PREFIX_TEXT = typeof formTextConfig.sendErrorPrefix === "string" ? formTextConfig.sendErrorPrefix : "Não foi possível enviar: ";
    const FORM_GENERIC_SEND_ERROR_TEXT = typeof formTextConfig.genericSendError === "string"
        ? formTextConfig.genericSendError
        : "Não foi possível enviar. Verifica o endpoint do webhook no Pipedream.";

    const SUBMISSION_LOCK_WITH_DATE_TEMPLATE = typeof submissionLockTextConfig.feedbackWithDate === "string"
        ? submissionLockTextConfig.feedbackWithDate
        : "Já recebemos a tua resposta neste dispositivo em {submittedAt}.";
    const SUBMISSION_LOCK_WITHOUT_DATE_TEXT = typeof submissionLockTextConfig.feedbackWithoutDate === "string"
        ? submissionLockTextConfig.feedbackWithoutDate
        : "Já recebemos a tua resposta neste dispositivo.";

    const DEFAULT_MINNIE_MESSAGES = [
        "A Minnie mandou um beijinho.",
        "Mais brilho para a festa.",
        "A Leonor adorou esse clique.",
        "Sorrisos em modo festa.",
        "Um clique cheio de magia."
    ];

    const DEFAULT_MINNIE_MILESTONE_MESSAGES = [
        "Uau! Clique especial de festa.",
        "Confetti extra para celebrar.",
        "A Minnie entrou em modo wow."
    ];

    const DEFAULT_MINNIE_MEGA_MESSAGES = [
        "Modo turbo da Minnie ativado.",
        "A Minnie esta em modo danca.",
        "Nivel arco-iris desbloqueado."
    ];

    const DEFAULT_MINNIE_TURBO_MESSAGES = [
        "Cliques turbo! Chuva de confetis.",
        "A Minnie girou 3 piruetas seguidas.",
        "Modo festa maxima nos teus cliques."
    ];

    function resolveTextArray(candidate, fallback) {
        if (!Array.isArray(candidate) || candidate.length === 0) {
            return fallback;
        }

        return candidate.filter(function (entry) {
            return typeof entry === "string" && entry.trim() !== "";
        }).length > 0
            ? candidate
            : fallback;
    }

    const featureConfig = INVITE_CONFIG.features || {};

    const app = {
        INVITE_CONFIG: INVITE_CONFIG,
        eventDate: new Date(INVITE_CONFIG.eventDateISO),
        elements: {
            countdownEl: document.getElementById("countdown"),
            form: document.getElementById("rsvpForm"),
            submitBtn: document.getElementById("submitBtn"),
            feedbackEl: document.getElementById("formFeedback"),
            guestNameInput: document.getElementById("guestName"),
            guestPhoneInput: document.getElementById("guestPhone"),
            guestEmailInput: document.getElementById("guestEmail"),
            guestCountInput: document.getElementById("guestCount"),
            attendanceInput: document.getElementById("attendance"),
            privacyConsentInput: document.getElementById("privacyConsent"),
            botTrapInput: document.getElementById("botTrap"),
            firstVisitLoader: document.getElementById("firstVisitLoader"),
            bgMusic: document.getElementById("bgMusic"),
            audioToggleBtn: document.getElementById("audioToggleBtn"),
            audioToggleIcon: document.getElementById("audioToggleIcon"),
            audioUnlockHint: document.getElementById("audioUnlockHint"),
            siteConfettiLayer: document.getElementById("siteConfettiLayer"),
            minnieFrameWrap: document.querySelector(".minnie-frame-wrap"),
            minnieSurpriseBtn: document.getElementById("minnieSurpriseBtn"),
            minnieFunLayer: document.getElementById("minnieFunLayer")
        },
        constants: {
            FIRST_VISIT_LOADER_KEY: "leonor_invite_first_visit_loader_v1",
            FIRST_VISIT_LOADER_DURATION_MS: 6000,
            AUDIO_AUTOSTART_RETRY_INTERVAL_MS: 2200,
            AUDIO_FADE_IN_DURATION_MS: 900,
            AUDIO_FADE_OUT_DURATION_MS: 820,
            AUDIO_FADE_STEP_MS: 40,
            MINNIE_CLICK_COOLDOWN_MS: 120,
            MINNIE_RAPID_CLICK_WINDOW_MS: 900,
            MINNIE_RAPID_CLICK_MIN_STREAK: 3,
            MINNIE_EFFECT_DURATION_MS: 1900,
            SITE_CLICK_CONFETTI_COOLDOWN_MS: 90,
            SUBMISSION_LOCK_KEY: "leonor_invite_submission_lock_v1",
            SUBMISSION_LOCK_TTL_MS: 30 * 24 * 60 * 60 * 1000
        },
        flags: {
            isDigitalTicketEnabled: featureConfig.enableDigitalTicket ?? true,
            isSingleSubmissionLockEnabled: featureConfig.enableSingleSubmissionLock ?? true,
            prefersReducedMotion: window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
        },
        state: {
            userPausedAudio: false,
            hasAutoStartFallback: false,
            audioAutoStartRetryTimer: null,
            audioUnlockHintTimer: null,
            audioFadeTimer: null,
            hasTriedMutedBootstrap: false,
            completedAutoAudioCycles: 0,
            hasManualAudioOverride: false,
            hasReachedAutoAudioLimit: false,
            lastSiteConfettiAt: 0,
            minnieClicksCount: 0,
            lastMinnieClickAt: 0,
            minnieRapidClickStreak: 0,
            lastRapidMinnieClickAt: 0,
            existingSubmissionLock: null,
            hasInitialized: false,
            formSubmitBound: false
        },
        texts: {
            AUDIO_PAUSE_LABEL: AUDIO_PAUSE_LABEL,
            AUDIO_RESUME_LABEL: AUDIO_RESUME_LABEL,
            AUDIO_UNLOCK_HINT_TEXT: AUDIO_UNLOCK_HINT_TEXT,
            COUNTDOWN_LOADING_TEXT: COUNTDOWN_LOADING_TEXT,
            COUNTDOWN_TODAY_TEXT: COUNTDOWN_TODAY_TEXT,
            COUNTDOWN_RUNNING_TEMPLATE: COUNTDOWN_RUNNING_TEMPLATE,
            FORM_SUBMIT_DEFAULT_TEXT: FORM_SUBMIT_DEFAULT_TEXT,
            FORM_SUBMIT_SENDING_TEXT: FORM_SUBMIT_SENDING_TEXT,
            FORM_SUBMIT_LOCKED_TEXT: FORM_SUBMIT_LOCKED_TEXT,
            FORM_SUCCESS_SIMPLE_TEXT: FORM_SUCCESS_SIMPLE_TEXT,
            FORM_SUCCESS_REDIRECT_TEXT: FORM_SUCCESS_REDIRECT_TEXT,
            FORM_REQUIRED_FIELDS_TEXT: FORM_REQUIRED_FIELDS_TEXT,
            FORM_INVALID_EMAIL_TEXT: FORM_INVALID_EMAIL_TEXT,
            FORM_INVALID_PHONE_TEXT: FORM_INVALID_PHONE_TEXT,
            FORM_GUEST_COUNT_RANGE_TEXT: FORM_GUEST_COUNT_RANGE_TEXT,
            FORM_PRIVACY_CONSENT_REQUIRED_TEXT: FORM_PRIVACY_CONSENT_REQUIRED_TEXT,
            FORM_CONFIGURE_WEBHOOK_TEXT: FORM_CONFIGURE_WEBHOOK_TEXT,
            FORM_LOCAL_MODE_SEND_ERROR_TEXT: FORM_LOCAL_MODE_SEND_ERROR_TEXT,
            FORM_SEND_ERROR_PREFIX_TEXT: FORM_SEND_ERROR_PREFIX_TEXT,
            FORM_GENERIC_SEND_ERROR_TEXT: FORM_GENERIC_SEND_ERROR_TEXT,
            SUBMISSION_LOCK_WITH_DATE_TEMPLATE: SUBMISSION_LOCK_WITH_DATE_TEMPLATE,
            SUBMISSION_LOCK_WITHOUT_DATE_TEXT: SUBMISSION_LOCK_WITHOUT_DATE_TEXT
        },
        minnieMessages: {
            messages: resolveTextArray(minnieTextConfig.messages, DEFAULT_MINNIE_MESSAGES),
            milestoneMessages: resolveTextArray(minnieTextConfig.milestoneMessages, DEFAULT_MINNIE_MILESTONE_MESSAGES),
            megaMessages: resolveTextArray(minnieTextConfig.megaMessages, DEFAULT_MINNIE_MEGA_MESSAGES),
            turboMessages: resolveTextArray(minnieTextConfig.turboMessages, DEFAULT_MINNIE_TURBO_MESSAGES),
            confettiColors: [
                "#E65282",
                "#C84673",
                "#f4a9c4",
                "#ffd76d",
                "#ffffff"
            ]
        }
    };

    app.keepOnlyDigits = function (value) {
        return String(value || "").replace(/\D+/g, "");
    };

    app.normalizeGuestCount = function (value) {
        const parsed = Number(value);

        if (!Number.isFinite(parsed)) {
            return 1;
        }

        return Math.max(1, Math.min(20, Math.round(parsed)));
    };

    app.createTicketHashSeed = function (value) {
        let hash = 0;

        for (let index = 0; index < value.length; index += 1) {
            hash = ((hash * 31) + value.charCodeAt(index)) % 1679616;
        }

        return hash.toString(36).toUpperCase().padStart(4, "0");
    };

    app.generateTicketCode = function (entry) {
        const safeName = String(entry.guestName || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        const namePart = (safeName || "GUEST").slice(0, 3).padEnd(3, "X");
        const countPart = String(app.normalizeGuestCount(entry.guestCount)).padStart(2, "0");
        const phoneDigits = app.keepOnlyDigits(String(entry.guestPhone || ""));
        const phonePart = phoneDigits.slice(-3).padStart(3, "0");
        const attendancePart = String(entry.attendance || "");
        const hashSeed = app.createTicketHashSeed([safeName, phoneDigits, countPart, attendancePart, INVITE_CONFIG.eventDateISO].join("|"));

        return "LEO-" + namePart + countPart + "-" + phonePart + hashSeed;
    };

    app.pickRandom = function (list) {
        return list[Math.floor(Math.random() * list.length)];
    };

    app.removeElementLater = function (node, delayMs) {
        window.setTimeout(function () {
            if (node && node.parentNode) {
                node.parentNode.removeChild(node);
            }
        }, delayMs);
    };

    app.formatTextTemplate = function (template, replacements) {
        let output = String(template || "");

        Object.keys(replacements).forEach(function (key) {
            output = output.replace(new RegExp("\\{" + key + "\\}", "g"), String(replacements[key]));
        });

        return output;
    };

    app.getViewportClickPosition = function (event, fallbackElement) {
        if (event && typeof event.clientX === "number" && typeof event.clientY === "number" && (event.clientX > 0 || event.clientY > 0)) {
            return {
                x: event.clientX,
                y: event.clientY
            };
        }

        if (fallbackElement && typeof fallbackElement.getBoundingClientRect === "function") {
            const rect = fallbackElement.getBoundingClientRect();

            return {
                x: rect.left + (rect.width / 2),
                y: rect.top + (rect.height / 2)
            };
        }

        return {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };
    };

    app.setText = function (id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    };

    app.setHref = function (id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.href = value;
        }
    };

    app.setSrc = function (id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.src = value;
        }
    };

    app.buildPhoneHref = function (value) {
        const normalized = String(value || "").trim().replace(/[^\d+]/g, "");

        if (!normalized) {
            return "";
        }

        return "tel:" + normalized;
    };

    app.buildWhatsAppHref = function (phoneValue, messageValue) {
        const digitsOnly = app.keepOnlyDigits(String(phoneValue || ""));

        if (!digitsOnly) {
            return "";
        }

        const messageText = String(messageValue || "").trim();

        if (!messageText) {
            return "https://wa.me/" + digitsOnly;
        }

        return "https://wa.me/" + digitsOnly + "?text=" + encodeURIComponent(messageText);
    };

    app.buildSmsHref = function (phoneValue, messageValue) {
        const normalized = String(phoneValue || "").trim().replace(/[^\d+]/g, "");

        if (!normalized) {
            return "";
        }

        const messageText = String(messageValue || "").trim();

        if (!messageText) {
            return "sms:" + normalized;
        }

        return "sms:" + normalized + "?body=" + encodeURIComponent(messageText);
    };

    app.showFeedback = function (kind, message) {
        const feedbackEl = app.elements.feedbackEl;

        if (!feedbackEl) {
            return;
        }

        feedbackEl.className = "feedback " + kind;
        feedbackEl.textContent = message;
    };

    window.LEONOR_INVITE = app;
})();
