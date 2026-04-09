(function (app) {
    if (!app) {
        return;
    }

    const elements = app.elements;
    const state = app.state;
    const constants = app.constants;
    const flags = app.flags;
    const minnieMessages = app.minnieMessages;

    function showMinnieMessage(text, kindClass) {
        if (!elements.minnieFunLayer) {
            return;
        }

        const messageEl = document.createElement("div");

        messageEl.className = "minnie-fun-message" + (kindClass ? " " + kindClass : "");
        messageEl.textContent = text;
        elements.minnieFunLayer.appendChild(messageEl);

        app.removeElementLater(messageEl, constants.MINNIE_EFFECT_DURATION_MS);
    }

    function spawnMinnieConfetti(amount, spreadPx) {
        if (!elements.minnieFunLayer) {
            return;
        }

        const fragment = document.createDocumentFragment();
        const piecesToCreate = flags.prefersReducedMotion ? Math.min(12, amount) : amount;

        for (let i = 0; i < piecesToCreate; i += 1) {
            const piece = document.createElement("span");
            const angle = Math.random() * Math.PI * 2;
            const distance = 56 + Math.random() * spreadPx;
            const x = Math.cos(angle) * distance;
            const y = (Math.sin(angle) * distance) - (22 + Math.random() * 46);
            const rotation = Math.round((Math.random() * 780) - 390);

            piece.className = "minnie-confetti" + (Math.random() > 0.64 ? " is-round" : "");
            piece.style.setProperty("--tx", x.toFixed(2) + "px");
            piece.style.setProperty("--ty", y.toFixed(2) + "px");
            piece.style.setProperty("--rot", rotation + "deg");
            piece.style.setProperty("--confetti-color", app.pickRandom(minnieMessages.confettiColors));
            piece.style.animationDelay = (Math.random() * 0.12).toFixed(2) + "s";

            fragment.appendChild(piece);
            app.removeElementLater(piece, 1400);
        }

        elements.minnieFunLayer.appendChild(fragment);
    }

    function spawnSiteWideConfettiAt(x, y, amount, spreadPx) {
        if (!elements.siteConfettiLayer) {
            return;
        }

        const fragment = document.createDocumentFragment();
        const piecesToCreate = flags.prefersReducedMotion ? Math.min(10, amount) : amount;

        for (let i = 0; i < piecesToCreate; i += 1) {
            const piece = document.createElement("span");
            const angle = Math.random() * Math.PI * 2;
            const distance = 52 + Math.random() * spreadPx;
            const dx = Math.cos(angle) * distance;
            const dy = (Math.sin(angle) * distance) - (16 + Math.random() * 34);
            const rotation = Math.round((Math.random() * 740) - 370);

            piece.className = "site-confetti" + (Math.random() > 0.65 ? " is-round" : "");
            piece.style.left = x.toFixed(2) + "px";
            piece.style.top = y.toFixed(2) + "px";
            piece.style.setProperty("--tx", dx.toFixed(2) + "px");
            piece.style.setProperty("--ty", dy.toFixed(2) + "px");
            piece.style.setProperty("--rot", rotation + "deg");
            piece.style.setProperty("--confetti-color", app.pickRandom(minnieMessages.confettiColors));
            piece.style.animationDelay = (Math.random() * 0.08).toFixed(2) + "s";

            fragment.appendChild(piece);
            app.removeElementLater(piece, 1350);
        }

        elements.siteConfettiLayer.appendChild(fragment);
    }

    function pulseMinnieWrap() {
        if (!elements.minnieFrameWrap || flags.prefersReducedMotion) {
            return;
        }

        elements.minnieFrameWrap.classList.remove("is-celebrating");
        void elements.minnieFrameWrap.offsetWidth;
        elements.minnieFrameWrap.classList.add("is-celebrating");

        window.setTimeout(function () {
            if (elements.minnieFrameWrap) {
                elements.minnieFrameWrap.classList.remove("is-celebrating");
            }
        }, 430);
    }

    function celebrateMinnieClick(event) {
        const now = Date.now();
        let message = app.pickRandom(minnieMessages.messages);
        let messageClass = "";
        let confettiAmount = 20;
        let confettiSpread = 118;
        let isRapidMode = false;
        const clickPoint = app.getViewportClickPosition(event, elements.minnieFrameWrap);

        if (now - state.lastMinnieClickAt < constants.MINNIE_CLICK_COOLDOWN_MS) {
            return;
        }

        state.lastMinnieClickAt = now;
        state.minnieClicksCount += 1;

        if (now - state.lastRapidMinnieClickAt <= constants.MINNIE_RAPID_CLICK_WINDOW_MS) {
            state.minnieRapidClickStreak += 1;
        } else {
            state.minnieRapidClickStreak = 1;
        }

        state.lastRapidMinnieClickAt = now;
        isRapidMode = state.minnieRapidClickStreak >= constants.MINNIE_RAPID_CLICK_MIN_STREAK;

        if (state.minnieClicksCount % 10 === 0) {
            message = app.pickRandom(minnieMessages.megaMessages);
            messageClass = "is-mega";
            confettiAmount = 48;
            confettiSpread = 210;
        } else if (state.minnieClicksCount % 5 === 0) {
            message = app.pickRandom(minnieMessages.milestoneMessages);
            messageClass = "is-milestone";
            confettiAmount = 34;
            confettiSpread = 162;
        }

        if (isRapidMode) {
            message = app.pickRandom(minnieMessages.turboMessages);
            messageClass = "is-mega";
            confettiAmount += 14 + Math.min(28, (state.minnieRapidClickStreak - constants.MINNIE_RAPID_CLICK_MIN_STREAK) * 5);
            confettiSpread += 80;
        }

        pulseMinnieWrap();
        showMinnieMessage(message, messageClass);
        spawnMinnieConfetti(confettiAmount, confettiSpread);
        spawnSiteWideConfettiAt(clickPoint.x, clickPoint.y, Math.max(14, Math.round(confettiAmount * 0.6)), confettiSpread + 44);

        if (isRapidMode && !flags.prefersReducedMotion) {
            window.setTimeout(function () {
                spawnMinnieConfetti(Math.max(16, Math.round(confettiAmount * 0.6)), confettiSpread + 36);
                spawnSiteWideConfettiAt(clickPoint.x, clickPoint.y, Math.max(12, Math.round(confettiAmount * 0.4)), confettiSpread + 70);
            }, 120);
        }
    }

    function handleSiteWideConfettiClick(event) {
        const now = Date.now();
        let clickPoint;
        const target = event && event.target ? event.target : null;
        const skipSelector = "button, a, input, select, textarea, option, label, iframe, canvas, .party-game-stage";

        if (!elements.siteConfettiLayer) {
            return;
        }

        if (event && event.button && event.button !== 0) {
            return;
        }

        if (now - state.lastSiteConfettiAt < constants.SITE_CLICK_CONFETTI_COOLDOWN_MS) {
            return;
        }

        if (target && typeof target.closest === "function" && target.closest(skipSelector)) {
            return;
        }

        if (elements.minnieFrameWrap && event && event.target && elements.minnieFrameWrap.contains(event.target)) {
            return;
        }

        state.lastSiteConfettiAt = now;
        clickPoint = app.getViewportClickPosition(event, document.body);

        spawnSiteWideConfettiAt(clickPoint.x, clickPoint.y, 14, 130);
    }

    function setupSiteWideConfetti() {
        if (!elements.siteConfettiLayer) {
            return;
        }

        document.addEventListener("click", handleSiteWideConfettiClick, { passive: true });
    }

    function setupMinnieSurprises() {
        if (!elements.minnieFrameWrap) {
            return;
        }

        if (elements.minnieSurpriseBtn) {
            elements.minnieSurpriseBtn.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                celebrateMinnieClick(event);
            });
        }

        elements.minnieFrameWrap.addEventListener("click", function (event) {
            if (elements.minnieSurpriseBtn && event.target === elements.minnieSurpriseBtn) {
                return;
            }

            event.stopPropagation();
            celebrateMinnieClick(event);
        });
    }

    app.minnie = {
        setupMinnieSurprises: setupMinnieSurprises,
        setupSiteWideConfetti: setupSiteWideConfetti
    };
})(window.LEONOR_INVITE);
