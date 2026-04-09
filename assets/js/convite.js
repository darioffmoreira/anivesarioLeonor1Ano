(function () {
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

            const eventDate = new Date(INVITE_CONFIG.eventDateISO);
            const countdownEl = document.getElementById("countdown");
            const form = document.getElementById("rsvpForm");
            const submitBtn = document.getElementById("submitBtn");
            const feedbackEl = document.getElementById("formFeedback");
            const guestNameInput = document.getElementById("guestName");
            const guestPhoneInput = document.getElementById("guestPhone");
            const guestEmailInput = document.getElementById("guestEmail");
            const guestCountInput = document.getElementById("guestCount");
            const attendanceInput = document.getElementById("attendance");
            const botTrapInput = document.getElementById("botTrap");
            const firstVisitLoader = document.getElementById("firstVisitLoader");
            const bgMusic = document.getElementById("bgMusic");
            const audioToggleBtn = document.getElementById("audioToggleBtn");
            const audioToggleIcon = document.getElementById("audioToggleIcon");
            const audioUnlockHint = document.getElementById("audioUnlockHint");
            const siteConfettiLayer = document.getElementById("siteConfettiLayer");
            const minnieFrameWrap = document.querySelector(".minnie-frame-wrap");
            const minnieSurpriseBtn = document.getElementById("minnieSurpriseBtn");
            const minnieFunLayer = document.getElementById("minnieFunLayer");

            const FIRST_VISIT_LOADER_KEY = "leonor_invite_first_visit_loader_v1";
            const FIRST_VISIT_LOADER_DURATION_MS = 6000;
            const AUDIO_AUTOSTART_RETRY_INTERVAL_MS = 2200;
            const AUDIO_FADE_IN_DURATION_MS = 900;
            const AUDIO_FADE_OUT_DURATION_MS = 820;
            const AUDIO_FADE_STEP_MS = 40;
            const MINNIE_CLICK_COOLDOWN_MS = 120;
            const MINNIE_RAPID_CLICK_WINDOW_MS = 900;
            const MINNIE_RAPID_CLICK_MIN_STREAK = 3;
            const MINNIE_EFFECT_DURATION_MS = 1900;
            const SITE_CLICK_CONFETTI_COOLDOWN_MS = 90;
            let userPausedAudio = false;
            let hasAutoStartFallback = false;
            let audioAutoStartRetryTimer = null;
            let audioUnlockHintTimer = null;
            let audioFadeTimer = null;
            let hasTriedMutedBootstrap = false;
            let lastSiteConfettiAt = 0;
            let minnieClicksCount = 0;
            let lastMinnieClickAt = 0;
            let minnieRapidClickStreak = 0;
            let lastRapidMinnieClickAt = 0;
            const isDigitalTicketEnabled = !!(INVITE_CONFIG.features && INVITE_CONFIG.features.enableDigitalTicket);
            const isSingleSubmissionLockEnabled = !!(INVITE_CONFIG.features && INVITE_CONFIG.features.enableSingleSubmissionLock);
            const SUBMISSION_LOCK_KEY = "leonor_invite_submission_lock_v1";
            let existingSubmissionLock = null;
            const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

            const MINNIE_MESSAGES = [
                "A Minnie mandou um beijinho.",
                "Mais brilho para a festa.",
                "A Leonor adorou esse clique.",
                "Sorrisos em modo festa.",
                "Um clique cheio de magia."
            ];

            const MINNIE_MILESTONE_MESSAGES = [
                "Uau! Clique especial de festa.",
                "Confetti extra para celebrar.",
                "A Minnie entrou em modo wow."
            ];

            const MINNIE_MEGA_MESSAGES = [
                "Modo turbo da Minnie ativado.",
                "A Minnie esta em modo danca.",
                "Nivel arco-iris desbloqueado."
            ];

            const MINNIE_TURBO_MESSAGES = [
                "Cliques turbo! Chuva de confetis.",
                "A Minnie girou 3 piruetas seguidas.",
                "Modo festa maxima nos teus cliques."
            ];

            const MINNIE_CONFETTI_COLORS = [
                "#E65282",
                "#C84673",
                "#f4a9c4",
                "#ffd76d",
                "#ffffff"
            ];

            function keepOnlyDigits(value) {
                return value.replace(/\D+/g, "");
            }

            function normalizeGuestCount(value) {
                const parsed = Number(value);

                if (!Number.isFinite(parsed)) {
                    return 1;
                }

                return Math.max(1, Math.min(20, Math.round(parsed)));
            }

            function createTicketHashSeed(value) {
                let hash = 0;

                for (let index = 0; index < value.length; index += 1) {
                    hash = ((hash * 31) + value.charCodeAt(index)) % 1679616;
                }

                return hash.toString(36).toUpperCase().padStart(4, "0");
            }

            function generateTicketCode(entry) {
                const safeName = String(entry.guestName || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
                const namePart = (safeName || "GUEST").slice(0, 3).padEnd(3, "X");
                const countPart = String(normalizeGuestCount(entry.guestCount)).padStart(2, "0");
                const phoneDigits = keepOnlyDigits(String(entry.guestPhone || ""));
                const phonePart = phoneDigits.slice(-3).padStart(3, "0");
                const attendancePart = String(entry.attendance || "");
                const hashSeed = createTicketHashSeed([safeName, phoneDigits, countPart, attendancePart, INVITE_CONFIG.eventDateISO].join("|"));

                return "LEO-" + namePart + countPart + "-" + phonePart + hashSeed;
            }

            function pickRandom(list) {
                return list[Math.floor(Math.random() * list.length)];
            }

            function removeElementLater(node, delayMs) {
                window.setTimeout(function () {
                    if (node && node.parentNode) {
                        node.parentNode.removeChild(node);
                    }
                }, delayMs);
            }

            function getViewportClickPosition(event, fallbackElement) {
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
            }

            if (guestPhoneInput) {
                guestPhoneInput.addEventListener("input", function () {
                    this.value = keepOnlyDigits(this.value);
                });
            }

            function hasSeenFirstVisitLoader() {
                try {
                    return window.localStorage.getItem(FIRST_VISIT_LOADER_KEY) === "1";
                } catch (error) {
                    return false;
                }
            }

            function markFirstVisitLoaderSeen() {
                try {
                    window.localStorage.setItem(FIRST_VISIT_LOADER_KEY, "1");
                } catch (error) {
                    return;
                }
            }

            function hideFirstVisitLoader() {
                if (!firstVisitLoader) {
                    return;
                }

                firstVisitLoader.classList.remove("is-visible");
                document.body.classList.remove("loader-lock");
            }

            function maybeShowFirstVisitLoader() {
                if (!firstVisitLoader || hasSeenFirstVisitLoader()) {
                    return;
                }

                markFirstVisitLoaderSeen();
                document.body.classList.add("loader-lock");
                firstVisitLoader.classList.add("is-visible");

                firstVisitLoader.addEventListener("click", hideFirstVisitLoader, { once: true });
                window.setTimeout(hideFirstVisitLoader, FIRST_VISIT_LOADER_DURATION_MS);
            }

            function isBackgroundMusicPlaying() {
                return !!bgMusic && !bgMusic.paused && !bgMusic.ended;
            }

            function clearAudioUnlockHintTimer() {
                if (!audioUnlockHintTimer) {
                    return;
                }

                window.clearTimeout(audioUnlockHintTimer);
                audioUnlockHintTimer = null;
            }

            function clearAudioFade() {
                if (!audioFadeTimer) {
                    return;
                }

                window.clearInterval(audioFadeTimer);
                audioFadeTimer = null;
            }

            function fadeAudioTo(targetVolume, durationMs, onComplete) {
                const safeTarget = Math.max(0, Math.min(1, targetVolume));
                const startVolume = Number.isFinite(bgMusic.volume) ? bgMusic.volume : 0;
                const delta = safeTarget - startVolume;

                clearAudioFade();

                if (Math.abs(delta) < 0.01 || durationMs <= 0) {
                    bgMusic.volume = safeTarget;
                    if (typeof onComplete === "function") {
                        onComplete();
                    }
                    return;
                }

                const totalSteps = Math.max(1, Math.round(durationMs / AUDIO_FADE_STEP_MS));
                const stepDuration = Math.max(16, Math.round(durationMs / totalSteps));
                let currentStep = 0;

                audioFadeTimer = window.setInterval(function () {
                    currentStep += 1;
                    bgMusic.volume = startVolume + ((delta * currentStep) / totalSteps);

                    if (currentStep >= totalSteps) {
                        clearAudioFade();
                        bgMusic.volume = safeTarget;

                        if (typeof onComplete === "function") {
                            onComplete();
                        }
                    }
                }, stepDuration);
            }

            function hideAudioUnlockHint() {
                if (!audioUnlockHint) {
                    return;
                }

                clearAudioUnlockHintTimer();
                audioUnlockHint.classList.remove("is-visible");
                audioUnlockHint.hidden = true;
            }

            function showAudioUnlockHint() {
                if (!audioUnlockHint) {
                    return;
                }

                clearAudioUnlockHintTimer();
                audioUnlockHint.hidden = false;

                window.requestAnimationFrame(function () {
                    if (audioUnlockHint) {
                        audioUnlockHint.classList.add("is-visible");
                    }
                });
            }

            function scheduleAudioUnlockHint() {
                if (!audioUnlockHint || userPausedAudio || isBackgroundMusicPlaying()) {
                    hideAudioUnlockHint();
                    return;
                }

                clearAudioUnlockHintTimer();
                audioUnlockHintTimer = window.setTimeout(function () {
                    if (!userPausedAudio && !isBackgroundMusicPlaying()) {
                        showAudioUnlockHint();
                    }
                }, 900);
            }

            function updateAudioToggleState() {
                if (!bgMusic) {
                    return;
                }

                const isPlaying = isBackgroundMusicPlaying();

                if (!audioToggleBtn) {
                    return;
                }

                audioToggleBtn.setAttribute("aria-pressed", isPlaying ? "true" : "false");
                audioToggleBtn.setAttribute("aria-label", isPlaying ? "Pausar música" : "Retomar música");
                audioToggleBtn.setAttribute("title", isPlaying ? "Pausar música" : "Retomar música");
                audioToggleBtn.classList.toggle("is-playing", isPlaying);

                if (audioToggleIcon) {
                    audioToggleIcon.innerHTML = isPlaying ? "&#10074;&#10074;" : "&#9654;";
                    audioToggleIcon.classList.toggle("audio-toggle-btn__icon--pause", isPlaying);
                }

                if (isPlaying) {
                    hideAudioUnlockHint();
                } else if (!userPausedAudio) {
                    scheduleAudioUnlockHint();
                } else {
                    hideAudioUnlockHint();
                }
            }

            function stopAutoStartRetries() {
                if (!audioAutoStartRetryTimer) {
                    return;
                }

                window.clearInterval(audioAutoStartRetryTimer);
                audioAutoStartRetryTimer = null;
            }

            function beginAutoStartRetries() {
                if (!bgMusic || audioAutoStartRetryTimer) {
                    return;
                }

                audioAutoStartRetryTimer = window.setInterval(function () {
                    if (userPausedAudio) {
                        stopAutoStartRetries();
                        return;
                    }

                    if (!bgMusic.paused && !bgMusic.ended) {
                        stopAutoStartRetries();
                        return;
                    }

                    tryAutoStartBackgroundMusic();
                }, AUDIO_AUTOSTART_RETRY_INTERVAL_MS);
            }

            function tryPlayBackgroundMusic(allowMutedBootstrap) {
                if (!bgMusic) {
                    return;
                }

                const targetVolume = INVITE_CONFIG.backgroundMusicVolume;

                if (isBackgroundMusicPlaying()) {
                    stopAutoStartRetries();
                    fadeAudioTo(targetVolume, AUDIO_FADE_IN_DURATION_MS);
                    updateAudioToggleState();
                    return;
                }

                clearAudioFade();
                bgMusic.muted = false;
                bgMusic.volume = 0;

                const playPromise = bgMusic.play();
                if (playPromise && typeof playPromise.then === "function") {
                    playPromise.then(function () {
                        stopAutoStartRetries();
                        fadeAudioTo(targetVolume, AUDIO_FADE_IN_DURATION_MS);
                        updateAudioToggleState();
                    }).catch(function () {
                        if (!allowMutedBootstrap || hasTriedMutedBootstrap) {
                            beginAutoStartRetries();
                            updateAudioToggleState();
                            return;
                        }

                        hasTriedMutedBootstrap = true;
                        bgMusic.muted = true;
                        bgMusic.volume = 0;

                        const mutedPromise = bgMusic.play();
                        if (mutedPromise && typeof mutedPromise.then === "function") {
                            mutedPromise.then(function () {
                                bgMusic.muted = false;
                                stopAutoStartRetries();
                                fadeAudioTo(targetVolume, AUDIO_FADE_IN_DURATION_MS);
                                updateAudioToggleState();
                            }).catch(function () {
                                bgMusic.muted = false;
                                beginAutoStartRetries();
                                updateAudioToggleState();
                            });
                            return;
                        }

                        bgMusic.muted = false;
                        beginAutoStartRetries();
                        updateAudioToggleState();
                    });
                    return;
                }

                if (!bgMusic.paused && !bgMusic.ended) {
                    stopAutoStartRetries();
                    fadeAudioTo(targetVolume, AUDIO_FADE_IN_DURATION_MS);
                }
                updateAudioToggleState();
            }

            function startBackgroundMusic(allowMutedBootstrap) {
                if (!bgMusic) {
                    return;
                }

                userPausedAudio = false;
                hideAudioUnlockHint();
                clearAudioFade();
                tryPlayBackgroundMusic(allowMutedBootstrap);
            }

            function stopBackgroundMusic() {
                if (!bgMusic) {
                    return;
                }

                userPausedAudio = true;
                stopAutoStartRetries();

                if (bgMusic.paused || bgMusic.ended) {
                    clearAudioFade();
                    updateAudioToggleState();
                    return;
                }

                fadeAudioTo(0, AUDIO_FADE_OUT_DURATION_MS, function () {
                    bgMusic.pause();
                    bgMusic.volume = INVITE_CONFIG.backgroundMusicVolume;
                    updateAudioToggleState();
                });
            }

            function toggleBackgroundMusic() {
                if (isBackgroundMusicPlaying()) {
                    stopBackgroundMusic();
                    return;
                }

                startBackgroundMusic(false);
            }

            function tryAutoStartBackgroundMusic() {
                if (userPausedAudio) {
                    return;
                }

                startBackgroundMusic(true);
            }

            function bindAutoStartFallback() {
                if (hasAutoStartFallback) {
                    return;
                }

                hasAutoStartFallback = true;

                document.addEventListener("pointerdown", tryAutoStartBackgroundMusic, { passive: true });
                document.addEventListener("keydown", tryAutoStartBackgroundMusic);
                document.addEventListener("touchstart", tryAutoStartBackgroundMusic, { passive: true });

                document.addEventListener("visibilitychange", function () {
                    if (!document.hidden) {
                        tryAutoStartBackgroundMusic();
                    }
                });

                window.addEventListener("focus", tryAutoStartBackgroundMusic);
                window.addEventListener("pageshow", tryAutoStartBackgroundMusic);
            }

            function setupBackgroundMusic() {
                if (!bgMusic) {
                    return;
                }

                bgMusic.loop = true;
                bgMusic.autoplay = true;
                bgMusic.volume = INVITE_CONFIG.backgroundMusicVolume;

                if (INVITE_CONFIG.backgroundMusicUrl && bgMusic.src.indexOf(INVITE_CONFIG.backgroundMusicUrl) === -1) {
                    bgMusic.src = INVITE_CONFIG.backgroundMusicUrl;
                }

                bgMusic.load();

                if (audioToggleBtn) {
                    audioToggleBtn.addEventListener("click", toggleBackgroundMusic);
                }

                bgMusic.addEventListener("play", updateAudioToggleState);
                bgMusic.addEventListener("pause", updateAudioToggleState);
                bgMusic.addEventListener("ended", updateAudioToggleState);
                bgMusic.addEventListener("play", stopAutoStartRetries);
                bgMusic.addEventListener("canplay", tryAutoStartBackgroundMusic);
                bgMusic.addEventListener("canplaythrough", tryAutoStartBackgroundMusic);

                bindAutoStartFallback();
                beginAutoStartRetries();
                updateAudioToggleState();
                tryAutoStartBackgroundMusic();
                window.setTimeout(tryAutoStartBackgroundMusic, 260);
                window.setTimeout(tryAutoStartBackgroundMusic, 900);
            }

            function showMinnieMessage(text, kindClass) {
                if (!minnieFunLayer) {
                    return;
                }

                const messageEl = document.createElement("div");

                messageEl.className = "minnie-fun-message" + (kindClass ? " " + kindClass : "");
                messageEl.textContent = text;
                minnieFunLayer.appendChild(messageEl);

                removeElementLater(messageEl, MINNIE_EFFECT_DURATION_MS);
            }

            function spawnMinnieConfetti(amount, spreadPx) {
                if (!minnieFunLayer) {
                    return;
                }

                const fragment = document.createDocumentFragment();
                const piecesToCreate = prefersReducedMotion ? Math.min(12, amount) : amount;

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
                    piece.style.setProperty("--confetti-color", pickRandom(MINNIE_CONFETTI_COLORS));
                    piece.style.animationDelay = (Math.random() * 0.12).toFixed(2) + "s";

                    fragment.appendChild(piece);
                    removeElementLater(piece, 1400);
                }

                minnieFunLayer.appendChild(fragment);
            }

            function spawnSiteWideConfettiAt(x, y, amount, spreadPx) {
                if (!siteConfettiLayer) {
                    return;
                }

                const fragment = document.createDocumentFragment();
                const piecesToCreate = prefersReducedMotion ? Math.min(10, amount) : amount;

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
                    piece.style.setProperty("--confetti-color", pickRandom(MINNIE_CONFETTI_COLORS));
                    piece.style.animationDelay = (Math.random() * 0.08).toFixed(2) + "s";

                    fragment.appendChild(piece);
                    removeElementLater(piece, 1350);
                }

                siteConfettiLayer.appendChild(fragment);
            }

            function pulseMinnieWrap() {
                if (!minnieFrameWrap || prefersReducedMotion) {
                    return;
                }

                minnieFrameWrap.classList.remove("is-celebrating");
                void minnieFrameWrap.offsetWidth;
                minnieFrameWrap.classList.add("is-celebrating");

                window.setTimeout(function () {
                    if (minnieFrameWrap) {
                        minnieFrameWrap.classList.remove("is-celebrating");
                    }
                }, 430);
            }

            function celebrateMinnieClick(event) {
                const now = Date.now();
                let message = pickRandom(MINNIE_MESSAGES);
                let messageClass = "";
                let confettiAmount = 20;
                let confettiSpread = 118;
                let isRapidMode = false;
                const clickPoint = getViewportClickPosition(event, minnieFrameWrap);

                if (now - lastMinnieClickAt < MINNIE_CLICK_COOLDOWN_MS) {
                    return;
                }

                lastMinnieClickAt = now;
                minnieClicksCount += 1;

                if (now - lastRapidMinnieClickAt <= MINNIE_RAPID_CLICK_WINDOW_MS) {
                    minnieRapidClickStreak += 1;
                } else {
                    minnieRapidClickStreak = 1;
                }
                lastRapidMinnieClickAt = now;

                isRapidMode = minnieRapidClickStreak >= MINNIE_RAPID_CLICK_MIN_STREAK;

                if (minnieClicksCount % 10 === 0) {
                    message = pickRandom(MINNIE_MEGA_MESSAGES);
                    messageClass = "is-mega";
                    confettiAmount = 48;
                    confettiSpread = 210;
                } else if (minnieClicksCount % 5 === 0) {
                    message = pickRandom(MINNIE_MILESTONE_MESSAGES);
                    messageClass = "is-milestone";
                    confettiAmount = 34;
                    confettiSpread = 162;
                }

                if (isRapidMode) {
                    message = pickRandom(MINNIE_TURBO_MESSAGES);
                    messageClass = "is-mega";
                    confettiAmount += 14 + Math.min(28, (minnieRapidClickStreak - MINNIE_RAPID_CLICK_MIN_STREAK) * 5);
                    confettiSpread += 80;
                }

                pulseMinnieWrap();
                showMinnieMessage(message, messageClass);
                spawnMinnieConfetti(confettiAmount, confettiSpread);
                spawnSiteWideConfettiAt(clickPoint.x, clickPoint.y, Math.max(14, Math.round(confettiAmount * 0.6)), confettiSpread + 44);

                if (isRapidMode && !prefersReducedMotion) {
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
                const skipSelector = "button, a, input, select, textarea, option, label, iframe";

                if (!siteConfettiLayer) {
                    return;
                }

                if (event && event.button && event.button !== 0) {
                    return;
                }

                if (now - lastSiteConfettiAt < SITE_CLICK_CONFETTI_COOLDOWN_MS) {
                    return;
                }

                if (target && typeof target.closest === "function" && target.closest(skipSelector)) {
                    return;
                }

                if (minnieFrameWrap && event && event.target && minnieFrameWrap.contains(event.target)) {
                    return;
                }

                lastSiteConfettiAt = now;
                clickPoint = getViewportClickPosition(event, document.body);

                spawnSiteWideConfettiAt(clickPoint.x, clickPoint.y, 14, 130);
            }

            function setupSiteWideConfetti() {
                if (!siteConfettiLayer) {
                    return;
                }

                document.addEventListener("click", handleSiteWideConfettiClick, { passive: true });
            }

            function setupMinnieSurprises() {
                if (!minnieFrameWrap) {
                    return;
                }

                if (minnieSurpriseBtn) {
                    minnieSurpriseBtn.addEventListener("click", function (event) {
                        event.preventDefault();
                        event.stopPropagation();
                        celebrateMinnieClick(event);
                    });
                }

                minnieFrameWrap.addEventListener("click", function (event) {
                    if (minnieSurpriseBtn && event.target === minnieSurpriseBtn) {
                        return;
                    }

                    event.stopPropagation();
                    celebrateMinnieClick(event);
                });
            }

            function setText(id, value) {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = value;
                }
            }

            function setHref(id, value) {
                const el = document.getElementById(id);
                if (el) {
                    el.href = value;
                }
            }

            function setSrc(id, value) {
                const el = document.getElementById(id);
                if (el) {
                    el.src = value;
                }
            }

            function buildPhoneHref(value) {
                const normalized = String(value || "").trim().replace(/[^\d+]/g, "");

                if (!normalized) {
                    return "";
                }

                return "tel:" + normalized;
            }

            function buildWhatsAppHref(phoneValue, messageValue) {
                const digitsOnly = keepOnlyDigits(String(phoneValue || ""));

                if (!digitsOnly) {
                    return "";
                }

                const messageText = String(messageValue || "").trim();

                if (!messageText) {
                    return "https://wa.me/" + digitsOnly;
                }

                return "https://wa.me/" + digitsOnly + "?text=" + encodeURIComponent(messageText);
            }

            function buildSmsHref(phoneValue, messageValue) {
                const normalized = String(phoneValue || "").trim().replace(/[^\d+]/g, "");

                if (!normalized) {
                    return "";
                }

                const messageText = String(messageValue || "").trim();

                if (!messageText) {
                    return "sms:" + normalized;
                }

                return "sms:" + normalized + "?body=" + encodeURIComponent(messageText);
            }

            function applyConfig() {
                setText("themeEyebrow", INVITE_CONFIG.themeEyebrow);
                setText("title", INVITE_CONFIG.title);
                setText("heroSubtitle", INVITE_CONFIG.heroSubtitle);

                setText("dateLabel", INVITE_CONFIG.labels.date);
                setText("timeLabel", INVITE_CONFIG.labels.time);
                setText("locationLabel", INVITE_CONFIG.labels.location);
                setText("quickContactLabel", INVITE_CONFIG.labels.quickContact);
                setText("parkingInfoLabel", INVITE_CONFIG.labels.parkingInfo);
                setText("confirmUntilLabel", INVITE_CONFIG.labels.confirmUntil);
                setText("timezoneLabel", INVITE_CONFIG.labels.timezone);

                setText("dateValue", INVITE_CONFIG.eventDateText);
                setText("timeValue", INVITE_CONFIG.eventTimeText);
                setText("locationValue", INVITE_CONFIG.eventLocationText);
                setText("parkingInfoValue", INVITE_CONFIG.parkingInfoText);
                setText("confirmUntilValue", INVITE_CONFIG.confirmUntilText);
                setText("timezoneValue", INVITE_CONFIG.eventTimezone);
                setHref("locationValue", INVITE_CONFIG.mapDirectionsUrl || INVITE_CONFIG.mapUrl);
                setHref("quickContactSms", buildSmsHref(INVITE_CONFIG.quickContactPhone || INVITE_CONFIG.quickContactText, INVITE_CONFIG.quickContactSmsMessage));
                setHref("quickContactCall", buildPhoneHref(INVITE_CONFIG.quickContactPhone || INVITE_CONFIG.quickContactText));
                setHref("quickContactWhatsapp", buildWhatsAppHref(INVITE_CONFIG.quickContactPhone || INVITE_CONFIG.quickContactText, INVITE_CONFIG.quickContactWhatsappMessage));
                setHref("mapLink", INVITE_CONFIG.mapUrl);
                setSrc("mapEmbed", INVITE_CONFIG.mapEmbedUrl);
            }

            function updateCountdown() {
                const diff = eventDate.getTime() - Date.now();

                if (diff <= 0) {
                    countdownEl.textContent = "Hoje é dia de festa.";
                    return;
                }

                const day = 24 * 60 * 60 * 1000;
                const hour = 60 * 60 * 1000;
                const minute = 60 * 1000;

                const days = Math.floor(diff / day);
                const hours = Math.floor((diff % day) / hour);
                const minutes = Math.floor((diff % hour) / minute);

                countdownEl.textContent = "A festa começa em " + days + " dias, " + hours + " horas e " + minutes + " minutos.";
            }

            function showFeedback(kind, message) {
                feedbackEl.className = "feedback " + kind;
                feedbackEl.textContent = message;
            }

            function readSubmissionLock() {
                if (!isSingleSubmissionLockEnabled) {
                    return null;
                }

                try {
                    const rawLock = window.localStorage.getItem(SUBMISSION_LOCK_KEY);

                    if (!rawLock) {
                        return null;
                    }

                    const parsedLock = JSON.parse(rawLock);

                    if (!parsedLock || typeof parsedLock !== "object") {
                        return null;
                    }

                    return parsedLock;
                } catch (error) {
                    return null;
                }
            }

            function storeSubmissionLock(entry) {
                if (!isSingleSubmissionLockEnabled) {
                    return;
                }

                const lockPayload = {
                    submittedAt: entry.submittedAt,
                    guestName: entry.guestName,
                    guestCount: entry.guestCount,
                    attendance: entry.attendance
                };

                existingSubmissionLock = lockPayload;

                try {
                    window.localStorage.setItem(SUBMISSION_LOCK_KEY, JSON.stringify(lockPayload));
                } catch (error) {
                    return;
                }
            }

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

            function applySubmissionLockState() {
                let lockedMessage;
                let submittedAtText;

                if (!isSingleSubmissionLockEnabled || !existingSubmissionLock || !form) {
                    return;
                }

                form.querySelectorAll("input, select, textarea, button").forEach(function (field) {
                    field.disabled = true;
                });

                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = "Resposta já enviada";
                }

                submittedAtText = formatSubmissionDate(existingSubmissionLock.submittedAt);
                lockedMessage = submittedAtText
                    ? "Já recebemos a tua resposta neste dispositivo em " + submittedAtText + "."
                    : "Já recebemos a tua resposta neste dispositivo.";

                showFeedback("ok", lockedMessage);
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
                    eventTitle: INVITE_CONFIG.title,
                    eventDateText: INVITE_CONFIG.eventDateText,
                    eventTimeText: INVITE_CONFIG.eventTimeText,
                    eventLocation: INVITE_CONFIG.eventLocationText
                };

                if (isDigitalTicketEnabled) {
                    payload.ticketCode = entry.ticketCode || generateTicketCode(entry);
                }

                return payload;
            }

            async function getWebhookErrorMessage(response) {
                let rawPayload = "";

                try {
                    rawPayload = await response.text();
                } catch (error) {
                    return "";
                }

                if (!rawPayload) {
                    return "";
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

                return rawPayload.slice(0, 200);
            }

            function buildThankYouUrl(entry) {
                const params = new URLSearchParams();
                const ticketCode = entry.ticketCode || generateTicketCode(entry);

                params.set("nome", entry.guestName);
                params.set("presenca", entry.attendance || "coming");
                params.set("pessoas", String(normalizeGuestCount(entry.guestCount)));
                params.set("ingressoAtivo", isDigitalTicketEnabled ? "1" : "0");

                if (isDigitalTicketEnabled) {
                    params.set("ingresso", ticketCode);
                }

                params.set("evento", INVITE_CONFIG.title);
                params.set("dataEvento", INVITE_CONFIG.eventDateText);
                params.set("horaEvento", INVITE_CONFIG.eventTimeText);
                params.set("localEvento", INVITE_CONFIG.eventLocationText);

                return "pages/agradecimento.html?" + params.toString();
            }

            form.addEventListener("submit", async function (event) {
                event.preventDefault();

                if (isSingleSubmissionLockEnabled && existingSubmissionLock) {
                    applySubmissionLockState();
                    return;
                }

                const guestName = document.getElementById("guestName").value.trim();
                const guestPhone = keepOnlyDigits(document.getElementById("guestPhone").value.trim());
                const guestEmail = guestEmailInput ? guestEmailInput.value.trim() : "";
                const guestCount = document.getElementById("guestCount").value;
                const attendanceSelect = document.getElementById("attendance");
                const attendance = attendanceSelect.value;
                const attendanceText = attendanceSelect.options[attendanceSelect.selectedIndex].text;
                const message = document.getElementById("message").value.trim();
                const botTrapValue = botTrapInput ? botTrapInput.value.trim() : "";

                document.getElementById("guestPhone").value = guestPhone;

                if (botTrapValue) {
                    showFeedback("ok", "Resposta enviada com sucesso.");
                    return;
                }

                if (!guestName || !guestPhone || !guestEmail || !guestCount || !attendance || !message) {
                    showFeedback("error", "Preenche todos os campos obrigatórios assinalados com *.");
                    return;
                }

                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
                    showFeedback("error", "Introduz um email válido.");
                    return;
                }

                if (!/^\d+$/.test(guestPhone)) {
                    showFeedback("error", "O telemóvel deve conter apenas números.");
                    return;
                }

                const numericGuestCount = Number(guestCount || 1);
                if (!Number.isFinite(numericGuestCount) || numericGuestCount < 1 || numericGuestCount > 20) {
                    showFeedback("error", "O número de pessoas deve estar entre 1 e 20.");
                    return;
                }

                const entry = {
                    submittedAt: new Date().toISOString(),
                    guestName: guestName,
                    guestPhone: guestPhone,
                    guestEmail: guestEmail,
                    guestCount: numericGuestCount,
                    attendance: attendance,
                    attendanceText: attendanceText,
                    message: message
                };
                entry.ticketCode = isDigitalTicketEnabled ? generateTicketCode(entry) : "";

                if (!INVITE_CONFIG.emailService.enabled || INVITE_CONFIG.emailService.endpoint.indexOf("SEU_WEBHOOK_AQUI") !== -1) {
                    showFeedback("error", "Configura primeiro o endpoint do webhook no Pipedream no INVITE_CONFIG.");
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.textContent = "A enviar...";

                try {
                    const body = buildWebhookPayload(entry);
                    const response = await fetch(INVITE_CONFIG.emailService.endpoint, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(body)
                    });

                    if (!response.ok) {
                        const detailedError = await getWebhookErrorMessage(response);
                        const statusHint = "Falha no envio (" + response.status + ")";
                        throw new Error(detailedError || statusHint);
                    }

                    storeSubmissionLock(entry);
                    form.reset();
                    document.getElementById("guestCount").value = "1";
                    showFeedback("ok", "Resposta enviada com sucesso. A redirecionar...");
                    stopBackgroundMusic();
                    window.setTimeout(function () {
                        window.location.href = buildThankYouUrl(entry);
                    }, 900);
                } catch (error) {
                    const errorMessage = error && error.message ? error.message : "";
                    const isFileProtocol = window.location.protocol === "file:";
                    const isNetworkError = /failed to fetch|networkerror|load failed/i.test(errorMessage);

                    if (isFileProtocol && isNetworkError) {
                        showFeedback("error", "Não foi possível enviar em modo local. Abre o convite num servidor (http/https) e tenta novamente.");
                    } else if (errorMessage) {
                        showFeedback("error", "Não foi possível enviar: " + errorMessage);
                    } else {
                        showFeedback("error", "Não foi possível enviar. Verifica o endpoint do webhook no Pipedream.");
                    }

                    console.error("Falha no envio do formulário:", error);
                } finally {
                    if (isSingleSubmissionLockEnabled && existingSubmissionLock) {
                        submitBtn.disabled = true;
                        submitBtn.textContent = "Resposta já enviada";
                    } else {
                        submitBtn.disabled = false;
                        submitBtn.textContent = "Enviar resposta";
                    }
                }
            });

            maybeShowFirstVisitLoader();
            setupBackgroundMusic();
            setupMinnieSurprises();
            setupSiteWideConfetti();
            applyConfig();
            existingSubmissionLock = readSubmissionLock();

            if (isSingleSubmissionLockEnabled && existingSubmissionLock) {
                applySubmissionLockState();
            }

            updateCountdown();
            window.setInterval(updateCountdown, 60000);
        })();
