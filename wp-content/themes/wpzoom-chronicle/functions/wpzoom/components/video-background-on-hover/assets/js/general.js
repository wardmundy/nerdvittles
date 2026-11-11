jQuery(document).ready(function ($) {

    function isVimeoUrl(str) {
        var regexp = /(http|https)?:\/\/(www\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|)(\d+)(?:|\/\?)/;

        if (regexp.test(str)) {
            return true;
        }
        else {
            return false;
        }
    };

    function isYoutubeUrl(str) {
        var regexp = /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\/?\?(?:\S*?&?v\=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/g;

        if (regexp.test(str)) {
            return true;
        }
        else {
            return false;
        }
    };

    function isMp4Url(str) {
        // Match URLs whose path component ends in .mp4 (with or without query/hash).
        return /\.mp4(\?|#|$)/i.test(str);
    };

    // True when the host portion of the URL points at the local machine or a
    // private network — those addresses aren't reachable from the remote trim
    // server (clip.wp.md / giphy), so the trim will always fail. We warn the
    // user up front rather than letting them wait for a generic request-fail.
    function isUnreachableHost(str) {
        var m = str.match(/^(?:https?:)?\/\/([^\/:?#]+)/i);
        if (!m) { return false; }
        var host = m[1].toLowerCase();

        if (host === 'localhost' || host === '0.0.0.0') { return true; }
        if (/\.local$|\.localhost$|\.test$|\.example$|\.invalid$/.test(host)) { return true; }
        if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) { return true; }   // 127.0.0.0/8 loopback
        if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) { return true; }    // 10.0.0.0/8
        if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) { return true; }       // 192.168.0.0/16
        if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host)) { return true; } // 172.16.0.0/12
        if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(host)) { return true; }       // link-local

        return false;
    };

    function isUrl(str) {
        var regexp = /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;

        if (regexp.test(str)) {
            return true;
        }
        else {
            return false;
        }
    };

    var addVideoPlayer = function (src, poster) {
        var player = document.createElement('video');

        if (src) {
            player.src = src;
        }

        player.controls = true;
        player.autoplay = true;
        player.muted = true;
        player.loop = true;
        player.width = 400;
        player.height = 260;
        player.poster = poster;

        return player;
    };

    var addWarningNotice = function (msg) {
        var warningNotice = document.createElement('div');
        warningNotice.classList.add('warning-notice');
        warningNotice.innerHTML = msg;

        return warningNotice;
    };

    function getYoutubeId(url) {
        var m = url.match(/(?:youtube\.com\/(?:watch\?(?:[^&]+&)*v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/);
        return m ? m[1] : null;
    }

    function getVimeoId(url) {
        var m = url.match(/vimeo\.com\/(?:channels\/[\w]+\/|groups\/[^\/]+\/videos\/|video\/)?(\d+)/);
        return m ? m[1] : null;
    }

    var _ytApiPromise = null;
    function loadYouTubeAPI() {
        if (_ytApiPromise) { return _ytApiPromise; }
        _ytApiPromise = new Promise(function (resolve, reject) {
            if (window.YT && window.YT.Player) { resolve(window.YT); return; }
            var prev = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = function () {
                if (typeof prev === 'function') { try { prev(); } catch (e) {} }
                resolve(window.YT);
            };
            var tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            tag.onerror = reject;
            document.head.appendChild(tag);
        });
        return _ytApiPromise;
    }

    var _vimeoSdkPromise = null;
    function loadVimeoSDK() {
        if (_vimeoSdkPromise) { return _vimeoSdkPromise; }
        _vimeoSdkPromise = new Promise(function (resolve, reject) {
            if (window.Vimeo && window.Vimeo.Player) { resolve(window.Vimeo); return; }
            var tag = document.createElement('script');
            tag.src = 'https://player.vimeo.com/api/player.js';
            tag.onload = function () { resolve(window.Vimeo); };
            tag.onerror = reject;
            document.head.appendChild(tag);
        });
        return _vimeoSdkPromise;
    }

    // Builds a YouTube or Vimeo embed inside $container and returns a promise
    // resolving to a unified player adapter:
    //   { provider, seekTo(seconds), playSegment(start, duration), pause() }
    // Callers should treat the promise as best-effort — embeds are blocked by
    // some uploaders, so the fallback path (static thumbnail) must remain.
    var createEmbedPreview = function (url, $container) {
        $container.empty();
        var mountId = 'wpz-embed-' + Math.random().toString(36).slice(2, 9);
        var mount = document.createElement('div');
        mount.id = mountId;
        mount.className = 'embed-preview-frame';
        $container.append(mount);

        if (isYoutubeUrl(url)) {
            var ytId = getYoutubeId(url);
            if (!ytId) { return Promise.reject(new Error('No YouTube ID')); }
            return loadYouTubeAPI().then(function (YT) {
                return new Promise(function (resolve, reject) {
                    var resolved = false;
                    var player = new YT.Player(mountId, {
                        videoId: ytId,
                        // mute: 1 silences the player on init so the static
                        // preview frame doesn't blast audio if the user nudges
                        // the native play button.
                        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, fs: 0, mute: 1 },
                        events: {
                            onReady: function () {
                                if (resolved) { return; }
                                resolved = true;
                                try { player.mute(); } catch (e) {}
                                var stopTimer = null;
                                resolve({
                                    provider: 'youtube',
                                    seekTo: function (s) {
                                        try {
                                            player.seekTo(s, true);
                                            player.pauseVideo();
                                        } catch (e) {}
                                    },
                                    playSegment: function (start, dur) {
                                        if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
                                        try {
                                            // Re-mute in case the user toggled
                                            // sound on via the native controls.
                                            player.mute();
                                            player.seekTo(start, true);
                                            player.playVideo();
                                            stopTimer = setTimeout(function () {
                                                try { player.pauseVideo(); } catch (e) {}
                                            }, Math.max(500, dur * 1000));
                                        } catch (e) {}
                                    },
                                    pause: function () {
                                        if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
                                        try { player.pauseVideo(); } catch (e) {}
                                    }
                                });
                            },
                            onError: function () {
                                if (!resolved) { resolved = true; reject(new Error('YT player error')); }
                            }
                        }
                    });
                    // Some embedding-disabled videos never fire onReady — give up after 6s.
                    setTimeout(function () {
                        if (!resolved) { resolved = true; reject(new Error('YT player timeout')); }
                    }, 6000);
                });
            });
        }

        if (isVimeoUrl(url)) {
            var vmId = getVimeoId(url);
            if (!vmId) { return Promise.reject(new Error('No Vimeo ID')); }
            return loadVimeoSDK().then(function () {
                return new Promise(function (resolve, reject) {
                    var player = new window.Vimeo.Player(mount, {
                        id: vmId,
                        controls: true,
                        autoplay: false,
                        muted: true,
                        responsive: true
                    });
                    player.ready().then(function () {
                        // Belt + braces — Vimeo's `muted` constructor flag is
                        // sometimes ignored on first load (cookie/SDK state).
                        player.setMuted(true).catch(function () {});
                        var stopTimer = null;
                        resolve({
                            provider: 'vimeo',
                            seekTo: function (s) {
                                player.setCurrentTime(s).then(function () {
                                    return player.pause();
                                }).catch(function () {});
                            },
                            playSegment: function (start, dur) {
                                if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
                                // Re-mute in case the user unmuted via the player
                                // controls, then play synchronously to preserve
                                // the user-gesture context (chained promises
                                // break it and Vimeo refuses to autoplay).
                                player.setMuted(true).catch(function () {});
                                var playPromise = player.play();
                                player.setCurrentTime(start).catch(function () {});
                                Promise.resolve(playPromise).then(function () {
                                    stopTimer = setTimeout(function () {
                                        player.pause().catch(function () {});
                                    }, Math.max(500, dur * 1000));
                                }).catch(function () {});
                            },
                            pause: function () {
                                if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
                                player.pause().catch(function () {});
                            }
                        });
                    }).catch(reject);
                });
            });
        }

        return Promise.reject(new Error('Unsupported provider'));
    };

    var addTrackControls = function (duration, start, btnLabelText, startLabelText, durationLabelText, globalTrackDuration, thumbnailUrl, thumbnailTitle) {
        var durationControl = document.createElement('input');
        var durationLabel = document.createElement('label');
        durationLabel.innerHTML = durationLabelText;
        durationControl.setAttribute('type', 'text');
        durationControl.setAttribute('data-min', 1);
        durationControl.setAttribute('data-from', globalTrackDuration);
        durationControl.setAttribute('data-max', 15);
        durationControl.classList.add('track-control', 'duration-control');
        var startTime = document.createElement('input');
        var startTimeLabel = document.createElement('label');
        startTimeLabel.innerHTML = startLabelText;
        startTime.setAttribute('type', 'text');
        startTime.setAttribute('data-min', 0);
        startTime.setAttribute('data-from', 0);
        startTime.setAttribute('data-max', duration);

        startTime.classList.add('track-control', 'start-time-control');

        var controlsWrapper = document.createElement('div');

        var sendButton = document.createElement('button');
        sendButton.classList.add('button', 'button-primary', 'get-giphy-response');
        sendButton.innerHTML = btnLabelText;

        if (thumbnailUrl) {
            var thumbnail = document.createElement('img');
            thumbnail.classList.add('controls-thumbnail');
            thumbnail.setAttribute('src', thumbnailUrl);
            thumbnail.setAttribute('alt', thumbnailTitle);
            controlsWrapper.appendChild(thumbnail);
        }

        if (duration) {
            controlsWrapper.appendChild(startTimeLabel);
            controlsWrapper.appendChild(startTime);
        }

        controlsWrapper.appendChild(durationLabel);
        controlsWrapper.appendChild(durationControl);

        // "Remove black bars" — when checked, the clipper auto-detects and
        // crops away letterbox/pillarbox bars server-side (cropdetect) before
        // scaling. Read in the .get-giphy-response click handlers below.
        var deblackWrapper = document.createElement('label');
        deblackWrapper.classList.add('deblack-wrapper');
        var deblackCheckbox = document.createElement('input');
        deblackCheckbox.setAttribute('type', 'checkbox');
        deblackCheckbox.classList.add('deblack-control');
        var deblackText = document.createElement('span');
        deblackText.innerHTML = (typeof giphy_embed_option_type !== 'undefined'
            && giphy_embed_option_type['remove-black-bars-label'])
            || 'Remove black bars';
        deblackWrapper.appendChild(deblackCheckbox);
        deblackWrapper.appendChild(deblackText);
        controlsWrapper.appendChild(deblackWrapper);

        controlsWrapper.appendChild(sendButton);

        return controlsWrapper;

    }

    var addHtmlLinks = function (videoUrl, imageLink, text, btnLabel) {

        var wrapper = document.createElement('div');
        wrapper.classList.add('thumbnail-wrapper');
        wrapper.style.position = 'relative';
        // Stored on the wrapper so the delegated dismiss handler can read it.
        wrapper.setAttribute('data-video-url', videoUrl);
        var imgWrapper = document.createElement('div');
        imgWrapper.classList.add('image-div');
        imgWrapper.style.backgroundImage = 'url(' + imageLink + ')';
        imgWrapper.style.backgroundPosition = 'center center';
        var img = document.createElement('img');
        img.src = imageLink;
        img.classList.add('thumbnail');
        var divText = document.createElement('div');
        divText.classList.add('text-div');
        var textNode = document.createElement('div');
        textNode.innerHTML = text;

        var buttonWrapper = document.createElement('div');
        buttonWrapper.classList.add('button-div');

        var button = document.createElement('button');
        button.innerHTML = btnLabel;
        button.classList.add('button', 'button-primary');
        button.setAttribute('data-video-url', videoUrl);

        var thumbnailControlsWrapper = document.createElement('div');
        thumbnailControlsWrapper.classList.add('thumbnail-controls-wrapper');

        // Dismiss "×" — clicking it persists the URL in localStorage so the
        // suggestion doesn't reappear on subsequent loads of this post.
        var dismissBtn = document.createElement('button');
        dismissBtn.type = 'button';
        dismissBtn.classList.add('thumbnail-dismiss');
        dismissBtn.setAttribute('aria-label', 'Dismiss this suggestion');
        dismissBtn.title = "Don't suggest this video again";
        dismissBtn.innerHTML = '×'; // ×
        dismissBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:22px;height:22px;line-height:20px;padding:0;border:0;background:rgba(0,0,0,0.55);color:#fff;border-radius:50%;cursor:pointer;font-size:16px;font-weight:bold;z-index:2;text-align:center;';

        //imgWrapper.appendChild(img);
        divText.appendChild(textNode);
        buttonWrapper.appendChild(button);

        wrapper.appendChild(imgWrapper);
        thumbnailControlsWrapper.appendChild(divText);
        thumbnailControlsWrapper.appendChild(buttonWrapper);
        wrapper.appendChild(thumbnailControlsWrapper);
        wrapper.appendChild(dismissBtn);

        return wrapper;
    }

    var getSiblingsUrls = function (ignore) {
        var urls = [];
        $('.zoom-tab ').each(function (el, item) {
            var $inputs = $(item).find('input[type=text]');
            $inputs.each(function (el, input) {
                var value = $(input).val();

                if (value !== ignore && (value.indexOf('youtube') !== -1 || value.indexOf('vimeo') !== -1)) {
                    urls.push(value);
                }
            });

        });

        return _.uniq(urls);
    }

    $.fn.giphyInput = function () {
        return this.each(function () {
            var $out = giphy_embed_option_type;

            var $this = $(this);
            var $progressContainer = $this.find('.wpzoom-giphy-progressbar');
            var $giphyFileInput = $this.find('.wpzoom_video_background_giphy_file_id');
            var $giphyErrorTypeInput = $this.find('.wpzoom_video_background_giphy_error_type');
            var $giphyInput = $this.find('.wpzoom_video_background_giphy_url');
            var $done_icon = $giphyInput.closest('.preview-video-input-span').find('.dashicons-yes');
            var $error_icon = $giphyInput.closest('.preview-video-input-span').find('.dashicons-warning');
            var giphyFileId = parseInt($giphyFileInput.val());
            var $setFeaturedImageButton = $this.find('.set-featured-image');
            var $setFeaturedImageWrapper = $this.find('.set-featured-image-wrapper');
            var $thumbnail = $setFeaturedImageWrapper.find('.thumbnail');
            var $reloadBtn = $this.find('.wpzoom-giphy-reload-icon');

            var thumbnailsWrapper = $this.find('.thumbnails-wrapper');

            $setFeaturedImageButton.on('click', function (e) {
                e.preventDefault();
                wp.ajax.post('upload_thumbnail', {
                    'nonce': $out['nonce-upload-thumbnail'],
                    url: $(e.currentTarget).attr('data-thumbnail'),
                    post_id: $('#post_ID').val()
                }).done(function (response) {

                    if (response.data.attachment_id) {

                        $thumbnail.attr('src', response.data.thumbnail_id);
                        var attachment_id = response.data.attachment_id;

                        wp.ajax.post('set-post-thumbnail', {
                            post_id: $('#post_ID').val(),
                            thumbnail_id: attachment_id,
                            _ajax_nonce: $out['nonce-set-featured-image'],
                            cookie: encodeURIComponent(document.cookie)
                        }).always(function (response) {

                            if (response) {
                                wp.data.dispatch('core/editor').editPost({featured_media: attachment_id});
                                $setFeaturedImageButton.text($out['set-featured-button-disabled']);
                                $setFeaturedImageButton.prop('disabled', true);
                            }
                        });
                    }
                });
            });

            // Per-post dismissed-suggestions store, kept in localStorage so it
            // sticks across page loads without needing a server round-trip.
            var postID = $('#post_ID').val() || '0';
            var dismissedKey = 'wpz_dismissed_video_suggestions_' + postID;
            var readDismissed = function () {
                try { return JSON.parse(localStorage.getItem(dismissedKey) || '[]') || []; }
                catch (e) { return []; }
            };
            var addDismissed = function (url) {
                var arr = readDismissed();
                if (arr.indexOf(url) === -1) {
                    arr.push(url);
                    try { localStorage.setItem(dismissedKey, JSON.stringify(arr)); } catch (e) {}
                }
            };

            // Bind once via delegation so we don't re-attach on every appended widget.
            $(thumbnailsWrapper).off('click.giphySuggestion');
            $(thumbnailsWrapper).on('click.giphySuggestion', 'button.button-primary', function (e) {
                e.preventDefault();
                var videoUrl = $(this).attr('data-video-url');
                $giphyInput.val(videoUrl).trigger("input");
                $(this).closest('.thumbnail-wrapper').fadeOut(1600, "linear", function () {
                    $(this).remove();
                });
            });
            $(thumbnailsWrapper).on('click.giphySuggestion', '.thumbnail-dismiss', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var $w = $(this).closest('.thumbnail-wrapper');
                var url = $w.attr('data-video-url');
                if (url) { addDismissed(url); }
                $w.fadeOut(300, function () { $(this).remove(); });
            });

            var dismissedList = readDismissed();
            var siblingsUrls = getSiblingsUrls($giphyInput.val()).filter(function (u) {
                return dismissedList.indexOf(u) === -1;
            });

            if (siblingsUrls.length) {

                siblingsUrls.forEach(function (url) {

                    wp.ajax.post('get_thumbnail', {
                        'nonce': $out['nonce-get-thumbnail'],
                        'url': url
                    }).done(function (response) {

                        if (response.data.thumbnail) {
                            var text = '<b>' + response.data.title + '</b> ' + $out['insertTxtNode'];
                            $(thumbnailsWrapper).append(addHtmlLinks(url, response.data.thumbnail, text, $out['insertBtnLabel']));
                        }
                    });
                });

            }


            if ($progressContainer.length) {
                var bar = new ProgressBar.Line('.wpzoom-giphy-progressbar', {
                    strokeWidth: 1,
                    easing: 'easeInOut',
                    duration: 1400,
                    color: '#FFEA82',
                    trailColor: '#eee',
                    trailWidth: 1,
                    svgStyle: {width: '100%', height: '100%'},
                    from: {color: '#FFEA82'},
                    to: {color: '#46B450'},
                    step: (state, bar) => {
                        bar.path.setAttribute('stroke', state.color);
                    }
                });
            }

            if (giphyFileId) {

                $done_icon.show();
                $progressContainer.show();
                bar.animate(1.0);

            } else if ($giphyInput.val()) {

                $error_icon.show();
                $progressContainer.show();
                bar.animate(1.0, {
                    from: {color: '#FFEA82'},
                    to: {color: '#DC3232'}
                }, function(){
                    if($giphyErrorTypeInput.val()){
                        var et = $giphyErrorTypeInput.val();
                        var msg = $out['error-messages'][et] || $out['error-messages']['request-fail'];
                        $giphyInput.closest('.preview-video-input-span').after(addWarningNotice(msg));
                    }
                });

            }

            $reloadBtn.on('click', function (e) {
                e.preventDefault();
                $giphyInput.trigger('input');
            });

            $giphyInput.on('input', _.debounce(function (e) {
                e.preventDefault();


                var $target = $(e.currentTarget);
                var $preloader = $target.closest('.preview-video-input-span').find('.wpzoom-preloader');
                var $done_icon = $target.closest('.preview-video-input-span').find('.dashicons-yes');
                var $error_icon = $target.closest('.preview-video-input-span').find('.dashicons-warning');
                var $track_controls = $target.closest('.wpzoom_giphy').find('.track-controls');
                var $attachment_wrapper = $target.closest('.wpzoom_giphy').find('.wpzoom-attachment-wrapper');

                $target.closest('.wpzoom_giphy').find('.warning-notice').remove();

                $giphyErrorTypeInput.val('');

                var giphy_url = $target.val();
                var firstCallback = {
                    callback: 'get_track_duration',
                    'args': {
                        'nonce': $out['nonce-get-track-duration'],
                        'url': giphy_url
                    }
                };
                $target.prop('disabled', true);
                $done_icon.hide();
                $error_icon.hide();
                $reloadBtn.hide();
                bar.set(0);
                $progressContainer.show();

                var counter = 0;

                // Single unified callback chain. Both flows (YT/Vimeo via the WPZOOM
                // clipper, and direct MP4 via GIPHY's still-working trim endpoint)
                // produce a URL that returns the trimmed MP4 binary when GET'd, so we
                // pipe that URL straight into upload_to_media_library. The old GIPHY
                // upload_to_giphy + get_giphy_data_by_id steps are no longer needed.
                var sharedCallbackStack = [
                    {
                        'callback': 'get_trimmed_url',
                        'args': {
                            beforeSend: function () {
                                if ($preloader.length) { $preloader.show(); }
                                if ($done_icon.length) { $done_icon.hide(); }
                                if ($error_icon.length) { $error_icon.hide(); }
                            },
                            'nonce': $out['nonce-get-trimmed-url'],
                            'url': giphy_url
                        }
                    },
                    {
                        'callback': 'upload_to_media_library',
                        'args': {
                            'nonce': $out['nonce-upload-to-media-library'],
                            post_id: $('#post_ID').val()
                        }
                    }
                ];

                var legacyCallbackStack = sharedCallbackStack;
                var mp4CallbackStack = sharedCallbackStack;

                var recursiveAjax = function (counter, data, callbackStack) {

                    var current = callbackStack[counter];

                    if (!_.isEmpty(data)) {
                        current.args = _.extend(current.args, data);
                    }

                    wp.ajax.post(current.callback, current.args).done(
                        function (response) {
                            counter = counter + 1;
                            bar.animate(counter / (callbackStack.length));
                            if (counter < callbackStack.length) {

                                recursiveAjax(counter, response.data, callbackStack);

                            } else {
                                $preloader.hide();
                                $done_icon.show();
                                $reloadBtn.show();
                                $target.removeAttr('disabled');

                                if (response.data.hasOwnProperty('media_file_id')) {
                                    $giphyFileInput.val(response.data.media_file_id);


                                    $attachment_wrapper.html(addVideoPlayer(response.data.attachment_url, $out['video-poster']));

                                    $track_controls.fadeOut(800, "linear", function () {
                                        $attachment_wrapper.fadeIn(800, "linear");
                                    });

                                }
                            }

                        }
                    ).fail(
                        function (response) {
                            // wp.ajax unwraps wp_send_json_error so `response`
                            // here is the inner data array (or a string when
                            // upstream just bare-failed). Pull error_type when
                            // present so we show the right localized message.
                            var errorType = (response && response.error_type) ? response.error_type : 'request-fail';
                            var errorMsg  = $out['error-messages'][errorType]
                                || (response && response.message)
                                || $out['error-messages']['request-fail'];

                            bar.animate(1.0, {
                                from: {color: '#FFEA82'},
                                to: {color: '#DC3232'}
                            }, function () {
                                $preloader.hide();
                                $error_icon.show();
                                $reloadBtn.show();
                                $target.removeAttr('disabled');
                                $giphyFileInput.val(0);
                                $giphyErrorTypeInput.val(errorType);
                                $target.closest('.preview-video-input-span').after(addWarningNotice(errorMsg));
                            });
                        }
                    );
                };

                if (isUrl(giphy_url) && (isVimeoUrl(giphy_url) || isYoutubeUrl(giphy_url))) {

                    wp.ajax.post(firstCallback.callback, firstCallback.args).done(function (response) {

                        if (!_.isUndefined(response.fail) && response.fail) {
                            // Prefer the localized message from error-messages
                            // dict so YouTube failures don't say "Vimeo only".
                            var errorType = response.error_type || 'request-fail';
                            var errorMsg  = $out['error-messages'][errorType] || response.message || $out['error-messages']['request-fail'];

                            $progressContainer.hide();
                            $error_icon.show();
                            $target.removeAttr('disabled');
                            $reloadBtn.show();

                            $giphyFileInput.val(0);
                            $giphyErrorTypeInput.val(errorType);
                            $target.closest('.preview-video-input-span').after(addWarningNotice(errorMsg));
                            return;
                        }

                        var thumbnail = _.isUndefined(response.data.thumbnail.url) ? '' : response.data.thumbnail.url;
                        var title = _.isUndefined(response.data.thumbnail.title) ? '' : response.data.thumbnail.title;

                        // Re-enable the URL field so the user can swap in a
                        // different video at this step without having to first
                        // submit or reload. Mirrors the MP4 branch.
                        $progressContainer.hide();
                        $target.removeAttr('disabled');
                        $reloadBtn.show();

                        // Pass empty thumbnail args — we'll inject either a live embed
                        // (preferred) or fall back to the static thumbnail ourselves.
                        $($track_controls).html(addTrackControls(parseInt(response.data.duration), 1, $out['generate-video-label'], $out['generate-start-time-label'], $out['generate-duration-label'], $out['global-track-duration'], '', ''));

                        // Live preview slot — prepended above the sliders so the
                        // user sees what they're cropping in real time.
                        var $previewWrap = $('<div class="embed-preview-wrapper" />');
                        $($track_controls).prepend($previewWrap);

                        // "Preview clip" button — plays start → start+duration then
                        // auto-pauses. Cheaper than auto-scrubbing on every drag.
                        var previewBtnLabel = $out['preview-clip-label'] || 'Preview clip';
                        var $previewBtn = $('<button type="button" class="button preview-clip-btn"><span class="dashicons dashicons-controls-play"></span> ' + previewBtnLabel + '</button>');
                        $previewBtn.prop('disabled', true);

                        var embedPlayer = null;
                        createEmbedPreview(giphy_url, $previewWrap).then(function (player) {
                            embedPlayer = player;
                            $previewBtn.prop('disabled', false);
                        }).catch(function () {
                            // Embed failed (blocked, restricted, etc.) — fall back
                            // to the static thumbnail so the user still has visual
                            // context for the clip they're trimming.
                            $previewBtn.remove();
                            if (thumbnail) {
                                $previewWrap.html('<img class="controls-thumbnail" src="' + thumbnail + '" alt="' + title + '" />');
                            } else {
                                $previewWrap.remove();
                            }
                        });

                        $attachment_wrapper.fadeOut(800, "linear", function () {
                            $track_controls.fadeIn(800, "linear");
                        });

                        $($track_controls).find('.track-control').ionRangeSlider({
                            skin: "round",
                            prettify: function (seconds) {
                                return moment.duration(seconds, 'seconds').format("mm:ss", {trim: false});
                            },
                            onChange: function (data) {
                                if (!embedPlayer) { return; }
                                var $input = $(data.input);
                                if ($input.hasClass('start-time-control')) {
                                    embedPlayer.seekTo(data.from);
                                } else if ($input.hasClass('duration-control')) {
                                    var startVal = parseFloat($track_controls.find('.start-time-control').val()) || 0;
                                    embedPlayer.seekTo(startVal);
                                }
                            }
                        });

                        $($track_controls).find('.get-giphy-response').before($previewBtn);

                        $previewBtn.on('click', function (e) {
                            e.preventDefault();
                            if (!embedPlayer) { return; }
                            var startAt = parseFloat($track_controls.find('.start-time-control').val()) || 0;
                            var dur = parseFloat($track_controls.find('.duration-control').val()) || 5;
                            embedPlayer.playSegment(startAt, dur);
                        });

                        $($track_controls).find('.get-giphy-response').on('click', function (e) {
                            e.preventDefault();

                            if (embedPlayer) { embedPlayer.pause(); }

                            var startAt = $track_controls.find('.start-time-control').val();
                            var duration = $track_controls.find('.duration-control').val();
                            var deblack = $track_controls.find('.deblack-control').is(':checked') ? 1 : 0;

                            $(e.currentTarget).prop('disabled', true);

                            recursiveAjax(counter, {duration: duration, start: startAt, deblack: deblack}, legacyCallbackStack);

                        });

                    });


                } else if (isUrl(giphy_url) && isMp4Url(giphy_url)) {

                    // MP4 branch: skip the broken get_track_duration call. Read duration
                    // locally via an HTML5 <video> element, then run the shortened
                    // mp4CallbackStack (get_trimmed_url -> upload_to_media_library).

                    // Local probe works for localhost URLs (the browser can reach
                    // your dev site), but the remote trim API cannot — warn now
                    // so the user knows the eventual Insert will fail.
                    if (isUnreachableHost(giphy_url)) {
                        $target.closest('.preview-video-input-span').after(
                            addWarningNotice($out['error-messages']['unreachable-host'])
                        );
                    }

                    var probeVideo = document.createElement('video');
                    probeVideo.preload = 'metadata';
                    probeVideo.muted = true;
                    // Do NOT set crossOrigin — we only need to read duration metadata,
                    // which browsers allow on cross-origin videos. Setting crossOrigin
                    // would force a preflight and fail on hosts without CORS headers.

                    var probeFailed = false;

                    var onProbeError = function () {
                        if (probeFailed) { return; }
                        probeFailed = true;
                        bar.animate(1.0, {
                            from: {color: '#FFEA82'},
                            to: {color: '#DC3232'}
                        }, function () {
                            $target.closest('.preview-video-input-span').after(
                                addWarningNotice('Could not load this MP4. Check the URL and that the host allows cross-origin video access.')
                            );
                        });
                        $done_icon.hide();
                        $reloadBtn.show();
                        $preloader.hide();
                        $giphyFileInput.val(0);
                        $giphyErrorTypeInput.val('invalid-url');
                        $error_icon.show();
                        $target.removeAttr('disabled');
                    };

                    probeVideo.addEventListener('loadedmetadata', function () {
                        if (probeFailed) { return; }

                        var fullDuration = Math.max(1, Math.floor(probeVideo.duration || 0));

                        $progressContainer.hide();
                        $target.removeAttr('disabled');

                        $($track_controls).html(addTrackControls(
                            fullDuration,
                            1,
                            $out['generate-video-label'],
                            $out['generate-start-time-label'],
                            $out['generate-duration-label'],
                            $out['global-track-duration'],
                            '',
                            ''
                        ));

                        // Prepend a live preview <video> so the user sees what they're cropping.
                        var $previewVideo = $('<video />')
                            .addClass('mp4-preview-video')
                            .attr({
                                src: giphy_url,
                                controls: true,
                                muted: true,
                                preload: 'metadata',
                                playsinline: ''
                            })
                            .css({
                                'display': 'block',
                                'max-width': '100%',
                                'width': '400px',
                                'margin-bottom': '12px',
                                'background': '#000'
                            });
                        // Canonical mute — the jQuery `muted` attr alone isn't
                        // always reliable across browsers.
                        $previewVideo[0].muted = true;
                        $($track_controls).prepend($previewVideo);

                        $attachment_wrapper.fadeOut(800, "linear", function () {
                            $track_controls.fadeIn(800, "linear");
                        });

                        $($track_controls).find('.track-control').ionRangeSlider({
                            skin: "round",
                            prettify: function (seconds) {
                                return moment.duration(seconds, 'seconds').format("mm:ss", {trim: false});
                            },
                            onChange: function (data) {
                                if (!$previewVideo || !$previewVideo[0]) { return; }
                                var $input = $(data.input);
                                if ($input.hasClass('start-time-control')) {
                                    // Scrub preview to the new start time.
                                    try { $previewVideo[0].currentTime = data.from; } catch (e) {}
                                } else if ($input.hasClass('duration-control')) {
                                    // Jump to current start so the user can see the segment.
                                    var startVal = parseFloat($track_controls.find('.start-time-control').val()) || 0;
                                    try { $previewVideo[0].currentTime = startVal; } catch (e) {}
                                }
                            }
                        });

                        // "Preview clip" — mirrors the YT/Vimeo flow. Plays
                        // start → start+duration muted, then auto-pauses.
                        var mp4PreviewBtnLabel = $out['preview-clip-label'] || 'Preview clip';
                        var $mp4PreviewBtn = $('<button type="button" class="button preview-clip-btn"><span class="dashicons dashicons-controls-play"></span> ' + mp4PreviewBtnLabel + '</button>');
                        var mp4PreviewStopTimer = null;
                        $($track_controls).find('.get-giphy-response').before($mp4PreviewBtn);

                        $mp4PreviewBtn.on('click', function (e) {
                            e.preventDefault();
                            if (!$previewVideo[0]) { return; }
                            if (mp4PreviewStopTimer) { clearTimeout(mp4PreviewStopTimer); mp4PreviewStopTimer = null; }
                            var startAt = parseFloat($track_controls.find('.start-time-control').val()) || 0;
                            var dur = parseFloat($track_controls.find('.duration-control').val()) || 5;
                            try {
                                $previewVideo[0].muted = true;
                                $previewVideo[0].currentTime = startAt;
                                var p = $previewVideo[0].play();
                                if (p && typeof p.catch === 'function') { p.catch(function () {}); }
                                mp4PreviewStopTimer = setTimeout(function () {
                                    try { $previewVideo[0].pause(); } catch (e) {}
                                }, Math.max(500, dur * 1000));
                            } catch (e) {}
                        });

                        $($track_controls).find('.get-giphy-response').on('click', function (e) {
                            e.preventDefault();

                            if (mp4PreviewStopTimer) { clearTimeout(mp4PreviewStopTimer); mp4PreviewStopTimer = null; }
                            try { $previewVideo[0].pause(); } catch (e) {}

                            var startAt = $track_controls.find('.start-time-control').val();
                            var duration = $track_controls.find('.duration-control').val();
                            var deblack = $track_controls.find('.deblack-control').is(':checked') ? 1 : 0;

                            $(e.currentTarget).prop('disabled', true);

                            recursiveAjax(counter, {duration: duration, start: startAt, deblack: deblack}, mp4CallbackStack);
                        });
                    });

                    probeVideo.addEventListener('error', onProbeError);
                    probeVideo.src = giphy_url;

                    // Timeout in case loadedmetadata never fires (slow host, etc.).
                    setTimeout(function () {
                        if (!probeVideo.duration) { onProbeError(); }
                    }, 15000);

                } else if (giphy_url) {
                    bar.animate(1.0, {
                        from: {color: '#FFEA82'},
                        to: {color: '#DC3232'}
                    }, function () {
                        $target.closest('.preview-video-input-span').after(addWarningNotice($out['error-messages']['invalid-url']));
                    });
                    $done_icon.hide();
                    $reloadBtn.show();
                    $preloader.hide();
                    $giphyFileInput.val(0);
                    $giphyErrorTypeInput.val('invalid-url');
                    $error_icon.show();
                    $target.removeAttr('disabled');
                } else {
                    // URL field is empty — reset everything so the preview
                    // doesn't keep showing a stale clip from a previous URL.
                    $done_icon.hide();
                    $preloader.hide();
                    $error_icon.hide();
                    $progressContainer.hide();
                    $target.removeAttr('disabled');

                    $giphyFileInput.val(0);
                    $giphyErrorTypeInput.val('');

                    // Stop and clear the saved video preview so the next save
                    // commits an empty file_id and the metabox renders blank.
                    var $oldVideo = $attachment_wrapper.find('video');
                    if ($oldVideo.length) {
                        try { $oldVideo[0].pause(); } catch (e) {}
                        $oldVideo.removeAttr('src').empty();
                        try { $oldVideo[0].load(); } catch (e) {}
                    }
                    $attachment_wrapper.hide();
                    $track_controls.empty().hide();
                    $this.find('.warning-notice').remove();
                }

            }, 700));
        });
    };

    $.fn.mediaControl = function () {

        this.each(function () {
            var $this = $(this);
            var $wasCalled = $this.find('a.wpz-upload-video-control');

            var mediaControl = {
                // Initializes a new media manager or returns an existing frame.
                // @see wp.media.featuredImage.frame()
                frame: function () {
                    if (this._frame)
                        return this._frame;

                    this._frame = wp.media({
                        title: $this.data('title'),
                        library: {
                            type: 'video'
                        },
                        button: {
                            text: $this.data('button')
                        },
                        multiple: false
                    });

                    this._frame.on('open', this.updateFrame).state('library').on('select', this.select);

                    return this._frame;
                },

                select: function () {
                    var selection = this.get('selection'),
                        returnProperty = 'url';

                    var source = selection.pluck(returnProperty)[0];
                    var ext = ( source.lastIndexOf('?') > 0 ) ? source.substring(source.lastIndexOf('.') + 1, source.lastIndexOf('?')) : source.substring(source.lastIndexOf('.') + 1);

                    if (ext == 'mp4' || ext == 'webm') {
                        $($this.data('target') + "_" + ext).focus().val(source).change();
                    } else {
                        alert('Unsupported file extension: ' + ext);
                    }
                },

                updateFrame: function () {
                    // Do something when the media frame is opened.
                },

                init: function () {
                    $this.find('a.add_media').on('click', function (e) {
                        e.preventDefault();
                        mediaControl.frame().open();
                    });
                }
            };

            if ($wasCalled.length == 0) {
                mediaControl.init();
            }

        });
    };

    // Mounts the "Crop & Optimize Video" widget on the MP4 (self_hosted) panel.
    // The trim pipeline is the same one the giphy panel uses for MP4 URLs:
    // probe duration locally → get_trimmed_url → upload_to_media_library. The
    // result is stored in the .wpzoom-mp4-trimmed-url / .wpzoom-mp4-trimmed-id
    // hidden inputs (not in the main MP4 URL field — the original is kept so
    // existing posts/users aren't affected and Frame Capture keeps reading
    // from the larger source).
    $.fn.mp4TrimWidget = function () {
        return this.each(function () {
            var $widget   = $(this);
            var $out      = giphy_embed_option_type;
            var $toggle   = $widget.find('.wpzoom-mp4-trim-toggle-input');
            var $body     = $widget.find('.wpzoom-mp4-trim-body');
            var $controls = $widget.find('.wpzoom-mp4-trim-controls');
            var $result   = $widget.find('.wpzoom-mp4-trim-result');
            var $progress = $widget.find('.wpzoom-mp4-trim-progressbar');
            var $hiddenUrl = $widget.find('.wpzoom-mp4-trimmed-url');
            var $hiddenId  = $widget.find('.wpzoom-mp4-trimmed-id');
            var postId    = parseInt($widget.attr('data-post-id'), 10) || 0;

            // The MP4 URL field lives in the same .wpzoom_self_hosted panel,
            // above this widget. Look up by class to avoid hardcoding the prefix.
            var $mp4Url = $widget.closest('.wpzoom_self_hosted').find('input[id$="video_background_mp4"]');

            var bar = null;
            if ($progress.length) {
                bar = new ProgressBar.Line($progress.get(0), {
                    strokeWidth: 1,
                    easing: 'easeInOut',
                    duration: 1400,
                    color: '#FFEA82',
                    trailColor: '#eee',
                    trailWidth: 1,
                    svgStyle: { width: '100%', height: '3px' },
                    from: { color: '#FFEA82' },
                    to: { color: '#46B450' }
                });
            }

            var clearResult = function () {
                $result.empty();
                $hiddenUrl.val('');
                $hiddenId.val('');
            };

            var renderResult = function (url) {
                $result.html(
                    '<p class="description">' + ($out['mp4-trim-saved-label'] || 'Optimized clip saved:') + '</p>' +
                    '<video class="wpzoom-mp4-trim-preview" src="' + url + '" width="400" height="225" controls muted loop playsinline></video>' +
                    '<p><a href="#" class="wpzoom-mp4-trim-remove">' + ($out['mp4-trim-remove-label'] || 'Remove optimized clip') + '</a></p>'
                );
            };

            var buildTrimUI = function (mp4Url) {
                $controls.empty();
                $widget.find('.warning-notice').remove();

                if (!mp4Url) {
                    $controls.append(addWarningNotice($out['error-messages']['invalid-url']));
                    return;
                }

                // Heads-up before the round-trip: the remote trim server can't
                // fetch from localhost / private networks. We still build the UI
                // so the user can experiment with the sliders, but they're
                // warned that Insert will fail until they use a public URL.
                if (isUnreachableHost(mp4Url)) {
                    $controls.append(addWarningNotice($out['error-messages']['unreachable-host']));
                }

                // Local probe for duration — same approach as the giphy panel's MP4 branch.
                var probeVideo = document.createElement('video');
                probeVideo.preload = 'metadata';
                probeVideo.muted = true;

                var probeFailed = false;
                var onProbeError = function () {
                    if (probeFailed) { return; }
                    probeFailed = true;
                    $controls.append(addWarningNotice(
                        'Could not load this MP4. Check the URL and that the host allows cross-origin video access.'
                    ));
                };

                probeVideo.addEventListener('loadedmetadata', function () {
                    if (probeFailed) { return; }

                    var fullDuration = Math.max(1, Math.floor(probeVideo.duration || 0));

                    $controls.html(addTrackControls(
                        fullDuration,
                        1,
                        $out['generate-video-label'],
                        $out['generate-start-time-label'],
                        $out['generate-duration-label'],
                        $out['global-track-duration'] || 5,
                        '',
                        ''
                    ));

                    var $previewVideo = $('<video />')
                        .addClass('mp4-preview-video')
                        .attr({
                            src: mp4Url,
                            controls: true,
                            muted: true,
                            preload: 'metadata',
                            playsinline: ''
                        })
                        .css({
                            display: 'block',
                            maxWidth: '100%',
                            width: '400px',
                            marginBottom: '12px',
                            background: '#000'
                        });
                    // Belt + braces: the `muted` attribute set via jQuery is
                    // sometimes not enough to keep autoplay-restriction-free
                    // playback. Setting the DOM property explicitly is the
                    // canonical way.
                    $previewVideo[0].muted = true;
                    $controls.prepend($previewVideo);

                    // "Preview clip" — plays start → start+duration and auto-pauses.
                    var previewBtnLabel = $out['preview-clip-label'] || 'Preview clip';
                    var $previewBtn = $('<button type="button" class="button preview-clip-btn"><span class="dashicons dashicons-controls-play"></span> ' + previewBtnLabel + '</button>');
                    var previewStopTimer = null;
                    $controls.find('.get-giphy-response').before($previewBtn);

                    $previewBtn.on('click', function (e) {
                        e.preventDefault();
                        if (!$previewVideo[0]) { return; }
                        if (previewStopTimer) { clearTimeout(previewStopTimer); previewStopTimer = null; }
                        var startAt = parseFloat($controls.find('.start-time-control').val()) || 0;
                        var dur = parseFloat($controls.find('.duration-control').val()) || 5;
                        try {
                            // Force mute on every Preview click so the clip
                            // never plays audio, even if the user unmuted via
                            // the native <video> controls.
                            $previewVideo[0].muted = true;
                            $previewVideo[0].currentTime = startAt;
                            var p = $previewVideo[0].play();
                            if (p && typeof p.catch === 'function') { p.catch(function () {}); }
                            previewStopTimer = setTimeout(function () {
                                try { $previewVideo[0].pause(); } catch (e) {}
                            }, Math.max(500, dur * 1000));
                        } catch (e) {}
                    });

                    $controls.find('.track-control').ionRangeSlider({
                        skin: 'round',
                        prettify: function (seconds) {
                            return moment.duration(seconds, 'seconds').format('mm:ss', { trim: false });
                        },
                        onChange: function (data) {
                            if (!$previewVideo[0]) { return; }
                            var $input = $(data.input);
                            if ($input.hasClass('start-time-control')) {
                                try { $previewVideo[0].currentTime = data.from; } catch (e) {}
                            } else if ($input.hasClass('duration-control')) {
                                var startVal = parseFloat($controls.find('.start-time-control').val()) || 0;
                                try { $previewVideo[0].currentTime = startVal; } catch (e) {}
                            }
                        }
                    });

                    $controls.find('.get-giphy-response').on('click', function (e) {
                        e.preventDefault();

                        var $btn = $(e.currentTarget);
                        $btn.prop('disabled', true);
                        try { $previewVideo[0].pause(); } catch (e) {}
                        if (previewStopTimer) { clearTimeout(previewStopTimer); previewStopTimer = null; }

                        var startAt = $controls.find('.start-time-control').val();
                        var duration = $controls.find('.duration-control').val();

                        if (bar) { bar.set(0); }

                        // Reuse the giphy AJAX endpoints — they accept MP4 URLs
                        // and route to the GIPHY-side trim endpoint server-side.
                        // wp.ajax unwraps the outer wp_send_json_success envelope
                        // and resolves with the data argument, which itself nests
                        // the real payload under a `data` key (matches the shape
                        // the existing recursiveAjax helper reads).
                        wp.ajax.post('get_trimmed_url', {
                            nonce:    $out['nonce-get-trimmed-url'],
                            url:      mp4Url,
                            start:    startAt,
                            duration: duration
                        }).done(function (trimResp) {
                            if (bar) { bar.animate(0.5); }
                            var trimmedUrl = trimResp && trimResp.data && trimResp.data.url;
                            wp.ajax.post('upload_to_media_library', {
                                nonce:   $out['nonce-upload-to-media-library'],
                                url:     trimmedUrl,
                                post_id: postId
                            }).done(function (uploadResp) {
                                if (bar) { bar.animate(1.0); }
                                var attachmentUrl = uploadResp && uploadResp.data && uploadResp.data.attachment_url;
                                var mediaFileId   = uploadResp && uploadResp.data && uploadResp.data.media_file_id;
                                $hiddenUrl.val(attachmentUrl);
                                $hiddenId.val(mediaFileId);
                                renderResult(attachmentUrl);
                                $controls.empty();
                            }).fail(function (resp) {
                                var msg = (resp && resp.message) || $out['error-messages']['request-fail'];
                                $controls.append(addWarningNotice(msg));
                                $btn.prop('disabled', false);
                            });
                        }).fail(function (resp) {
                            var errorType = (resp && resp.error_type) ? resp.error_type : 'request-fail';
                            var msg = $out['error-messages'][errorType] || (resp && resp.message) || $out['error-messages']['request-fail'];
                            $controls.append(addWarningNotice(msg));
                            $btn.prop('disabled', false);
                        });
                    });
                });

                probeVideo.addEventListener('error', onProbeError);
                probeVideo.src = mp4Url;

                setTimeout(function () {
                    if (!probeVideo.duration) { onProbeError(); }
                }, 15000);
            };

            $toggle.on('change', function () {
                if ($toggle.is(':checked')) {
                    $body.show();
                    // If a trimmed result is already on file, leave the preview
                    // visible. Otherwise build the trim UI from the current URL.
                    if (!$hiddenUrl.val()) {
                        buildTrimUI(($mp4Url.val() || '').trim());
                    }
                } else {
                    $body.hide();
                }
            });

            // Remove the saved trimmed clip (clears the hidden inputs; rebuild
            // the trim UI so the user can produce a new one without unchecking
            // and rechecking the toggle).
            $widget.on('click', '.wpzoom-mp4-trim-remove', function (e) {
                e.preventDefault();
                clearResult();
                if ($toggle.is(':checked')) {
                    buildTrimUI(($mp4Url.val() || '').trim());
                }
            });

            // When the source URL changes, any previously-saved trim is stale
            // (different source). Clear it so the saved frontend output doesn't
            // reference a clip from a different video. Debounced to avoid
            // clearing while the user is mid-edit on a still-valid URL.
            $mp4Url.on('input', _.debounce(function () {
                if (!$hiddenUrl.val()) { return; }
                // Only clear if the saved trim was derived from a different URL.
                // We don't track that explicitly, so be conservative: clear on
                // any change to the URL field.
                clearResult();
                if ($toggle.is(':checked')) {
                    buildTrimUI(($mp4Url.val() || '').trim());
                }
            }, 700));
        });
    };

    $('.wpzoom_giphy').giphyInput();
    $('.wp-media-buttons').mediaControl();
    $('.wpzoom-mp4-trim').mp4TrimWidget();

});