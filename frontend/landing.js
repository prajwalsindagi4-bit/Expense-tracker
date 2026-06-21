/* ============================================================
   SmartExpense Landing Page — Scroll-Driven Card Animation
   & Section Reveal System
   ============================================================ */

(function () {
    'use strict';

    // ===== DOM REFERENCES =====
    const nav = document.getElementById('landing-nav');
    const progressBar = document.getElementById('scroll-progress');
    const creditCard = document.getElementById('credit-card');
    const cardHero = document.getElementById('card-hero');
    const scrollHint = document.getElementById('scroll-hint');
    const phoneMockup = document.getElementById('phone-mockup');
    const phoneContainer = document.getElementById('phone-container');

    // ===== NAVBAR STATE =====
    let navVisible = false;

    function updateNav() {
        const scrollY = window.scrollY;
        const cardHeroEnd = cardHero ? cardHero.offsetTop + cardHero.offsetHeight : 0;

        // Show nav after card hero section
        if (scrollY > cardHeroEnd - window.innerHeight * 0.5) {
            if (!navVisible) {
                nav.classList.add('visible');
                navVisible = true;
            }
        } else {
            if (navVisible) {
                nav.classList.remove('visible');
                navVisible = false;
            }
        }

        // Scrolled state (glass background)
        if (scrollY > cardHeroEnd) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }

    // ===== SCROLL PROGRESS BAR =====
    function updateScrollProgress() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        if (progressBar) {
            progressBar.style.width = scrollPercent + '%';
        }
    }

    // ===== 3D CARD SCROLL ANIMATION =====
    // The card hero is 400vh tall with a sticky scene.
    // Scroll progress through the card hero drives the card animation.
    function updateCardAnimation() {
        if (!creditCard || !cardHero) return;

        const heroTop = cardHero.offsetTop;
        const heroHeight = cardHero.offsetHeight;
        const scrollY = window.scrollY;

        // Progress: 0 = top of card-hero, 1 = end of card-hero
        const rawProgress = (scrollY - heroTop) / (heroHeight - window.innerHeight);
        let progress = Math.max(0, Math.min(1, rawProgress));

        // Lock the animation from reversing past the splash once completed
        if (progress >= 0.35) {
            window._hasSplashed = true;
        }
        if (window._hasSplashed && progress < 0.35) {
            progress = 0.35;
        }

        const darkWrapper = document.getElementById('dark-scene-wrapper');
        const heroGreeting = document.getElementById('hero-greeting');
        const heroDot = document.getElementById('hero-dot');

        // ---- Phase 0: Dot moves up (0.0 - 0.15) ----
        if (heroDot) {
            if (progress <= 0.15) {
                const p = progress / 0.15;
                const dotY = 50 - (p * 40); // 50% to 10%
                heroDot.style.top = `${dotY}%`;
                heroDot.style.opacity = 1;
            } else if (progress <= 0.20) {
                // Fades out as splash happens
                const p = (progress - 0.15) / 0.05;
                heroDot.style.top = `10%`;
                heroDot.style.opacity = 1 - p;
            } else {
                heroDot.style.opacity = 0;
            }
        }

        // ---- Phase 1: Splash Sequence (0.15 - 0.30) ----
        if (darkWrapper) {
            if (progress <= 0.15) {
                // Hidden
                darkWrapper.style.clipPath = `circle(0px at 50% 10%)`;
            } else if (progress <= 0.30) {
                // Splash expands from the top (where the dollar is)
                const p = (progress - 0.15) / 0.15;
                darkWrapper.style.clipPath = `circle(calc(${p * 150}vmax) at 50% 10%)`;
            } else {
                darkWrapper.style.clipPath = `circle(200vmax at 50% 10%)`;
            }
        }

        // ---- Phase 2: Greeting (0.15 - 0.45) ----
        if (heroGreeting) {
            if (progress <= 0.15) {
                heroGreeting.style.opacity = 0;
                heroGreeting.style.transform = `translate(-50%, calc(-50% + 50px))`;
            } else if (progress <= 0.30) {
                // Fade in synchronously with splash
                const p = (progress - 0.15) / 0.15;
                heroGreeting.style.opacity = p;
                heroGreeting.style.transform = `translate(-50%, calc(-50% + ${50 - (p * 50)}px))`;
            } else if (progress <= 0.40) {
                // Stay
                heroGreeting.style.opacity = 1;
                heroGreeting.style.transform = `translate(-50%, -50%)`;
            } else if (progress <= 0.45) {
                // Fade out
                const p = (progress - 0.40) / 0.05;
                heroGreeting.style.opacity = 1 - p;
                heroGreeting.style.transform = `translate(-50%, calc(-50% - ${p * 50}px))`;
            } else {
                heroGreeting.style.opacity = 0;
            }
        }

        // ---- Phase 3: Card (0.45 - 1.0) ----
        let rotateX = 0, rotateY = 0, rotateZ = 0, scale = 1, translateY = window.innerHeight, opacity = 0;

        if (progress <= 0.45) {
            translateY = window.innerHeight;
            opacity = 0;
        } else if (progress <= 0.60) {
            // Fade in and rise from bottom
            const p = (progress - 0.45) / 0.15;
            rotateX = 40 - (p * 40);
            rotateY = 0;
            scale = 0.5 + (p * 0.5);
            translateY = window.innerHeight - (p * window.innerHeight);
            opacity = p;
        } else if (progress <= 0.85) {
            // Spin
            const p = (progress - 0.60) / 0.25;
            rotateX = 0;
            rotateY = p * 360;
            scale = 1.0;
            translateY = 0;
            opacity = 1;
        } else if (progress <= 0.95) {
            // Scale up
            const p = (progress - 0.85) / 0.10;
            rotateX = 0;
            rotateY = 360;
            scale = 1.0 + (p * 0.8);
            translateY = p * -20;
            opacity = 1 - (p * 0.6);
        } else {
            // Fade out
            const p = (progress - 0.95) / 0.05;
            rotateX = 0;
            rotateY = 360;
            scale = 1.8 + (p * 1.0);
            translateY = -20 - (p * 30);
            opacity = 0.4 - (p * 0.4);
        }

        const cardInner = creditCard.querySelector('.credit-card-inner');
        if (cardInner) {
            cardInner.style.transform = `
                translateY(${translateY}px)
                scale(${scale})
                rotateX(${rotateX}deg)
                rotateY(${rotateY}deg)
                rotateZ(${rotateZ}deg)
            `;
        }
        creditCard.style.opacity = opacity;

        // Scroll hint fades out quickly
        const scrollHint = document.getElementById('scroll-hint');
        if (scrollHint) {
            scrollHint.style.opacity = Math.max(0, 1 - progress * 10);
        }
    }

    // ===== MOUSE PARALLAX ON CARD (Desktop only) =====
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let isInCardSection = true;

    document.addEventListener('mousemove', (e) => {
        targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    function updateMouseParallax() {
        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;

        if (creditCard && isInCardSection) {
            // Add subtle mouse-based rotation on top of scroll animation
            const mouseRotX = mouseY * -5;
            const mouseRotY = mouseX * 8;

            // Get the current transform and append mouse rotation
            // Apply mouse offset to the outer wrapper so it doesn't conflict
            // with the scroll-driven rotation on the inner element
            creditCard.style.transform = `rotateX(${mouseRotX}deg) rotateY(${mouseRotY}deg)`;
        }

        // Phone parallax in hero section
        if (phoneMockup && phoneContainer && !isInCardSection) {
            const rect = phoneContainer.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                const rotY = mouseX * 10;
                const rotX = mouseY * -6;
                phoneMockup.style.transform = `rotateY(${rotY}deg) rotateX(${rotX}deg)`;
            }
        }

        requestAnimationFrame(updateMouseParallax);
    }

    if (window.matchMedia('(pointer: fine)').matches) {
        requestAnimationFrame(updateMouseParallax);
    }

    // ===== INTERSECTION OBSERVER — SCROLL REVEALS =====
    const revealElements = document.querySelectorAll('.scroll-reveal');

    const revealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0.1,
            rootMargin: '0px 0px -80px 0px',
        }
    );

    revealElements.forEach((el) => {
        revealObserver.observe(el);
    });

    // ===== COUNTER ANIMATION =====
    const counters = document.querySelectorAll('.counter');
    let countersAnimated = false;

    const counterObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && !countersAnimated) {
                    countersAnimated = true;
                    animateCounters();
                    counterObserver.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.3 }
    );

    if (counters.length > 0) {
        const statsSection = document.getElementById('stats');
        if (statsSection) {
            counterObserver.observe(statsSection);
        }
    }

    function animateCounters() {
        counters.forEach((counter) => {
            const target = parseFloat(counter.dataset.target);
            const isDecimal = target % 1 !== 0;
            const duration = 2000;
            const startTime = performance.now();

            function updateCounter(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = target * eased;

                if (isDecimal) {
                    counter.textContent = current.toFixed(1);
                } else {
                    counter.textContent = Math.round(current);
                }

                if (progress < 1) {
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = isDecimal ? target.toFixed(1) : target;
                }
            }

            requestAnimationFrame(updateCounter);
        });
    }

    // ===== SMOOTH SCROLL FOR NAV LINKS =====
    document.querySelectorAll('#landing-nav a[href^="#"]').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
            }
        });
    });

    // ===== COMBINED SCROLL HANDLER (Throttled via rAF) =====
    let ticking = false;

    function onScroll() {
        if (!ticking) {
            requestAnimationFrame(() => {
                updateNav();
                updateScrollProgress();
                updateCardAnimation();

                // Track if we're in the card section for mouse parallax
                if (cardHero) {
                    const cardEnd = cardHero.offsetTop + cardHero.offsetHeight;
                    isInCardSection = window.scrollY < cardEnd;
                }

                ticking = false;
            });
            ticking = true;
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    // ===== HAMBURGER MENU (Mobile) =====
    const hamburger = document.getElementById('nav-hamburger');
    const navLinks = document.getElementById('nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('mobile-open');
            hamburger.classList.toggle('active');
        });
    }

    // ===== SPOTLIGHT CARDS =====
    const spotlightCards = document.querySelectorAll('.feature-card, .stat-card, .security-card, .testimonial-card, .app-preview');
    spotlightCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    // ===== STAGGERED TEXT REVEAL =====
    const staggeredElements = document.querySelectorAll('.hero-title, .section-title');
    staggeredElements.forEach(el => {
        const text = el.innerHTML;
        // Split by words and <br> tags
        const tokens = text.split(/(<br\s*\/?>|\s+)/).filter(Boolean);
        
        let newHtml = '';
        let wordIndex = 0;
        
        tokens.forEach(token => {
            if (token.match(/<br\s*\/?>/i)) {
                newHtml += token;
            } else if (token.trim().length > 0 && !token.match(/<[^>]+>/)) {
                newHtml += `<span class="word-wrap"><span class="word-reveal" style="transition-delay: ${wordIndex * 0.08}s">${token}</span></span>`;
                wordIndex++;
            } else {
                newHtml += token;
            }
        });
        
        el.innerHTML = newHtml;
    });

    // ===== INITIAL STATE =====
    updateNav();
    updateScrollProgress();
    updateCardAnimation();



})();
