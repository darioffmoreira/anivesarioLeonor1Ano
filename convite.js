(function () {
            var INVITE_CONFIG = {
                themeEyebrow: "Festa de Aniversário Minnie",
                title: "A Leonor faz 1 aninho",
                heroSubtitle: "Junta-te a nós para celebrar este dia tão especial!",
                eventDateISO: "2026-05-09T15:30:00+01:00",
                eventTimezone: "Europe/Lisbon",
                eventDateText: "Sábado, 9 de Maio",
                eventTimeText: "15h30",
                eventLocationText: "Av. Xanana Gusmão 369, 4460-840 Custoias - Matosinhos",
                confirmUntilText: "30 Abril",
                mapUrl: "https://maps.app.goo.gl/zihM4u8z5jqbvsU6A",
                mapEmbedUrl: "https://maps.google.com/maps?q=Av.%20Xanana%20Gusmao%20369%2C%204460-840%20Custoias%20-%20Matosinhos&z=16&output=embed",
                backgroundMusicUrl: "audio.mp3",
                backgroundMusicVolume: 0.45,
                emailService: {
                    endpoint: "https://formspree.io/f/mvzvlovk",
                    enabled: true
                },
                labels: {
                    date: "Data:",
                    time: "Hora:",
                    location: "Local:",
                    confirmUntil: "Confirma até:",
                    timezone: "Fuso horário:"
                }
            };

            var eventDate = new Date(INVITE_CONFIG.eventDateISO);
            var countdownEl = document.getElementById("countdown");
            var form = document.getElementById("rsvpForm");
            var submitBtn = document.getElementById("submitBtn");
            var feedbackEl = document.getElementById("formFeedback");
            var guestPhoneInput = document.getElementById("guestPhone");
            var firstVisitLoader = document.getElementById("firstVisitLoader");
            var bgMusic = document.getElementById("bgMusic");
            var enableAudioBtn = document.getElementById("enableAudioBtn");

            var FIRST_VISIT_LOADER_KEY = "leonor_invite_first_visit_loader_v1";
            var FIRST_VISIT_LOADER_DURATION_MS = 2300;
            var hasAudioUnlockListener = false;
            var audioKeepAliveTimer = null;

            function keepOnlyDigits(value) {
                return value.replace(/\D+/g, "");
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

            function hideEnableAudioButton() {
                if (enableAudioBtn) {
                    enableAudioBtn.hidden = true;
                }
            }

            function showEnableAudioButton() {
                if (enableAudioBtn) {
                    enableAudioBtn.hidden = false;
                }
            }

            function tryStartBackgroundMusic() {
                if (!bgMusic) {
                    return;
                }

                if (!bgMusic.paused && !bgMusic.ended) {
                    hideEnableAudioButton();
                    return;
                }

                var playPromise = bgMusic.play();
                if (playPromise && typeof playPromise.then === "function") {
                    playPromise.then(function () {
                        hideEnableAudioButton();
                    }).catch(function () {
                        showEnableAudioButton();
                        bindAudioUnlockListeners();
                    });
                }
            }

            function startAudioKeepAlive() {
                if (audioKeepAliveTimer || !bgMusic) {
                    return;
                }

                audioKeepAliveTimer = window.setInterval(function () {
                    tryStartBackgroundMusic();
                }, 3500);
            }

            function bindAudioResilienceHandlers() {
                if (!bgMusic) {
                    return;
                }

                bgMusic.addEventListener("ended", tryStartBackgroundMusic);
                bgMusic.addEventListener("pause", function () {
                    window.setTimeout(tryStartBackgroundMusic, 120);
                });

                document.addEventListener("visibilitychange", function () {
                    if (!document.hidden) {
                        tryStartBackgroundMusic();
                    }
                });

                window.addEventListener("focus", tryStartBackgroundMusic);
                window.addEventListener("pageshow", tryStartBackgroundMusic);
            }

            function bindAudioUnlockListeners() {
                if (hasAudioUnlockListener) {
                    return;
                }

                var unlockEvents = ["pointerdown", "keydown", "touchstart"];

                hasAudioUnlockListener = true;
                unlockEvents.forEach(function (eventName) {
                    document.addEventListener(eventName, tryStartBackgroundMusic, { once: true });
                });
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

                if (enableAudioBtn) {
                    enableAudioBtn.addEventListener("click", tryStartBackgroundMusic);
                }

                bindAudioUnlockListeners();
                bindAudioResilienceHandlers();
                startAudioKeepAlive();
            }

            function setText(id, value) {
                var el = document.getElementById(id);
                if (el) {
                    el.textContent = value;
                }
            }

            function setHref(id, value) {
                var el = document.getElementById(id);
                if (el) {
                    el.href = value;
                }
            }

            function setSrc(id, value) {
                var el = document.getElementById(id);
                if (el) {
                    el.src = value;
                }
            }

            function applyConfig() {
                setText("themeEyebrow", INVITE_CONFIG.themeEyebrow);
                setText("title", INVITE_CONFIG.title);
                setText("heroSubtitle", INVITE_CONFIG.heroSubtitle);

                setText("dateLabel", INVITE_CONFIG.labels.date);
                setText("timeLabel", INVITE_CONFIG.labels.time);
                setText("locationLabel", INVITE_CONFIG.labels.location);
                setText("confirmUntilLabel", INVITE_CONFIG.labels.confirmUntil);
                setText("timezoneLabel", INVITE_CONFIG.labels.timezone);

                setText("dateValue", INVITE_CONFIG.eventDateText);
                setText("timeValue", INVITE_CONFIG.eventTimeText);
                setText("locationValue", INVITE_CONFIG.eventLocationText);
                setText("confirmUntilValue", INVITE_CONFIG.confirmUntilText);
                setText("timezoneValue", INVITE_CONFIG.eventTimezone);
                setHref("mapLink", INVITE_CONFIG.mapUrl);
                setSrc("mapEmbed", INVITE_CONFIG.mapEmbedUrl);
            }

            function updateCountdown() {
                var diff = eventDate.getTime() - Date.now();

                if (diff <= 0) {
                    countdownEl.textContent = "Hoje é dia de festa.";
                    return;
                }

                var day = 24 * 60 * 60 * 1000;
                var hour = 60 * 60 * 1000;
                var minute = 60 * 1000;

                var days = Math.floor(diff / day);
                var hours = Math.floor((diff % day) / hour);
                var minutes = Math.floor((diff % hour) / minute);

                countdownEl.textContent = "A festa começa em " + days + " dias, " + hours + " horas e " + minutes + " minutos.";
            }

            function showFeedback(kind, message) {
                feedbackEl.className = "feedback " + kind;
                feedbackEl.textContent = message;
            }

            form.addEventListener("submit", async function (event) {
                event.preventDefault();

                var guestName = document.getElementById("guestName").value.trim();
                var guestPhone = keepOnlyDigits(document.getElementById("guestPhone").value.trim());
                var guestCount = document.getElementById("guestCount").value;
                var attendanceSelect = document.getElementById("attendance");
                var attendance = attendanceSelect.value;
                var attendanceText = attendanceSelect.options[attendanceSelect.selectedIndex].text;
                var message = document.getElementById("message").value.trim();

                document.getElementById("guestPhone").value = guestPhone;

                if (!guestName || !guestPhone || !attendance || !message) {
                    showFeedback("error", "Preenche todos os campos obrigatórios assinalados com *.");
                    return;
                }

                if (!/^\d+$/.test(guestPhone)) {
                    showFeedback("error", "O telemóvel deve conter apenas números.");
                    return;
                }

                var numericGuestCount = Number(guestCount || 1);
                if (!Number.isFinite(numericGuestCount) || numericGuestCount < 1 || numericGuestCount > 20) {
                    showFeedback("error", "O número de pessoas deve estar entre 1 e 20.");
                    return;
                }

                var entry = {
                    submittedAt: new Date().toISOString(),
                    guestName: guestName,
                    guestPhone: guestPhone,
                    guestCount: numericGuestCount,
                    attendance: attendance,
                    attendanceText: attendanceText,
                    message: message
                };

                if (!INVITE_CONFIG.emailService.enabled || INVITE_CONFIG.emailService.endpoint.indexOf("SEU_ID") !== -1) {
                    showFeedback("error", "Configura primeiro o endpoint gratuito (Formspree) no INVITE_CONFIG.");
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.textContent = "A enviar...";

                try {
                    var response = await fetch(INVITE_CONFIG.emailService.endpoint, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        body: JSON.stringify({
                            assunto: "RSVP Aniversário Leonor",
                            nome: entry.guestName,
                            telemovel: entry.guestPhone,
                            pessoas: entry.guestCount,
                            presenca: entry.attendanceText,
                            mensagem: entry.message,
                            enviado_em: entry.submittedAt
                        })
                    });

                    if (!response.ok) {
                        throw new Error("Falha no envio");
                    }

                    form.reset();
                    document.getElementById("guestCount").value = "1";
                    showFeedback("ok", "Confirmação enviada com sucesso por email.");
                } catch (error) {
                    showFeedback("error", "Não foi possível enviar. Verifica o endpoint do serviço gratuito.");
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Enviar confirmação";
                }
            });

            maybeShowFirstVisitLoader();
            setupBackgroundMusic();
            tryStartBackgroundMusic();
            applyConfig();
            updateCountdown();
            window.setInterval(updateCountdown, 60000);
        })();
