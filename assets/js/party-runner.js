(function () {
    const stage = document.getElementById("partyRunnerStage");
    const canvas = document.getElementById("partyRunnerCanvas");
    const actionBtn = document.getElementById("partyRunnerActionBtn");
    const scoreEl = document.getElementById("partyRunnerScore");
    const bestEl = document.getElementById("partyRunnerBest");
    const statusEl = document.getElementById("partyRunnerStatus");

    if (!stage || !canvas || !actionBtn || !scoreEl || !bestEl || !statusEl) {
        return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
        return;
    }

    const gameTextsConfig = (window.SITE_TEXTS_PT_PT && window.SITE_TEXTS_PT_PT.partyGame) || {};
    const GAME_TEXT = {
        actionStart: typeof gameTextsConfig.actionStart === "string" ? gameTextsConfig.actionStart : "Começar",
        actionRestart: typeof gameTextsConfig.actionRestart === "string" ? gameTextsConfig.actionRestart : "Reiniciar",
        actionResume: typeof gameTextsConfig.actionResume === "string" ? gameTextsConfig.actionResume : "Retomar",
        statusIdle: typeof gameTextsConfig.statusIdle === "string" ? gameTextsConfig.statusIdle : "Carrega em Começar para iniciar.",
        statusRunning: typeof gameTextsConfig.statusRunning === "string" ? gameTextsConfig.statusRunning : "Em jogo. Salta para evitar os obstáculos.",
        statusPaused: typeof gameTextsConfig.statusPaused === "string" ? gameTextsConfig.statusPaused : "Jogo em pausa. Carrega em Retomar.",
        statusGameOver: typeof gameTextsConfig.statusGameOver === "string" ? gameTextsConfig.statusGameOver : "Fim de jogo com {score} pontos. Carrega em Reiniciar.",
        hintControls: typeof gameTextsConfig.hintControls === "string" ? gameTextsConfig.hintControls : "Computador: Espaço ou seta para cima. Telemóvel: toca na área do jogo."
    };

    const STORAGE_KEY = "leonor_party_runner_best_v1";
    const STATE_IDLE = "idle";
    const STATE_RUNNING = "running";
    const STATE_PAUSED = "paused";
    const STATE_GAME_OVER = "game-over";

    const PLAYER_WIDTH = 30;
    const PLAYER_HEIGHT = 36;
    const PLAYER_X = 58;
    const GRAVITY = 2400;
    const JUMP_SPEED = -860;

    let gameState = STATE_IDLE;
    let animationFrameId = 0;
    let lastFrameTime = 0;

    let stageWidth = 0;
    let stageHeight = 0;
    let groundY = 0;

    let score = 0;
    let displayedScore = -1;
    let bestScore = readBestScore();
    let speed = 305;
    let spawnElapsed = 0;
    let spawnDelay = pickSpawnDelay(speed);

    const player = {
        x: PLAYER_X,
        y: 0,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        vy: 0,
        airborne: false
    };

    let obstacles = [];

    function readBestScore() {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            const parsed = Number(raw);

            if (!Number.isFinite(parsed) || parsed < 0) {
                return 0;
            }

            return Math.floor(parsed);
        } catch (error) {
            return 0;
        }
    }

    function writeBestScore(value) {
        try {
            window.localStorage.setItem(STORAGE_KEY, String(Math.max(0, Math.floor(value))));
        } catch (error) {
            return;
        }
    }

    function formatTextTemplate(template, replacements) {
        let output = String(template || "");

        Object.keys(replacements).forEach(function (key) {
            output = output.replace(new RegExp("\\{" + key + "\\}", "g"), String(replacements[key]));
        });

        return output;
    }

    function applyStaticGameText() {
        const hintEl = stage.querySelector(".party-runner-hint");

        if (hintEl) {
            hintEl.textContent = GAME_TEXT.hintControls;
        }
    }

    function updateActionLabel() {
        if (gameState === STATE_RUNNING || gameState === STATE_GAME_OVER) {
            actionBtn.textContent = GAME_TEXT.actionRestart;
            return;
        }

        if (gameState === STATE_PAUSED) {
            actionBtn.textContent = GAME_TEXT.actionResume;
            return;
        }

        actionBtn.textContent = GAME_TEXT.actionStart;
    }

    function setStatus(message) {
        statusEl.textContent = message;
    }

    function setGameState(nextState) {
        gameState = nextState;
        stage.setAttribute("data-state", nextState);
        updateActionLabel();
    }

    function updateScoreDisplay(force) {
        const roundedScore = Math.floor(score);

        if (force || roundedScore !== displayedScore) {
            displayedScore = roundedScore;
            scoreEl.textContent = String(roundedScore);
        }

        bestEl.textContent = String(bestScore);
    }

    function randomBetween(min, max) {
        return min + (Math.random() * (max - min));
    }

    function pickSpawnDelay(currentSpeed) {
        const minDelay = Math.max(0.46, 1.02 - (currentSpeed * 0.00075));
        const maxDelay = Math.max(minDelay + 0.12, 1.62 - (currentSpeed * 0.00055));

        return randomBetween(minDelay, maxDelay);
    }

    function stopLoop() {
        if (!animationFrameId) {
            return;
        }

        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = 0;
    }

    function resizeCanvas() {
        const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
        const displayWidth = Math.max(300, Math.round(canvas.clientWidth));
        const displayHeight = Math.max(170, Math.round(canvas.clientHeight));
        const requiredWidth = Math.round(displayWidth * pixelRatio);
        const requiredHeight = Math.round(displayHeight * pixelRatio);

        if (canvas.width !== requiredWidth || canvas.height !== requiredHeight) {
            canvas.width = requiredWidth;
            canvas.height = requiredHeight;
        }

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        stageWidth = displayWidth;
        stageHeight = displayHeight;
        groundY = stageHeight - 28;

        if (!player.airborne) {
            player.y = groundY - player.height;
        }
    }

    function resetRound() {
        score = 0;
        displayedScore = -1;
        speed = 305;
        spawnElapsed = 0;
        spawnDelay = pickSpawnDelay(speed);
        obstacles = [];

        player.vy = 0;
        player.airborne = false;
        player.y = groundY - player.height;

        updateScoreDisplay(true);
    }

    function intersects(a, b) {
        return a.x < (b.x + b.width) &&
            (a.x + a.width) > b.x &&
            a.y < (b.y + b.height) &&
            (a.y + a.height) > b.y;
    }

    function getPlayerHitbox() {
        return {
            x: player.x + 5,
            y: player.y + 4,
            width: player.width - 10,
            height: player.height - 7
        };
    }

    function spawnObstacle() {
        const width = Math.round(randomBetween(20, 42));
        const height = Math.round(randomBetween(24, 58));
        const spawnX = stageWidth + Math.round(randomBetween(34, 84));
        const previous = obstacles.length > 0 ? obstacles[obstacles.length - 1] : null;

        if (previous && (spawnX - (previous.x + previous.width)) < 120) {
            return;
        }

        obstacles.push({
            x: spawnX,
            y: groundY - height,
            width: width,
            height: height
        });
    }

    function endRound() {
        stopLoop();
        setGameState(STATE_GAME_OVER);

        if (Math.floor(score) > bestScore) {
            bestScore = Math.floor(score);
            writeBestScore(bestScore);
        }

        updateScoreDisplay(true);
        setStatus(formatTextTemplate(GAME_TEXT.statusGameOver, {
            score: Math.floor(score)
        }));
        draw();
    }

    function jump() {
        if (player.airborne) {
            return;
        }

        player.vy = JUMP_SPEED;
        player.airborne = true;
    }

    function startRound() {
        resetRound();
        setStatus(GAME_TEXT.statusRunning);
        setGameState(STATE_RUNNING);
        lastFrameTime = 0;
        stopLoop();
        animationFrameId = window.requestAnimationFrame(tick);
    }

    function resumeRound() {
        setStatus(GAME_TEXT.statusRunning);
        setGameState(STATE_RUNNING);
        lastFrameTime = 0;
        stopLoop();
        animationFrameId = window.requestAnimationFrame(tick);
    }

    function pauseRound() {
        if (gameState !== STATE_RUNNING) {
            return;
        }

        stopLoop();
        setGameState(STATE_PAUSED);
        setStatus(GAME_TEXT.statusPaused);
    }

    function requestJump() {
        if (gameState === STATE_IDLE || gameState === STATE_GAME_OVER) {
            startRound();
            jump();
            return;
        }

        if (gameState === STATE_PAUSED) {
            resumeRound();
            jump();
            return;
        }

        jump();
    }

    function update(deltaSeconds) {
        speed = Math.min(680, speed + (8.2 * deltaSeconds));

        player.vy += GRAVITY * deltaSeconds;
        player.y += player.vy * deltaSeconds;

        if (player.y >= (groundY - player.height)) {
            player.y = groundY - player.height;
            player.vy = 0;
            player.airborne = false;
        }

        spawnElapsed += deltaSeconds;
        if (spawnElapsed >= spawnDelay) {
            spawnObstacle();
            spawnElapsed = 0;
            spawnDelay = pickSpawnDelay(speed);
        }

        obstacles.forEach(function (obstacle) {
            obstacle.x -= speed * deltaSeconds;
        });
        obstacles = obstacles.filter(function (obstacle) {
            return obstacle.x + obstacle.width > -24;
        });

        score += deltaSeconds * 10;
        updateScoreDisplay(false);

        const playerHitbox = getPlayerHitbox();
        const hasCollision = obstacles.some(function (obstacle) {
            return intersects(playerHitbox, obstacle);
        });

        if (hasCollision) {
            endRound();
        }
    }

    function drawBackground() {
        const skyGradient = context.createLinearGradient(0, 0, 0, groundY);

        skyGradient.addColorStop(0, "#ffeef6");
        skyGradient.addColorStop(1, "#ffd8e8");
        context.fillStyle = skyGradient;
        context.fillRect(0, 0, stageWidth, groundY);

        context.fillStyle = "rgba(255, 255, 255, 0.45)";
        context.beginPath();
        context.arc(stageWidth * 0.18, stageHeight * 0.2, 24, 0, Math.PI * 2);
        context.arc(stageWidth * 0.24, stageHeight * 0.2, 18, 0, Math.PI * 2);
        context.arc(stageWidth * 0.21, stageHeight * 0.17, 20, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = "#f7b4cd";
        context.fillRect(0, groundY, stageWidth, stageHeight - groundY);

        context.fillStyle = "rgba(255, 255, 255, 0.5)";
        for (let lineX = 0; lineX < stageWidth + 28; lineX += 34) {
            context.fillRect(lineX, groundY + 9, 20, 3);
        }
    }

    function drawPlayer() {
        const x = player.x;
        const y = player.y;
        const w = player.width;
        const h = player.height;

        context.fillStyle = "#e65282";
        context.fillRect(x, y, w, h);

        context.fillStyle = "#1f1f24";
        context.fillRect(x + 6, y + 10, 4, 4);

        context.fillStyle = "#ffbfd6";
        context.fillRect(x + 4, y + h - 9, w - 8, 5);

        context.fillStyle = "#ff6d9c";
        context.fillRect(x + 8, y - 6, 6, 6);
        context.fillRect(x + 16, y - 6, 6, 6);
    }

    function drawObstacles() {
        obstacles.forEach(function (obstacle) {
            context.fillStyle = "#3f3743";
            context.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

            context.fillStyle = "#f4b2ca";
            context.fillRect(obstacle.x + 2, obstacle.y + 3, Math.max(4, obstacle.width - 4), 4);
        });
    }

    function draw() {
        context.clearRect(0, 0, stageWidth, stageHeight);
        drawBackground();
        drawObstacles();
        drawPlayer();

        context.fillStyle = "rgba(31, 31, 36, 0.22)";
        context.fillRect(0, groundY - 1, stageWidth, 2);
    }

    function tick(timestamp) {
        if (gameState !== STATE_RUNNING) {
            return;
        }

        if (!lastFrameTime) {
            lastFrameTime = timestamp;
        }

        const deltaSeconds = Math.min(0.035, Math.max(0.008, (timestamp - lastFrameTime) / 1000));
        lastFrameTime = timestamp;

        update(deltaSeconds);
        draw();

        if (gameState === STATE_RUNNING) {
            animationFrameId = window.requestAnimationFrame(tick);
        }
    }

    function shouldIgnoreKeyboardEvent() {
        const active = document.activeElement;

        if (!active) {
            return false;
        }

        const tagName = active.tagName;

        if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
            return true;
        }

        return active.isContentEditable === true;
    }

    function onKeydown(event) {
        if (event.repeat) {
            return;
        }

        const isJumpKey = event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW";

        if (!isJumpKey) {
            return;
        }

        if (shouldIgnoreKeyboardEvent()) {
            return;
        }

        if (gameState !== STATE_RUNNING) {
            const active = document.activeElement;
            const hasGameFocus = active === stage || active === actionBtn;

            if (!hasGameFocus) {
                return;
            }
        }

        event.preventDefault();
        requestJump();
    }

    function focusStage() {
        if (typeof stage.focus !== "function") {
            return;
        }

        try {
            stage.focus({ preventScroll: true });
        } catch (error) {
            stage.focus();
        }
    }

    actionBtn.addEventListener("click", function () {
        focusStage();

        if (gameState === STATE_PAUSED) {
            resumeRound();
            return;
        }

        startRound();
    });

    stage.addEventListener("pointerdown", function (event) {
        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }

        focusStage();
        requestJump();
    });

    document.addEventListener("keydown", onKeydown);

    window.addEventListener("resize", function () {
        resizeCanvas();
        draw();
    });

    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            pauseRound();
        }
    });

    resizeCanvas();
    applyStaticGameText();
    setGameState(STATE_IDLE);
    setStatus(GAME_TEXT.statusIdle);
    updateScoreDisplay(true);
    draw();
})();
