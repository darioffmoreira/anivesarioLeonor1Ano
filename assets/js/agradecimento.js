(function () {
    const EVENT = {
        title: "Aniversario da Leonor - 1 ano",
        description: "Junta-te a nos para celebrar o primeiro aniversario da Leonor.",
        location: "Av. Xanana Gusmao 369, 4460-840 Custoias - Matosinhos",
        startIso: "2026-05-09T15:30:00+01:00",
        durationMinutes: 180
    };

    const CONFETTI_COLORS = ["#E65282", "#C84673", "#ffd76d", "#ffffff", "#f4a9c4"];
    const confettiLayer = document.getElementById("thanksConfettiLayer");
    const titleEl = document.getElementById("thanksTitle");
    const subtitleEl = document.getElementById("thanksSubtitle");
    const ticketPanel = document.getElementById("ticketPanel");
    const ticketGuestNameEl = document.getElementById("ticketGuestName");
    const ticketGuestCountEl = document.getElementById("ticketGuestCount");
    const ticketDateEl = document.getElementById("ticketDate");
    const ticketTimeEl = document.getElementById("ticketTime");
    const ticketLocationEl = document.getElementById("ticketLocation");
    const ticketCodeEl = document.getElementById("ticketCode");
    const ticketEventTitleEl = document.getElementById("ticketEventTitle");
    const googleCalendarLink = document.getElementById("googleCalendarLink");
    const downloadIcsBtn = document.getElementById("downloadIcsBtn");
    const downloadTicketPngBtn = document.getElementById("downloadTicketPngBtn");
    const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function removeElementLater(node, delayMs) {
        window.setTimeout(function () {
            if (node && node.parentNode) {
                node.parentNode.removeChild(node);
            }
        }, delayMs);
    }

    function spawnConfettiBurst(x, y, amount, spreadPx) {
        if (!confettiLayer) {
            return;
        }

        const fragment = document.createDocumentFragment();
        const piecesToCreate = prefersReducedMotion ? Math.min(12, amount) : amount;

        for (let i = 0; i < piecesToCreate; i += 1) {
            const piece = document.createElement("span");
            const angle = Math.random() * Math.PI * 2;
            const distance = 50 + Math.random() * spreadPx;
            const dx = Math.cos(angle) * distance;
            const dy = (Math.sin(angle) * distance) - (24 + Math.random() * 30);
            const rotation = Math.round((Math.random() * 720) - 360);

            piece.className = "thanks-confetti" + (Math.random() > 0.64 ? " is-round" : "");
            piece.style.left = x.toFixed(2) + "px";
            piece.style.top = y.toFixed(2) + "px";
            piece.style.setProperty("--tx", dx.toFixed(2) + "px");
            piece.style.setProperty("--ty", dy.toFixed(2) + "px");
            piece.style.setProperty("--rot", rotation + "deg");
            piece.style.setProperty("--confetti-color", CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]);
            piece.style.animationDelay = (Math.random() * 0.08).toFixed(2) + "s";

            fragment.appendChild(piece);
            removeElementLater(piece, 1400);
        }

        confettiLayer.appendChild(fragment);
    }

    function launchWelcomeConfetti() {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight * 0.32;

        spawnConfettiBurst(centerX, centerY, 34, 170);
        window.setTimeout(function () {
            spawnConfettiBurst(window.innerWidth * 0.24, window.innerHeight * 0.28, 20, 130);
            spawnConfettiBurst(window.innerWidth * 0.76, window.innerHeight * 0.28, 20, 130);
        }, 140);
    }

    function formatCalendarDate(date) {
        return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    }

    function escapeIcsText(value) {
        return String(value)
            .replace(/\\/g, "\\\\")
            .replace(/\n/g, "\\n")
            .replace(/,/g, "\\,")
            .replace(/;/g, "\\;");
    }

    function buildGoogleCalendarUrl(startDate, endDate) {
        const params = new URLSearchParams({
            action: "TEMPLATE",
            text: EVENT.title,
            dates: formatCalendarDate(startDate) + "/" + formatCalendarDate(endDate),
            details: EVENT.description,
            location: EVENT.location
        });

        return "https://calendar.google.com/calendar/render?" + params.toString();
    }

    function buildIcsContent(startDate, endDate) {
        const uid = Date.now() + "@aniversario-leonor";

        return [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Aniversario Leonor//PT",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "BEGIN:VEVENT",
            "UID:" + uid,
            "DTSTAMP:" + formatCalendarDate(new Date()),
            "DTSTART:" + formatCalendarDate(startDate),
            "DTEND:" + formatCalendarDate(endDate),
            "SUMMARY:" + escapeIcsText(EVENT.title),
            "DESCRIPTION:" + escapeIcsText(EVENT.description),
            "LOCATION:" + escapeIcsText(EVENT.location),
            "END:VEVENT",
            "END:VCALENDAR"
        ].join("\r\n");
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

    function buildTicketCode(guestName, guestCount, attendance) {
        const safeName = String(guestName || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        const namePart = (safeName || "GUEST").slice(0, 3).padEnd(3, "X");
        const countPart = String(normalizeGuestCount(guestCount)).padStart(2, "0");
        const hashSeed = createTicketHashSeed([safeName, countPart, String(attendance || ""), EVENT.startIso].join("|"));

        return "LEO-" + namePart + countPart + "-" + hashSeed;
    }

    function getTicketContextFromQuery() {
        const params = new URLSearchParams(window.location.search);
        const attendance = (params.get("presenca") || "").trim();
        const ticketEnabledByQuery = params.get("ingressoAtivo");
        const isDigitalTicketEnabled = ticketEnabledByQuery === null ? true : ticketEnabledByQuery === "1";
        const guestName = (params.get("nome") || "").trim() || "Convidado(a)";
        const guestCount = normalizeGuestCount(params.get("pessoas"));
        const eventTitle = (params.get("evento") || EVENT.title).trim();
        const eventDate = (params.get("dataEvento") || "Sábado, 9 de Maio").trim();
        const eventTime = (params.get("horaEvento") || "15h30").trim();
        const eventLocation = (params.get("localEvento") || EVENT.location).trim();
        const ticketCode = isDigitalTicketEnabled
            ? ((params.get("ingresso") || "").trim() || buildTicketCode(guestName, guestCount, attendance)).toUpperCase()
            : "";

        return {
            attendance: attendance,
            guestName: guestName,
            guestCount: guestCount,
            eventTitle: eventTitle,
            eventDate: eventDate,
            eventTime: eventTime,
            eventLocation: eventLocation,
            ticketCode: ticketCode,
            hasTicket: isDigitalTicketEnabled && (attendance === "coming" || attendance === "maybe")
        };
    }

    function renderTicketPanel(ticketContext) {
        if (!ticketPanel) {
            return;
        }

        if (!ticketContext.hasTicket) {
            ticketPanel.hidden = true;
            return;
        }

        ticketPanel.hidden = false;

        if (ticketGuestNameEl) {
            ticketGuestNameEl.textContent = ticketContext.guestName;
        }

        if (ticketGuestCountEl) {
            ticketGuestCountEl.textContent = ticketContext.guestCount + (ticketContext.guestCount === 1 ? " pessoa" : " pessoas");
        }

        if (ticketDateEl) {
            ticketDateEl.textContent = ticketContext.eventDate;
        }

        if (ticketTimeEl) {
            ticketTimeEl.textContent = ticketContext.eventTime;
        }

        if (ticketLocationEl) {
            ticketLocationEl.textContent = ticketContext.eventLocation;
        }

        if (ticketCodeEl) {
            ticketCodeEl.textContent = ticketContext.ticketCode;
        }

        if (ticketEventTitleEl) {
            ticketEventTitleEl.textContent = ticketContext.eventTitle;
        }
    }

    function drawRoundedRect(context, x, y, width, height, radius) {
        const safeRadius = Math.min(radius, width / 2, height / 2);

        context.beginPath();
        context.moveTo(x + safeRadius, y);
        context.lineTo(x + width - safeRadius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
        context.lineTo(x + width, y + height - safeRadius);
        context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
        context.lineTo(x + safeRadius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
        context.lineTo(x, y + safeRadius);
        context.quadraticCurveTo(x, y, x + safeRadius, y);
        context.closePath();
    }

    function wrapCanvasText(context, text, maxWidth) {
        const words = String(text).split(/\s+/).filter(Boolean);
        const lines = [];
        let currentLine = "";

        words.forEach(function (word) {
            const testLine = currentLine ? currentLine + " " + word : word;

            if (context.measureText(testLine).width <= maxWidth) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                }
                currentLine = word;
            }
        });

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines.length > 0 ? lines : [""];
    }

    function createTicketCanvas(ticketContext) {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = 1480;
        canvas.height = 860;

        if (!context) {
            return canvas;
        }

        const backgroundGradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
        backgroundGradient.addColorStop(0, "#ff7ea8");
        backgroundGradient.addColorStop(0.55, "#ff5f91");
        backgroundGradient.addColorStop(1, "#ffc979");
        context.fillStyle = backgroundGradient;
        context.fillRect(0, 0, canvas.width, canvas.height);

        drawRoundedRect(context, 90, 86, 1300, 688, 44);
        context.fillStyle = "rgba(255, 255, 255, 0.96)";
        context.fill();

        context.lineWidth = 2;
        context.strokeStyle = "rgba(230, 82, 130, 0.28)";
        context.stroke();

        context.fillStyle = "#C84673";
        context.font = "700 54px Nunito, Arial, sans-serif";
        context.fillText("Ingresso Digital", 150, 188);

        context.fillStyle = "#403241";
        context.font = "700 40px Nunito, Arial, sans-serif";
        context.fillText(ticketContext.eventTitle, 150, 246);

        context.fillStyle = "#7f6474";
        context.font = "700 23px Nunito, Arial, sans-serif";
        context.fillText("Nome", 150, 312);
        context.fillText("Pessoas", 780, 312);

        context.fillStyle = "#1f1f24";
        context.font = "700 34px Nunito, Arial, sans-serif";
        context.fillText(ticketContext.guestName, 150, 352);
        context.fillText(String(ticketContext.guestCount), 780, 352);

        context.fillStyle = "#7f6474";
        context.font = "700 23px Nunito, Arial, sans-serif";
        context.fillText("Data", 150, 424);
        context.fillText("Hora", 520, 424);

        context.fillStyle = "#1f1f24";
        context.font = "700 30px Nunito, Arial, sans-serif";
        context.fillText(ticketContext.eventDate, 150, 462);
        context.fillText(ticketContext.eventTime, 520, 462);

        context.fillStyle = "#7f6474";
        context.font = "700 23px Nunito, Arial, sans-serif";
        context.fillText("Local", 150, 532);

        context.fillStyle = "#1f1f24";
        context.font = "700 28px Nunito, Arial, sans-serif";
        const locationLines = wrapCanvasText(context, ticketContext.eventLocation, 1060);

        locationLines.slice(0, 2).forEach(function (line, index) {
            context.fillText(line, 150, 572 + (index * 36));
        });

        context.strokeStyle = "#f4a9c4";
        context.setLineDash([8, 8]);
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(150, 650);
        context.lineTo(1240, 650);
        context.stroke();
        context.setLineDash([]);

        context.fillStyle = "#7f6474";
        context.font = "700 20px Nunito, Arial, sans-serif";
        context.fillText("Codigo do ingresso", 150, 694);

        context.fillStyle = "#C84673";
        context.font = "700 46px Courier New, monospace";
        context.fillText(ticketContext.ticketCode, 150, 744);

        return canvas;
    }

    async function downloadTicketAsPng(ticketContext) {
        if (!ticketContext.hasTicket) {
            return;
        }

        if (document.fonts && document.fonts.ready) {
            try {
                await document.fonts.ready;
            } catch (error) {
                // Ignore font loading failures and proceed with fallback fonts.
            }
        }

        const canvas = createTicketCanvas(ticketContext);
        const safeCode = ticketContext.ticketCode.toLowerCase().replace(/[^a-z0-9-]/g, "");
        const fileName = "ingresso-leonor-" + (safeCode || "festa") + ".png";

        if (canvas.toBlob) {
            canvas.toBlob(function (blob) {
                if (!blob) {
                    return;
                }

                const url = URL.createObjectURL(blob);
                const downloadLink = document.createElement("a");

                downloadLink.href = url;
                downloadLink.download = fileName;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);

                window.setTimeout(function () {
                    URL.revokeObjectURL(url);
                }, 800);
            }, "image/png");
            return;
        }

        const fallbackLink = document.createElement("a");
        fallbackLink.href = canvas.toDataURL("image/png");
        fallbackLink.download = fileName;
        document.body.appendChild(fallbackLink);
        fallbackLink.click();
        document.body.removeChild(fallbackLink);
    }

    function setupTicketDownload(ticketContext) {
        if (!downloadTicketPngBtn) {
            return;
        }

        if (!ticketContext.hasTicket) {
            downloadTicketPngBtn.disabled = true;
            return;
        }

        downloadTicketPngBtn.disabled = false;
        downloadTicketPngBtn.addEventListener("click", function () {
            downloadTicketAsPng(ticketContext);
        });
    }

    function personalizeThankYou(ticketContext) {
        const guestName = ticketContext.guestName;
        const attendance = ticketContext.attendance;

        if (guestName) {
            titleEl.textContent = "Obrigada, " + guestName + ".";
        }

        if (attendance === "coming") {
            subtitleEl.textContent = "Que bom! Vamos adorar celebrar contigo.";
            return;
        }

        if (attendance === "maybe") {
            subtitleEl.textContent = "Ficamos a torcer para que consigas vir. Obrigada por responderes!";
            return;
        }

        if (attendance === "not-coming") {
            subtitleEl.textContent = "Obrigada pelo carinho da resposta. Vais fazer falta nesta festa.";
        }
    }

    function setupCalendarActions() {
        const startDate = new Date(EVENT.startIso);
        const endDate = new Date(startDate.getTime() + (EVENT.durationMinutes * 60 * 1000));

        if (googleCalendarLink) {
            googleCalendarLink.href = buildGoogleCalendarUrl(startDate, endDate);
        }

        if (downloadIcsBtn) {
            downloadIcsBtn.addEventListener("click", function () {
                const icsContent = buildIcsContent(startDate, endDate);
                const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const downloadLink = document.createElement("a");

                downloadLink.href = url;
                downloadLink.download = "aniversario-leonor.ics";
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);

                window.setTimeout(function () {
                    URL.revokeObjectURL(url);
                }, 800);
            });
        }
    }

    const ticketContext = getTicketContextFromQuery();

    personalizeThankYou(ticketContext);
    renderTicketPanel(ticketContext);
    setupTicketDownload(ticketContext);
    setupCalendarActions();
    launchWelcomeConfetti();

    document.addEventListener("click", function (event) {
        if (event.target && typeof event.target.closest === "function" && event.target.closest("button, a")) {
            return;
        }

        spawnConfettiBurst(event.clientX || (window.innerWidth / 2), event.clientY || (window.innerHeight / 2), 16, 120);
    }, { passive: true });
})();
