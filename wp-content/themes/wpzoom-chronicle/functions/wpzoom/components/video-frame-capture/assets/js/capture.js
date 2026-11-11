/**
 * Frame-capture UI for self-hosted MP4 fields.
 *
 * Browser-side first: try drawing the current <video> frame to a canvas and
 * exporting as JPEG. If the video host doesn't allow CORS for canvas reads,
 * the canvas is "tainted" and toDataURL() throws — we catch and fall back to
 * the server (clip.wp.md/api/frame) via the wpz_capture_frame AJAX handler.
 */
(function ($) {
    'use strict';

    if (typeof window.wpzFrameCapture === 'undefined') {
        return;
    }

    var i18n = wpzFrameCapture.i18n || {};

    function setStatus($wrapper, text) {
        $wrapper.find('.wpz-frame-capture__status').text(text || '');
    }

    function attemptBrowserCapture(videoEl) {
        if (!videoEl || !videoEl.videoWidth) {
            return null;
        }
        try {
            var canvas = document.createElement('canvas');
            canvas.width = videoEl.videoWidth;
            canvas.height = videoEl.videoHeight;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            // toDataURL throws SecurityError if the canvas is tainted by a
            // cross-origin video that didn't send CORS headers.
            return canvas.toDataURL('image/jpeg', 0.92);
        } catch (e) {
            return null;
        }
    }

    function syncVideoSrc($wrapper) {
        var fieldId = $wrapper.data('videoField');
        if (!fieldId) { return; }
        var $input = $('#' + fieldId);
        var url = ($input.val() || '').trim();
        var $video = $wrapper.find('.wpz-frame-capture__video');
        var $controls = $wrapper.find('.wpz-frame-capture__controls');
        var $hint = $wrapper.find('.wpz-frame-capture__hint');

        if (!url) {
            try { $video[0].pause(); } catch (e) {}
            $video.attr('src', '').attr('hidden', 'hidden');
            $controls.attr('hidden', 'hidden');
            $hint.attr('hidden', 'hidden');
            return;
        }

        if ($video.attr('src') !== url) {
            $video.attr('src', url);
            // Force the new source to load even if the element was hidden.
            try { $video[0].load(); } catch (e) {}
        }
        $video.removeAttr('hidden');
        $controls.removeAttr('hidden');
        $hint.removeAttr('hidden');
    }

    function captureClicked($btn) {
        var $wrapper = $btn.closest('.wpz-frame-capture');
        var videoEl = $wrapper.find('.wpz-frame-capture__video')[0];
        if (!videoEl) { return; }

        var url = videoEl.src || '';
        var t = Number(videoEl.currentTime) || 0;
        var postId = $wrapper.data('postId') || 0;

        if (!url) {
            setStatus($wrapper, i18n.noUrl || 'Set a video URL first.');
            return;
        }

        $btn.prop('disabled', true);
        setStatus($wrapper, i18n.capturing || 'Capturing…');

        var dataUrl = attemptBrowserCapture(videoEl);
        var ajaxData = {
            action: 'wpz_capture_frame',
            nonce: wpzFrameCapture.captureNonce,
            post_id: postId
        };

        if (dataUrl) {
            ajaxData.mode = 'blob';
            ajaxData.image = dataUrl;
        } else {
            ajaxData.mode = 'server';
            ajaxData.url = url;
            ajaxData.t = t;
        }

        $.post(wpzFrameCapture.ajaxUrl, ajaxData)
            .done(function (resp) {
                if (resp && resp.success && resp.data && resp.data.attachment_id) {
                    if (window.wp && wp.data && typeof wp.data.dispatch === 'function') {
                        // Update Gutenberg editor's featured image state so the
                        // sidebar reflects the new image without a reload.
                        try {
                            wp.data.dispatch('core/editor').editPost({
                                featured_media: resp.data.attachment_id
                            });
                        } catch (e) {}
                    }
                    setStatus($wrapper, i18n.success || 'Featured Image set ✓');
                } else {
                    var msg = (resp && resp.data && resp.data.message) || i18n.failed;
                    setStatus($wrapper, msg);
                }
            })
            .fail(function () {
                setStatus($wrapper, i18n.failed || 'Capture failed.');
            })
            .always(function () {
                $btn.prop('disabled', false);
            });
    }

    $(function () {
        $('.wpz-frame-capture').each(function () {
            var $wrapper = $(this);
            var fieldId = $wrapper.data('videoField');
            var $input = $('#' + fieldId);

            $input.on('input change', function () { syncVideoSrc($wrapper); });
            syncVideoSrc($wrapper);
        });

        $(document).on('click', '.wpz-frame-capture__btn', function (e) {
            e.preventDefault();
            captureClicked($(this));
        });
    });
})(jQuery);
