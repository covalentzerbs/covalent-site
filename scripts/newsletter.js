// Newsletter signup on the contact page. Posts the email to /api/newsletter/subscribe
// and reports back in the status line under the field.
(function () {
    var form = document.querySelector('.newsletter-form');
    if (!form) return;
    var input = form.elements.email;
    var button = form.querySelector('.newsletter-submit');
    var status = form.querySelector('.newsletter-status');

    // Keys typed into the field stay in the field: pages bind Space, F, M and
    // the arrows to the players at the document level.
    input.addEventListener('keydown', function (e) { e.stopPropagation(); });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        input.value = input.value.trim();
        if (!input.value || !input.checkValidity()) {
            status.textContent = 'Check that email.';
            input.focus();
            return;
        }
        button.disabled = true;
        status.textContent = 'Adding you…';
        fetch(form.action, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: input.value, company: form.elements.company.value })
        })
            .then(function (res) {
                return res.json().catch(function () { return {}; }).then(function (data) {
                    if (res.status === 422) {
                        status.textContent = 'Check that email.';
                    } else if (res.ok && data.ok) {
                        form.reset();
                        status.textContent = 'You’re on the list.';
                    } else {
                        status.textContent = 'Something broke. Try again.';
                    }
                });
            })
            .catch(function () { status.textContent = 'Something broke. Try again.'; })
            .then(function () { button.disabled = false; });
    });
})();
