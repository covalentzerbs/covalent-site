// Weighted scroll: vertical wheel input is eased toward its target instead of
// jumping, so the page glides and settles.
//
// It must never get in the way of the two-finger swipe back / forward. The
// browser decides that gesture from the first wheel events of a swipe, and a
// handler that calls preventDefault on them cancels it (and our vertical
// easing would turn the sideways swipe into a scroll). So each gesture is
// classified on its first event: anything with real sideways movement, shift
// scrolling, or an event the browser will not let us cancel is left entirely
// to the browser until the gesture ends.
//
// Touch devices, reduced-motion users, locked pages and the open viewer keep
// native scrolling.
(function () {
    if (!window.matchMedia) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (matchMedia('(hover: none)').matches) return;
    var EASE = 0.1, GAP = 180;   // ms of quiet that ends a gesture (trackpad momentum included)
    var target = window.scrollY, current = target, raf = null;
    var gesture = null, lastWheel = 0;
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
        var now = performance.now();
        if (now - lastWheel > GAP) gesture = null;
        lastWheel = now;
        if (e.ctrlKey || e.defaultPrevented) return;      // pinch zoom, or something else owns it
        var ax = Math.abs(e.deltaX), ay = Math.abs(e.deltaY);
        if (gesture === null) {
            if (ax === 0 && ay === 0) return;             // no direction yet
            var sideways = e.shiftKey || ax > ay * 0.5;   // generous: a diagonal swipe counts as a back swipe
            gesture = (sideways || !e.cancelable || locked() || max() <= 0) ? 'native' : 'eased';
        }
        if (gesture === 'native') return;
        e.preventDefault();
        var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
        if (!raf) { current = window.scrollY; target = current; }   // resync after keys, anchors, scrollbar drags
        target = Math.max(0, Math.min(max(), target + dy));
        if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: false });
    window.addEventListener('resize', function () { if (!raf) { target = current = window.scrollY; } });
})();
