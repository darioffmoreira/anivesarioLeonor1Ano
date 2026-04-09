(function (app) {
    if (!app) {
        return;
    }

    const elements = app.elements;
    const state = app.state;
    const constants = app.constants;
    const texts = app.texts;
    const config = app.INVITE_CONFIG;

    function getAutoPauseCycleLimit() {
        const configuredLimit = Number(config.backgroundMusicAutoPauseAfterCycles);

        if (!Number.isFinite(configuredLimit)) {
            return 3;
        }

        return Math.max(0, Math.floor(configuredLimit));
    }

    function hasSeenFirstVisitLoader() {
        try {
            return window.localStorage.getItem(constants.FIRST_VISIT_LOADER_KEY) === "1";
        } catch (error) {
            return false;
        }
    }

    function markFirstVisitLoaderSeen() {
        try {
            window.localStorage.setItem(constants.FIRST_VISIT_LOADER_KEY, "1");
        } catch (error) {
            return;
        }
    }

    function hideFirstVisitLoader() {
        if (!elements.firstVisitLoader) {
            return;
        }

        elements.firstVisitLoader.classList.remove("is-visible");
        document.body.classList.remove("loader-lock");
    }

    function maybeShowFirstVisitLoader() {
        if (!elements.firstVisitLoader || hasSeenFirstVisitLoader()) {
            return;
        }

        markFirstVisitLoaderSeen();
        document.body.classList.add("loader-lock");
        elements.firstVisitLoader.classList.add("is-visible");

        elements.firstVisitLoader.addEventListener("click", hideFirstVisitLoader, { once: true });
        window.setTimeout(hideFirstVisitLoader, constants.FIRST_VISIT_LOADER_DURATION_MS);
    }

    function isBackgroundMusicPlaying() {
        return !!elements.bgMusic && !elements.bgMusic.paused && !elements.bgMusic.ended;
    }

    function clearAudioUnlockHintTimer() {
        if (!state.audioUnlockHintTimer) {
            return;
        }

        window.clearTimeout(state.audioUnlockHintTimer);
        state.audioUnlockHintTimer = null;
    }

    function clearAudioFade() {
        if (!state.audioFadeTimer) {
            return;
        }

        window.clearInterval(state.audioFadeTimer);
        state.audioFadeTimer = null;
    }

    function hideAudioUnlockHint() {
        if (!elements.audioUnlockHint) {
            return;
        }

        clearAudioUnlockHintTimer();
        elements.audioUnlockHint.classList.remove("is-visible");
        elements.audioUnlockHint.hidden = true;
    }

    function showAudioUnlockHint() {
        if (!elements.audioUnlockHint) {
            return;
        }

        clearAudioUnlockHintTimer();
        elements.audioUnlockHint.hidden = false;

        window.requestAnimationFrame(function () {
            if (elements.audioUnlockHint) {
                elements.audioUnlockHint.classList.add("is-visible");
            }
        });
    }

    function fadeAudioTo(targetVolume, durationMs, onComplete) {
        if (!elements.bgMusic) {
            return;
        }

        const safeTarget = Math.max(0, Math.min(1, targetVolume));
        const startVolume = Number.isFinite(elements.bgMusic.volume) ? elements.bgMusic.volume : 0;
        const delta = safeTarget - startVolume;

        clearAudioFade();

        if (Math.abs(delta) < 0.01 || durationMs <= 0) {
            elements.bgMusic.volume = safeTarget;
            if (typeof onComplete === "function") {
                onComplete();
            }
            return;
        }

        const totalSteps = Math.max(1, Math.round(durationMs / constants.AUDIO_FADE_STEP_MS));
        const stepDuration = Math.max(16, Math.round(durationMs / totalSteps));
        let currentStep = 0;

        state.audioFadeTimer = window.setInterval(function () {
            currentStep += 1;
            elements.bgMusic.volume = startVolume + ((delta * currentStep) / totalSteps);

            if (currentStep >= totalSteps) {
                clearAudioFade();
                elements.bgMusic.volume = safeTarget;

                if (typeof onComplete === "function") {
                    onComplete();
                }
            }
        }, stepDuration);
    }

    function scheduleAudioUnlockHint() {
        if (!elements.audioUnlockHint || state.userPausedAudio || isBackgroundMusicPlaying()) {
            hideAudioUnlockHint();
            return;
        }

        clearAudioUnlockHintTimer();
        state.audioUnlockHintTimer = window.setTimeout(function () {
            if (!state.userPausedAudio && !isBackgroundMusicPlaying()) {
                showAudioUnlockHint();
            }
        }, 900);
    }

    function updateAudioToggleState() {
        if (!elements.bgMusic || !elements.audioToggleBtn) {
            return;
        }

        const isPlaying = isBackgroundMusicPlaying();

        elements.audioToggleBtn.setAttribute("aria-pressed", isPlaying ? "true" : "false");
        elements.audioToggleBtn.setAttribute("aria-label", isPlaying ? texts.AUDIO_PAUSE_LABEL : texts.AUDIO_RESUME_LABEL);
        elements.audioToggleBtn.setAttribute("title", isPlaying ? texts.AUDIO_PAUSE_LABEL : texts.AUDIO_RESUME_LABEL);
        elements.audioToggleBtn.classList.toggle("is-playing", isPlaying);

        if (elements.audioToggleIcon) {
            elements.audioToggleIcon.innerHTML = isPlaying ? "&#10074;&#10074;" : "&#9654;";
            elements.audioToggleIcon.classList.toggle("audio-toggle-btn__icon--pause", isPlaying);
        }

        if (isPlaying) {
            hideAudioUnlockHint();
        } else if (!state.userPausedAudio) {
            scheduleAudioUnlockHint();
        } else {
            hideAudioUnlockHint();
        }
    }

    function stopAutoStartRetries() {
        if (!state.audioAutoStartRetryTimer) {
            return;
        }

        window.clearInterval(state.audioAutoStartRetryTimer);
        state.audioAutoStartRetryTimer = null;
    }

    function tryAutoStartBackgroundMusic() {
        if (state.userPausedAudio) {
            return;
        }

        startBackgroundMusic(true, false);
    }

    function restartBackgroundMusicFromStart() {
        if (!elements.bgMusic) {
            return;
        }

        elements.bgMusic.currentTime = 0;
        elements.bgMusic.muted = false;
        elements.bgMusic.volume = config.backgroundMusicVolume;

        const restartPromise = elements.bgMusic.play();
        if (restartPromise && typeof restartPromise.then === "function") {
            restartPromise.then(function () {
                stopAutoStartRetries();
                updateAudioToggleState();
            }).catch(function () {
                beginAutoStartRetries();
                updateAudioToggleState();
            });
            return;
        }

        if (!elements.bgMusic.paused && !elements.bgMusic.ended) {
            stopAutoStartRetries();
        }

        updateAudioToggleState();
    }

    function handleBackgroundMusicEnded() {
        const cycleLimit = getAutoPauseCycleLimit();

        if (state.hasManualAudioOverride || cycleLimit <= 0) {
            updateAudioToggleState();
            return;
        }

        state.completedAutoAudioCycles += 1;

        if (state.completedAutoAudioCycles >= cycleLimit) {
            state.hasReachedAutoAudioLimit = true;
            state.userPausedAudio = true;
            stopAutoStartRetries();
            updateAudioToggleState();
            return;
        }

        restartBackgroundMusicFromStart();
    }

    function beginAutoStartRetries() {
        if (!elements.bgMusic || state.audioAutoStartRetryTimer) {
            return;
        }

        state.audioAutoStartRetryTimer = window.setInterval(function () {
            if (state.userPausedAudio) {
                stopAutoStartRetries();
                return;
            }

            if (!elements.bgMusic.paused && !elements.bgMusic.ended) {
                stopAutoStartRetries();
                return;
            }

            tryAutoStartBackgroundMusic();
        }, constants.AUDIO_AUTOSTART_RETRY_INTERVAL_MS);
    }

    function tryPlayBackgroundMusic(allowMutedBootstrap) {
        if (!elements.bgMusic) {
            return;
        }

        const targetVolume = config.backgroundMusicVolume;

        if (isBackgroundMusicPlaying()) {
            stopAutoStartRetries();
            fadeAudioTo(targetVolume, constants.AUDIO_FADE_IN_DURATION_MS);
            updateAudioToggleState();
            return;
        }

        clearAudioFade();
        elements.bgMusic.muted = false;
        elements.bgMusic.volume = 0;

        const playPromise = elements.bgMusic.play();
        if (playPromise && typeof playPromise.then === "function") {
            playPromise.then(function () {
                stopAutoStartRetries();
                fadeAudioTo(targetVolume, constants.AUDIO_FADE_IN_DURATION_MS);
                updateAudioToggleState();
            }).catch(function () {
                if (!allowMutedBootstrap || state.hasTriedMutedBootstrap) {
                    beginAutoStartRetries();
                    updateAudioToggleState();
                    return;
                }

                state.hasTriedMutedBootstrap = true;
                elements.bgMusic.muted = true;
                elements.bgMusic.volume = 0;

                const mutedPromise = elements.bgMusic.play();
                if (mutedPromise && typeof mutedPromise.then === "function") {
                    mutedPromise.then(function () {
                        elements.bgMusic.muted = false;
                        stopAutoStartRetries();
                        fadeAudioTo(targetVolume, constants.AUDIO_FADE_IN_DURATION_MS);
                        updateAudioToggleState();
                    }).catch(function () {
                        elements.bgMusic.muted = false;
                        beginAutoStartRetries();
                        updateAudioToggleState();
                    });
                    return;
                }

                elements.bgMusic.muted = false;
                beginAutoStartRetries();
                updateAudioToggleState();
            });
            return;
        }

        if (!elements.bgMusic.paused && !elements.bgMusic.ended) {
            stopAutoStartRetries();
            fadeAudioTo(targetVolume, constants.AUDIO_FADE_IN_DURATION_MS);
        }

        updateAudioToggleState();
    }

    function startBackgroundMusic(allowMutedBootstrap, isUserInitiated) {
        if (!elements.bgMusic) {
            return;
        }

        if (isUserInitiated) {
            state.hasManualAudioOverride = true;
            state.hasReachedAutoAudioLimit = false;
            state.completedAutoAudioCycles = 0;
        } else if (state.hasReachedAutoAudioLimit && !state.hasManualAudioOverride) {
            updateAudioToggleState();
            return;
        }

        elements.bgMusic.loop = state.hasManualAudioOverride;

        state.userPausedAudio = false;
        hideAudioUnlockHint();
        clearAudioFade();
        tryPlayBackgroundMusic(allowMutedBootstrap);
    }

    function stopBackgroundMusic() {
        if (!elements.bgMusic) {
            return;
        }

        state.userPausedAudio = true;
        stopAutoStartRetries();

        if (elements.bgMusic.paused || elements.bgMusic.ended) {
            clearAudioFade();
            updateAudioToggleState();
            return;
        }

        fadeAudioTo(0, constants.AUDIO_FADE_OUT_DURATION_MS, function () {
            elements.bgMusic.pause();
            elements.bgMusic.volume = config.backgroundMusicVolume;
            updateAudioToggleState();
        });
    }

    function toggleBackgroundMusic() {
        if (isBackgroundMusicPlaying()) {
            stopBackgroundMusic();
            return;
        }

        startBackgroundMusic(false, true);
    }

    function bindAutoStartFallback() {
        if (state.hasAutoStartFallback) {
            return;
        }

        state.hasAutoStartFallback = true;

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
        if (!elements.bgMusic) {
            return;
        }

        elements.bgMusic.loop = false;
        elements.bgMusic.autoplay = true;
        elements.bgMusic.volume = config.backgroundMusicVolume;

        if (config.backgroundMusicUrl && elements.bgMusic.src.indexOf(config.backgroundMusicUrl) === -1) {
            elements.bgMusic.src = config.backgroundMusicUrl;
        }

        elements.bgMusic.load();

        if (elements.audioToggleBtn) {
            elements.audioToggleBtn.addEventListener("click", toggleBackgroundMusic);
        }

        elements.bgMusic.addEventListener("play", updateAudioToggleState);
        elements.bgMusic.addEventListener("pause", updateAudioToggleState);
        elements.bgMusic.addEventListener("ended", handleBackgroundMusicEnded);
        elements.bgMusic.addEventListener("play", stopAutoStartRetries);
        elements.bgMusic.addEventListener("canplay", tryAutoStartBackgroundMusic);
        elements.bgMusic.addEventListener("canplaythrough", tryAutoStartBackgroundMusic);

        bindAutoStartFallback();
        beginAutoStartRetries();
        updateAudioToggleState();
        tryAutoStartBackgroundMusic();
        window.setTimeout(tryAutoStartBackgroundMusic, 260);
        window.setTimeout(tryAutoStartBackgroundMusic, 900);
    }

    app.audio = {
        maybeShowFirstVisitLoader: maybeShowFirstVisitLoader,
        setupBackgroundMusic: setupBackgroundMusic,
        stopBackgroundMusic: stopBackgroundMusic,
        updateAudioToggleState: updateAudioToggleState,
        hideAudioUnlockHint: hideAudioUnlockHint
    };
})();
