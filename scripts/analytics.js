// analytics.js — Covalent Studios GA4 event helpers
// Measurement ID: G-T14F8BVFLJ
// Page views are tracked automatically by gtag on every page load.
// This file wires up custom event tracking for key interactions.
(function () {
    'use strict';

    // ── Core helper ───────────────────────────────────────────────────────────
    function track(event, params) {
        if (typeof gtag !== 'function') return;
        gtag('event', event, params || {});
    }

    // ── Outbound links (Instagram, LinkedIn, Vimeo, etc.) ────────────────────
    document.querySelectorAll('a[target="_blank"]').forEach(function (link) {
        link.addEventListener('click', function () {
            track('outbound_click', {
                link_url:   link.href,
                link_label: link.getAttribute('aria-label') || link.textContent.trim() || link.href
            });
        });
    });

    // ── Navigation menu clicks ────────────────────────────────────────────────
    document.querySelectorAll('a.menu-link').forEach(function (link) {
        link.addEventListener('click', function () {
            track('navigation_click', {
                destination: link.textContent.trim(),
                from_page:   window.location.pathname
            });
        });
    });

    // ── Home page: project panel clicks ──────────────────────────────────────
    document.querySelectorAll('.project-client-link').forEach(function (link) {
        link.addEventListener('click', function () {
            var nameEl = link.querySelector('.project-client');
            track('project_click', {
                project_name: nameEl ? nameEl.textContent.trim() : link.href,
                from_page:    window.location.pathname
            });
        });
    });

    // ── Contact page: email link click ───────────────────────────────────────
    var emailLink = document.getElementById('contactEmail');
    if (emailLink) {
        emailLink.addEventListener('click', function () {
            track('contact_email_click', { email: 'hello@covalentstudios.co' });
        });
    }

    // ── Directors page: director name clicks ─────────────────────────────────
    document.querySelectorAll('.director-name').forEach(function (el) {
        el.addEventListener('click', function () {
            track('director_click', { director_name: el.textContent.trim() });
        });
    });

    // ── Director profile page: track which director was viewed ───────────────
    // director-profile.html exposes window.DIRECTOR from its inline script
    if (window.location.pathname.indexOf('director-profile') !== -1) {
        var dirName = (window.DIRECTOR && window.DIRECTOR.name) ? window.DIRECTOR.name : 'unknown';
        track('director_profile_view', { director_name: dirName });
    }

    // ── Director profile page: work card clicks ───────────────────────────────
    document.querySelectorAll('.work-card').forEach(function (card) {
        card.addEventListener('click', function () {
            var clientEl = card.querySelector('.card-client');
            var titleEl  = card.querySelector('.card-title');
            track('director_work_click', {
                project_client: clientEl ? clientEl.textContent.trim() : 'unknown',
                project_title:  titleEl  ? titleEl.textContent.trim()  : 'unknown',
                director_name:  (window.DIRECTOR && window.DIRECTOR.name) ? window.DIRECTOR.name : 'unknown'
            });
        });
    });

    // ── Project pages: reel video dwell (3 s = likely watching) ─────────────
    // Fires on single-project pages that have a hero Vimeo iframe
    var heroIframe = document.querySelector('.project-video-container iframe, .fixed-video-bg iframe');
    if (heroIframe && window.location.pathname.indexOf('director-profile') === -1) {
        var pageTitle = document.title || window.location.pathname;
        var dwellFired = false;
        setTimeout(function () {
            if (!document.hidden && !dwellFired) {
                dwellFired = true;
                track('video_dwell_3s', { video_page: pageTitle });
            }
        }, 3000);
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) dwellFired = true; // don't fire if user tabbed away
        });
    }

    // ── Director profile page: hover-to-play video (card hover) ─────────────
    // Fire once per card the first time the user triggers the video
    document.querySelectorAll('[id^="cardVideo"]').forEach(function (layer) {
        var fired = false;
        var obs = new MutationObserver(function () {
            if (!fired && layer.classList.contains('playing')) {
                fired = true;
                var card   = layer.closest('.work-card');
                var client = card ? card.querySelector('.card-client') : null;
                track('director_reel_hover_play', {
                    project_client: client ? client.textContent.trim() : 'unknown',
                    director_name:  (window.DIRECTOR && window.DIRECTOR.name) ? window.DIRECTOR.name : 'unknown'
                });
            }
        });
        obs.observe(layer, { attributes: true, attributeFilter: ['class'] });
    });

    // ── Home page: section-viewed tracking ───────────────────────────────────
    // The homepage uses a custom vertical-scroll snap container (#scrollContainer).
    // Standard scroll_depth_85 doesn't apply, so we observe each panel instead.
    var scrollContainer = document.getElementById('scrollContainer');
    if (scrollContainer) {
        var sectionObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var el     = entry.target;
                var client = el.querySelector('.project-client');
                var name   = client ? client.textContent.trim() : 'hero';
                track('home_section_viewed', { section_name: name });
                sectionObs.unobserve(el); // fire once per session per section
            });
        }, {
            root:      scrollContainer,
            threshold: 0.5  // section must be well in view before counting
        });

        scrollContainer.querySelectorAll('.hero-section, .project-section').forEach(function (section) {
            sectionObs.observe(section);
        });
    }

    // ── About page: word-reveal completion ───────────────────────────────────
    // No About page exists yet. When it's built, add a sentinel element with
    // id="aboutRevealEnd" at the end of the word-reveal section. This observer
    // will fire about_reveal_complete automatically with no further changes needed.
    var revealSentinel = document.getElementById('aboutRevealEnd');
    if (revealSentinel) {
        var revealObs = new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting) {
                track('about_reveal_complete');
                revealObs.disconnect();
            }
        }, { threshold: 1.0 });
        revealObs.observe(revealSentinel);
    }

    // ── Scroll depth: 85 % of scrollable pages ───────────────────────────────
    // Not applied to the home page (uses a custom panel-scroll container)
    if (window.location.pathname.indexOf('home') === -1 &&
        window.location.pathname !== '/' &&
        window.location.pathname !== '') {
        var scrollTracked = false;
        window.addEventListener('scroll', function () {
            if (scrollTracked) return;
            var pct = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
            if (pct >= 0.85) {
                scrollTracked = true;
                track('scroll_depth_85', { page: window.location.pathname });
            }
        }, { passive: true });
    }

})();
