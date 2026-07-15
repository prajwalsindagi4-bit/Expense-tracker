let tokenClient;

document.addEventListener('DOMContentLoaded', () => {
    // Google Identity Services token client will be initialized on click to prevent race conditions

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
    const cardGlow = document.getElementById('card-back-glow');
    let pulseTimeout;
    
    function triggerPulse() {
        // Add the pulse class for a quick jolt
        creditCard.classList.add('pulse');
        if (cardGlow) cardGlow.classList.add('pulse');
        
        // Remove it shortly after so the slower recoil transition takes over
        clearTimeout(pulseTimeout);
        pulseTimeout = setTimeout(() => {
            creditCard.classList.remove('pulse');
            if (cardGlow) cardGlow.classList.remove('pulse');
        }, 80);
    }

    // Attach pulse to all form inputs
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', triggerPulse);
    });

    // ── Form Toggle ──
    const toSignupBtn = document.getElementById('to-signup');
    const toLoginBtn = document.getElementById('to-login');
    let isAnimating = false;

    toSignupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isAnimating) return;
        isAnimating = true;

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
            setTimeout(() => { isAnimating = false; }, 400);
        }, 400);
    });

    toLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isAnimating) return;
        isAnimating = true;

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
            setTimeout(() => { isAnimating = false; }, 400);
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
        setTimeout(finishCardExit, 1100);
    }

    function finishCardExit() {
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
        // If the card is currently flipped (showing email), start from 180deg
        const startRot = isFlipped ? 180 : 0;
        cardInner.animate([
            { transform: `rotateY(${startRot}deg)`, offset: 0 },
            { transform: `rotateY(${startRot + 360}deg)`, offset: 1 }
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
            window.location.href = 'link-upi.html';
        }, 3000);
    }

    function typeText(element, text, speed, callback) {
        element.textContent = '';
        let i = 0;
        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            } else if (callback) {
                callback();
            }
        }
        type();
    }

    function triggerGoogleCardExit(name, email) {
        if (isFlipped) {
            isFlipped = false;
            cardInner.classList.remove('flipped');
        }

        // Clear existing text for the cool typing effect
        cardHolderName.textContent = '';
        emailValue.textContent = '';

        const blackOverlay = document.getElementById('black-overlay');
        const rect = creditCard.getBoundingClientRect();

        document.body.appendChild(creditCard);

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

        authSide.classList.add('fade-exit');
        blackOverlay.classList.add('active');

        creditCard.style.transition = 'top 1s ease, left 1s ease';
        creditCard.style.top = `calc(50vh - ${rect.height / 2}px)`;
        creditCard.style.left = `calc(50vw - ${rect.width / 2}px)`;

        // Wait for card to center, then type name
        setTimeout(() => {
            typeText(cardHolderName, name.toUpperCase(), 50, () => {
                setTimeout(() => {
                    isFlipped = true;
                    cardInner.classList.add('flipped');
                    // Wait for flip to complete
                    setTimeout(() => {
                        typeText(emailValue, email, 30, () => {
                            setTimeout(finishCardExit, 800);
                        });
                    }, 600);
                }, 400);
            });
        }, 1100);
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInputLogin.value.trim();
        const password = passwordInputLogin.value.trim();
        
        if (!email || !password) return alert('Email and password required');

        const btn = document.getElementById('btn-login-submit');
        const originalText = btn.textContent;
        btn.textContent = 'Logging in...';
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.6';
        
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                localStorage.setItem('user', JSON.stringify(data.user));
                setTimeout(triggerCardExit, 200);
            } else {
                throw new Error(data.error || 'Login failed');
            }
        } catch (err) {
            alert(err.message);
            btn.textContent = originalText;
            btn.style.pointerEvents = 'auto';
            btn.style.opacity = '1';
        }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = nameInputSignup.value.trim();
        const email = emailInputSignup.value.trim();
        const password = passwordInputSignup.value.trim();

        if (!email || !password) return alert('Email and password required');

        const btn = document.getElementById('btn-signup-submit');
        const originalText = btn.textContent;
        btn.textContent = 'Creating account...';
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.6';
        
        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                localStorage.setItem('user', JSON.stringify(data.user));
                setTimeout(triggerCardExit, 200);
            } else {
                throw new Error(data.error || 'Signup failed');
            }
        } catch (err) {
            alert(err.message);
            btn.textContent = originalText;
            btn.style.pointerEvents = 'auto';
            btn.style.opacity = '1';
        }
    });

    const socialBtns = document.querySelectorAll('.btn-auth-social');
    socialBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (!tokenClient && window.google) {
                tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: '422686211143-rdagfd33qg94le3qgpcshqcudbkqh85f.apps.googleusercontent.com',
                    scope: 'email profile',
                    callback: (tokenResponse) => {
                        if (tokenResponse && tokenResponse.access_token) {
                            console.log('Successfully authenticated with Google!', tokenResponse);
                            document.querySelectorAll('.btn-auth-social').forEach(b => {
                                b.style.pointerEvents = 'none';
                                b.style.opacity = '0.6';
                            });

                            // Fetch user info using the access token
                            fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                            })
                            .then(res => res.json())
                            .then(data => {
                                const name = data.name || 'YOUR NAME';
                                const email = data.email || 'your@email.com';
                                
                                fetch('/api/auth/google', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ name, email })
                                })
                                .then(r => r.json())
                                .then(dbData => {
                                    if (dbData.status === 'success') {
                                        localStorage.setItem('user', JSON.stringify(dbData.user));
                                        triggerGoogleCardExit(name, email);
                                    } else {
                                        throw new Error(dbData.error || 'Google auth failed');
                                    }
                                })
                                .catch(err => {
                                    alert(err.message);
                                    document.querySelectorAll('.btn-auth-social').forEach(b => {
                                        b.style.pointerEvents = 'auto';
                                        b.style.opacity = '1';
                                    });
                                });
                            })
                            .catch(err => {
                                console.error('Failed to fetch user profile:', err);
                                setTimeout(triggerCardExit, 200);
                            });
                        }
                    },
                });
            }

            if (tokenClient) {
                tokenClient.requestAccessToken();
            } else {
                console.error('Google Identity Services not loaded.');
                alert('Failed to load Google login. Please try again later.');
            }
        });
    });
});
