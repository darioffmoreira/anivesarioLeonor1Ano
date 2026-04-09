(function (app) {
    if (!app) {
        return;
    }

    function initConviteApp() {
        if (app.state.hasInitialized) {
            return;
        }

        app.state.hasInitialized = true;

        if (app.elements.countdownEl) {
            app.elements.countdownEl.textContent = app.texts.COUNTDOWN_LOADING_TEXT;
        }

        if (app.elements.audioUnlockHint) {
            app.elements.audioUnlockHint.textContent = app.texts.AUDIO_UNLOCK_HINT_TEXT;
        }

        if (app.form && typeof app.form.setupRsvpForm === "function") {
            app.form.setupRsvpForm();
        }

        if (app.audio && typeof app.audio.maybeShowFirstVisitLoader === "function") {
            app.audio.maybeShowFirstVisitLoader();
        }

        if (app.audio && typeof app.audio.setupBackgroundMusic === "function") {
            app.audio.setupBackgroundMusic();
        }

        if (app.minnie && typeof app.minnie.setupMinnieSurprises === "function") {
            app.minnie.setupMinnieSurprises();
        }

        if (app.minnie && typeof app.minnie.setupSiteWideConfetti === "function") {
            app.minnie.setupSiteWideConfetti();
        }

        if (app.form && typeof app.form.applyConfig === "function") {
            app.form.applyConfig();
        }

        if (app.form && typeof app.form.readSubmissionLock === "function") {
            app.state.existingSubmissionLock = app.form.readSubmissionLock();
        }

        if (app.flags.isSingleSubmissionLockEnabled && app.state.existingSubmissionLock && app.form && typeof app.form.applySubmissionLockState === "function") {
            app.form.applySubmissionLockState();
        } else if (app.elements.submitBtn) {
            app.elements.submitBtn.textContent = app.texts.FORM_SUBMIT_DEFAULT_TEXT;
        }

        if (app.form && typeof app.form.updateCountdown === "function") {
            app.form.updateCountdown();
            window.setInterval(app.form.updateCountdown, 60000);
        }
    }

    window.initConviteApp = initConviteApp;
})(window.LEONOR_INVITE);
