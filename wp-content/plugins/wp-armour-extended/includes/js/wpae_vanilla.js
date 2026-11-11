function wpae_add_honeypot_field() {
    // Select all forms and append the hidden field
    const selectors = [
        'form.mc4wp-form',
        'form.quform-form',
        'form.avia_ajax_form',
        '.nf-form-layout form',
        '#edd-blocks-form__register',
        'form.brxe-form',
        'form.forminator-custom-form',
        'form.wpmtst-submission-form',
        'form.fc-form',
        'form#order_review',
        'form.mailpoet_form',
        'form.wsf-form',
        'form.jet-form-builder',
        'form.brxe-brf-pro-forms',
        'form.sib_signup_form',
        'form.youzify-membership-login-form',
        'form.fl-contact-form',
        'form.srfm-form',
        'form.everest-form',
        '.bit-form form'
    ];

    document.querySelectorAll(selectors.join(', ')).forEach(form => {
        form.insertAdjacentHTML('beforeend', wpa_hidden_field);
    });

    // Specific case for wpae_initiator
    document.querySelectorAll('input.wpae_initiator').forEach(input => {
        input.insertAdjacentHTML('afterend', wpa_hidden_field);
    });

    // Specific case for WooCommerce checkout form
    const wooCommerceCheckoutForm = document.querySelector('form.woocommerce-checkout');
    if (wooCommerceCheckoutForm && !wooCommerceCheckoutForm.querySelector('input#wpae_initiator')) {
        wooCommerceCheckoutForm.insertAdjacentHTML('beforeend', wpa_hidden_field);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // GRAVITY FORMS FIXES
    document.addEventListener('gform_post_render', function(event, form_id, current_page) {
        wpae_reinitalize_after_form_load();
    });

    // FOR EASY DIGITAL DOWNLOADS
    document.addEventListener('edd_gateway_loaded', function(gateway) {
        wpae_reinitalize_after_form_load();
    });

    // FOR NINJA FORMS
    document.addEventListener('nfFormReady', function() {
        wpae_reinitalize_after_form_load();
    });

    if (typeof nfRadio !== 'undefined') {
        nfRadio.channel("forms").on("before:submit", function(e) {
            const honeypotInput = document.querySelector('input[name="' + wpa_field_name + '"]');
            if (honeypotInput) {
                const extra = e.get('extra');
                extra.wpa_field_name = wpa_field_name;
                extra.wpa_field_value = honeypotInput.value;
                extra.alt_s = document.querySelector('input[name="alt_s"]').value;
                e.set('extra', extra);
            }
        });
    }
    // EOF FOR NINJA FORMS

    // FOR MAILPOET
    if (typeof MailPoet !== 'undefined' && typeof MailPoet.Ajax !== 'undefined' && typeof MailPoet.Ajax.getParams === 'function') {
        const wapeMailpoetGetParams = MailPoet.Ajax.getParams;
        MailPoet.Ajax.getParams = function() {
            const wapeMailpoetParams = wapeMailpoetGetParams.call(this);
            wapeMailpoetParams[wpa_field_name] = document.querySelector('input[name="' + wpa_field_name + '"]').value;
            wapeMailpoetParams.alt_s = document.querySelector('input[name="alt_s"]').value;
            return wapeMailpoetParams;
        };
    }
    // EOF MAILPOET

    // FOR WS FORM
    document.addEventListener('wsf-rendered', function(e, form, form_id, instance_id) {
        wpae_reinitalize_after_form_load();
    });
    // EOF WS FORM

    // YITH POPUP LOGIN
    document.addEventListener('yith_welrp_popup_template_loaded', function(event, popup, context) {
        const yithForm = document.querySelector('form.yith-welrp-form');
        if (yithForm) {
            yithForm.insertAdjacentHTML('beforeend', wpa_hidden_field);
        }
    });
});

// FOR BEAVER BUILDER
(function() {
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        let [url, options] = args;
        if (options && options.body && typeof options.body === 'string' && options.body.includes('action=fl_builder_email')) {
            const wpaFieldName = wpa_field_name;
            const wpaFieldValue = document.querySelector('input[name="' + wpaFieldName + '"]').value;
            const altSValue = document.querySelector('input[name="alt_s"]').value;
            options.body += '&' + encodeURIComponent(wpaFieldName) + '=' + encodeURIComponent(wpaFieldValue);
            options.body += '&alt_s=' + encodeURIComponent(altSValue);
        }
        return originalFetch.apply(this, args);
    };
})();

// WHEN FORMS LOADED VIA AJAX
document.addEventListener('DOMContentLoaded', function() {
    // This is a more modern approach using MutationObserver, which is generally more robust
    // for AJAX-loaded content than a global AJAX completion event listener.
    const observer = new MutationObserver((mutationsList, observer) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.querySelector('form')) {
                        wpae_reinitalize_after_form_load();
                    }
                });
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
});

function wpae_reinitalize_after_form_load() {
    document.querySelectorAll('.wpa_hidden_field, #altEmail_container, .altEmail_container').forEach(el => el.remove());
    // These functions must be defined and available globally for this to work.
    if (typeof wpa_add_honeypot_field === 'function') {
        wpa_add_honeypot_field();
    }
    if (typeof wpae_add_honeypot_field === 'function') {
        wpae_add_honeypot_field();
    }
    if (wpa_add_test === 'yes' && typeof wpa_add_test_block === 'function') {
        wpa_add_test_block();
    }
}