// Weighted scroll: wheel input is eased toward its target instead of jumping,
// so the page glides and settles. Touch devices, reduced-motion users, locked
// pages and the open viewer keep native scrolling.
(function () {
    if (!window.matchMedia) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (matchMedia('(hover: none)').matches) return;
    var EASE = 0.1, target = window.scrollY, current = target, raf = null;
    function max() { return document.documentElement.scrollHeight - window.innerHeight; }
    function locked() {
        return document.body.classList.contains('viewer-open') ||
               document.body.style.overflow === 'hidden' ||
               getComputedStyle(document.body).position === 'fixed';
    }
    function tick() {
        current += (target - current) * EASE;
        if (Math.abs(target - current) < 0.4) { current = target; raf = null; }
        else raf = requestAnimationFrame(tick);
        window.scrollTo({ top: current, left: 0, behavior: 'instant' });
    }
    window.addEventListener('wheel', function (e) {
        if (e.ctrlKey || e.defaultPrevented) return;      // pinch zoom, or something else owns it
        if (locked() || max() <= 0) return;
        e.preventDefault();
        var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
        if (!raf) { current = window.scrollY; target = current; }   // resync after keys, anchors, scrollbar drags
        target = Math.max(0, Math.min(max(), target + dy));
        if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: false });
    window.addEventListener('resize', function () { if (!raf) { target = current = window.scrollY; } });
})();
