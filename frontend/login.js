document.addEventListener('DOMContentLoaded', () => {
    const cardInner = document.getElementById('credit-card-inner');
    const creditCard = document.getElementById('credit-card');
    const cardHolderName = document.getElementById('card-holder-name');
    const emailValue = document.getElementById('email-value');
    const visualContent = creditCard.closest('.visual-content');
    const authSide = document.querySelector('.auth-side');
    const pageFlash = document.getElementById('page-flash');

    const loginWrapper = document.getElementById('login-form-wrapper');
    const signupWrapper = document.getElementById('signup-form-wrapper');

    // All name inputs (login + signup)
    const nameInputLogin = document.getElementById('login-name');
    const nameInputSignup = document.getElementById('signup-name');

    // All email inputs
    const emailInputLogin = document.getElementById('login-email');
    const emailInputSignup = document.getElementById('signup-email');

    // Password inputs
    const passwordInputLogin = document.getElementById('login-password');
    const passwordInputSignup = document.getElementById('signup-password');

    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    let isFlipped = false;

    // ── Name → Card Holder ──
    function handleNameInput(e) {
        const val = e.target.value.trim();
        cardHolderName.textContent = val.length > 0 ? val.toUpperCase() : 'YOUR NAME';

        // If card is flipped, flip it back to front to show the name
        if (isFlipped) {
            isFlipped = false;
            cardInner.classList.remove('flipped');
        }
    }

    nameInputLogin.addEventListener('input', handleNameInput);
    nameInputSignup.addEventListener('input', handleNameInput);

    // ── Email → Card Back ──
    function handleEmailFocus() {
        if (!isFlipped) {
            isFlipped = true;
            cardInner.classList.add('flipped');
        }
    }

    function handleEmailInput(e) {
        const val = e.target.value.trim();
        emailValue.textContent = val.length > 0 ? val : 'your@email.com';
    }

    function handleEmailBlur() {
        setTimeout(() => {
            const active = document.activeElement;
            if (active !== emailInputLogin && active !== emailInputSignup) {
                isFlipped = false;
                cardInner.classList.remove('flipped');
            }
        }, 100);
    }

    emailInputLogin.addEventListener('focus', handleEmailFocus);
    emailInputLogin.addEventListener('input', handleEmailInput);
    emailInputLogin.addEventListener('blur', handleEmailBlur);

    emailInputSignup.addEventListener('focus', handleEmailFocus);
    emailInputSignup.addEventListener('input', handleEmailInput);
    emailInputSignup.addEventListener('blur', handleEmailBlur);

    // ── Password → flip back to front ──
    function handlePasswordFocus() {
        if (isFlipped) {
            isFlipped = false;
            cardInner.classList.remove('flipped');
        }
    }

    if (passwordInputLogin) passwordInputLogin.addEventListener('focus', handlePasswordFocus);
    if (passwordInputSignup) passwordInputSignup.addEventListener('focus', handlePasswordFocus);

    // Mark name and email inputs as card-linked for special focus glow
    [nameInputLogin, nameInputSignup, emailInputLogin, emailInputSignup].forEach(input => {
        input.classList.add('card-linked');
    });

    // ── Keypress Pulse Effect ──
    const rings = document.querySelectorAll('.deco-ring');
    let pulseTimeout;
    
    function triggerPulse() {
        // Add the pulse class for a quick jolt
        creditCard.classList.add('pulse');
        rings.forEach(r => r.classList.add('pulse'));
        
        // Remove it shortly after so the slower recoil transition takes over
        clearTimeout(pulseTimeout);
        pulseTimeout = setTimeout(() => {
            creditCard.classList.remove('pulse');
            rings.forEach(r => r.classList.remove('pulse'));
        }, 80);
    }

    // Attach pulse to all form inputs
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', triggerPulse);
    });

    // ── Form Toggle ──
    const toSignupBtn = document.getElementById('to-signup');
    const toLoginBtn = document.getElementById('to-login');

    toSignupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginWrapper.classList.add('fade-out');
        setTimeout(() => {
            loginWrapper.classList.add('hidden');
            loginWrapper.classList.remove('fade-out');
            signupWrapper.classList.remove('hidden');
            requestAnimationFrame(() => {
                signupWrapper.style.opacity = '1';
                signupWrapper.style.transform = 'translateX(0)';
            });
            if (nameInputLogin.value) nameInputSignup.value = nameInputLogin.value;
            if (emailInputLogin.value) emailInputSignup.value = emailInputLogin.value;
        }, 400);
    });

    toLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signupWrapper.classList.add('fade-out');
        setTimeout(() => {
            signupWrapper.classList.add('hidden');
            signupWrapper.classList.remove('fade-out');
            loginWrapper.classList.remove('hidden');
            requestAnimationFrame(() => {
                loginWrapper.style.opacity = '1';
                loginWrapper.style.transform = 'translateX(0)';
            });
            if (nameInputSignup.value) nameInputLogin.value = nameInputSignup.value;
            if (emailInputSignup.value) emailInputLogin.value = emailInputSignup.value;
        }, 400);
    });

    function triggerCardExit() {
        // Flip back to front first if flipped
        if (isFlipped) {
            isFlipped = false;
            cardInner.classList.remove('flipped');
        }

        const blackOverlay = document.getElementById('black-overlay');
        const rect = creditCard.getBoundingClientRect();

        // Move the card to the body so it escapes overflow:hidden on .visual-side
        document.body.appendChild(creditCard);

        // Pin it at its current screen position
        creditCard.style.cssText = `
            position: fixed;
            top: ${rect.top}px;
            left: ${rect.left}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            margin: 0;
            z-index: 1000;
            perspective: 1200px;
        `;
        void creditCard.offsetHeight;

        // SIMULTANEOUSLY: fade left, black overlay, card slides to center
        authSide.classList.add('fade-exit');
        blackOverlay.classList.add('active');

        // Animate card to center
        creditCard.style.transition = 'top 1s ease, left 1s ease';
        creditCard.style.top = `calc(50vh - ${rect.height / 2}px)`;
        creditCard.style.left = `calc(50vw - ${rect.width / 2}px)`;

        // After card reaches center → spin + zoom + fade
        setTimeout(() => {
            creditCard.style.transition = 'none';
            void creditCard.offsetHeight;

            // Animate the OUTER card for scale + opacity (no rotateY here)
            const outerAnim = creditCard.animate([
                { transform: 'scale(1)', opacity: 1, offset: 0 },
                { transform: 'scale(1.5)', opacity: 1, offset: 0.3 },
                { transform: 'scale(3)', opacity: 0.6, offset: 0.7 },
                { transform: 'scale(5)', opacity: 0, offset: 1 }
            ], {
                duration: 3000,
                easing: 'cubic-bezier(0.22, 0.6, 0.36, 1)',
                fill: 'forwards'
            });

            // Animate the INNER card for rotateY spin (it has preserve-3d)
            cardInner.animate([
                { transform: 'rotateY(0deg)', offset: 0 },
                { transform: 'rotateY(360deg)', offset: 1 }
            ], {
                duration: 3000,
                easing: 'cubic-bezier(0.22, 0.6, 0.36, 1)',
                fill: 'forwards'
            });

            // Flash near the end
            setTimeout(() => {
                pageFlash.classList.add('active');
            }, 2600);

            // Redirect
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
        }, 1100);
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-login-submit');
        btn.textContent = 'Logging in...';
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.6';
        setTimeout(triggerCardExit, 200);
    });

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-signup-submit');
        btn.textContent = 'Creating account...';
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.6';
        setTimeout(triggerCardExit, 200);
    });
});
