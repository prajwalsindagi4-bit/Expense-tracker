/* ============================================================
   Manmo Landing Page — Scroll-Driven Card Animation
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

    // ===== INTRO ANIMATION (Auto-plays on load) =====
    // t goes from 0.0 to 1.0 over ~1.5 seconds
    function renderIntroFrame(t) {
        const heroGreeting = document.getElementById('hero-greeting');
        const scrollHint = document.getElementById('scroll-hint');

        // Ensure card is completely hidden during intro
        if (creditCard) {
            creditCard.style.opacity = 0;
        }

        if (heroGreeting) {
            // Fade in the text smoothly
            heroGreeting.style.opacity = t;
            heroGreeting.style.transform = `translate(-50%, calc(-50% + ${20 - (t * 20)}px))`;
            heroGreeting.style.backgroundPosition = `100% 0`;
        }

        if (scrollHint) {
            if (t <= 0.50) {
                scrollHint.style.opacity = 0;
            } else {
                const p = (t - 0.50) / 0.50;
                scrollHint.style.opacity = p;
            }
        }
    }

    let introFinished = false;
    let maxCardProgress = 0;

    function updateCardAnimation() {
        if (introFinished || !creditCard || !cardHero) return;

        const heroTop = cardHero.offsetTop;
        const heroHeight = cardHero.offsetHeight;
        const scrollY = window.scrollY;

        let s = (scrollY - heroTop) / (heroHeight - window.innerHeight);
        s = Math.max(0, Math.min(1, s));

        // When animation is fully complete, collapse the space and seamlessly adjust scroll
        if (s >= 0.99 && !introFinished) {
            introFinished = true;
            
            if (creditCard) creditCard.style.display = 'none';
            const heroGreeting = document.getElementById('hero-greeting');
            if (heroGreeting) {
                heroGreeting.style.opacity = 1;
                heroGreeting.style.backgroundPosition = '0% 0';
                heroGreeting.style.transform = 'translate(-50%, -50%)';
            }
            const scrollHint = document.getElementById('scroll-hint');
            if (scrollHint) scrollHint.style.display = 'none';

            const diff = heroHeight - window.innerHeight;
            if (diff > 0) {
                cardHero.style.height = '100vh';
                window.scrollBy({ top: -diff, left: 0, behavior: 'instant' });
            }
            return;
        }

        const heroGreeting = document.getElementById('hero-greeting');
        if (heroGreeting) {
            if (s <= 0.20) {
                const p = s / 0.20;
                heroGreeting.style.opacity = 1;
                heroGreeting.style.backgroundPosition = `${100 - (p * 100)}% 0`;
                heroGreeting.style.transform = `translate(-50%, -50%)`;
            } else if (s <= 0.25) {
                const p = (s - 0.20) / 0.05;
                heroGreeting.style.opacity = 1 - p;
                heroGreeting.style.backgroundPosition = `0% 0`;
                heroGreeting.style.transform = `translate(-50%, calc(-50% - ${p * 50}px))`;
            } else {
                heroGreeting.style.opacity = 0;
            }
        }

        if (s > maxCardProgress) {
            maxCardProgress = s;
        }
        
        let cardS = maxCardProgress;
        let rotateX = 0, rotateY = 0, rotateZ = 0, scale = 1, translateY = window.innerHeight, opacity = 0;

        if (cardS <= 0.25) {
            translateY = window.innerHeight;
            opacity = 0;
        } else if (cardS <= 0.45) {
            // Fade in and rise from bottom
            const p = (cardS - 0.25) / 0.20;
            rotateX = 40 - (p * 40);
            rotateY = 0;
            scale = 0.5 + (p * 0.5);
            translateY = window.innerHeight - (p * window.innerHeight);
            opacity = p;
        } else if (cardS <= 0.75) {
            // Spin
            const p = (cardS - 0.45) / 0.30;
            rotateX = 0;
            rotateY = p * 360;
            scale = 1.0;
            translateY = 0;
            opacity = 1;
        } else if (cardS <= 0.85) {
            // Scale up
            const p = (cardS - 0.75) / 0.10;
            rotateX = 0;
            rotateY = 360;
            scale = 1.0 + (p * 0.8);
            translateY = p * -20;
            opacity = 1 - (p * 0.6);
        } else {
            // Fade out
            const p = (cardS - 0.85) / 0.15;
            rotateX = 0;
            rotateY = 360;
            scale = 1.8 + (p * 1.0);
            translateY = -20 - (p * 30);
            opacity = 0.4 - (p * 0.4);
        }

        const cardInner = creditCard.querySelector('.credit-card-inner');
        if (cardInner) {
            cardInner.style.transform = `translateY(${translateY}px) scale(${scale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
        }
        creditCard.style.opacity = opacity;

        const scrollHint = document.getElementById('scroll-hint');
        if (scrollHint) {
            scrollHint.style.opacity = Math.max(0, 1 - s * 10);
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
            const intersecting = entries.filter(e => e.isIntersecting).sort((a, b) => {
                return a.boundingClientRect.top - b.boundingClientRect.top;
            });
            
            let delay = 0;
            intersecting.forEach((entry) => {
                entry.target.style.transitionDelay = `${delay}s`;
                delay += 0.15;
                
                requestAnimationFrame(() => {
                    entry.target.classList.add('visible');
                });
                revealObserver.unobserve(entry.target);
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

    // ===== AUTO-PLAY CINEMATIC INTRO =====
    const INTRO_DURATION = 1500; // Fast fade in, 1.5s total
    let introStartTime = null;

    function playIntroAnimation(timestamp) {
        if (!introStartTime) introStartTime = timestamp;
        const elapsed = timestamp - introStartTime;
        
        // Progress goes from 0 to 1 over INTRO_DURATION
        const progress = Math.min(1, Math.max(0, elapsed / INTRO_DURATION));
        
        renderIntroFrame(progress);
        
        if (progress < 1) {
            requestAnimationFrame(playIntroAnimation);
        } else {
            // Re-enable scrolling after animation
            document.body.style.overflow = 'auto';
            introFinished = true;
            updateCardAnimation(); // Ensure first frame of scroll is ready
        }
    }

    // Lock scrolling initially and start animation
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(playIntroAnimation);

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

    // ===== PAGE EXIT ANIMATION TO LOGIN =====
    const loginLinks = document.querySelectorAll('a[href="login.html"]');
    if (loginLinks.length > 0) {
        // Create a black overlay for the transition
        const pageTransitionOverlay = document.createElement('div');
        pageTransitionOverlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: #050507;
            z-index: 99999;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.8s cubic-bezier(0.25, 0.1, 0.25, 1);
        `;
        document.body.appendChild(pageTransitionOverlay);

        loginLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetUrl = link.getAttribute('href');
                
                // Trigger the fade out
                pageTransitionOverlay.style.pointerEvents = 'all';
                pageTransitionOverlay.style.opacity = '1';
                
                // Add a subtle zoom out to the body
                document.body.style.transition = 'transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)';
                document.body.style.transform = 'scale(0.95)';
                
                setTimeout(() => {
                    window.location.href = targetUrl;
                }, 800);
            });
        });
    }

})();
