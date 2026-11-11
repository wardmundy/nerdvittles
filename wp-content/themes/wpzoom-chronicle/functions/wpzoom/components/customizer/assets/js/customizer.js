/**
 * @package WPZOOM Framework
 *
 * Add highlight widget outline line in Customizer Preview
 *
 * @since 1.8.5
 */

/* global jQuery, wp */
(function (wp, $) {
    'use strict';

    if ( ! wp || ! wp.customize ) { return; }

    var api = wp.customize,
        WPZOOM;


    api.bind('ready', function() {
        var iframeContents = null;

        api.previewer.bind('synced', function() {
            let iframe = $('#customize-preview iframe');
            iframeContents = iframe.contents();

            iframeContents.find('[data-customize-partial-type="widget"]').each( function(index, widget) {
                let $widget = $(widget);
                if ( !$widget.find('.widget__outline').length ) {
                    $widget.prepend('<div class="widget__outline"></div>');
                }
            });
        });

        api.previewer.bind('highlight-widget-control', function(widgetId) {
            showWidgetName(widgetId);
        });

        api.control.bind('change', function(widget) {
            let widgetIdArray = widget.selector.split('_');
            widgetIdArray.splice(0, 1);
            let widgetId = widgetIdArray.join('_');

            onControlChange(widget.selector, widgetId);
        });

        function showWidgetName(widgetId) {
            if (!iframeContents) { return }
            let $widget = iframeContents.find('[data-customize-partial-id="widget['+widgetId+']"]');
            let name = $widget.data('customize-widget-name');
            let $button = $widget.find('.customize-partial-edit-shortcut-button');

            $button.find('span').remove();
            $button.append('<span><strong>Edit</strong>: ' + name + '</span>');
            if ( !$widget.find('.widget__outline').length ) {
                $widget.prepend('<div class="widget__outline"></div>');
            }
        }

        function onControlChange(selector, widgetId) {
            // Remove any existing click handlers first to prevent duplicates
            $(selector).off('click.wpzoom-widget-scroll');
            
            $(selector).on('click.wpzoom-widget-scroll', function() {
                // Ensure iframeContents is fresh
                if (!iframeContents) {
                    let iframe = $('#customize-preview iframe');
                    iframeContents = iframe.contents();
                }
                
                let $widget = iframeContents.find('[data-customize-widget-id='+widgetId+']');
                if ($widget.length) {
                    let offset = $widget.offset();
                    if (offset && typeof offset.top !== 'undefined') {
                        let position = offset.top - 150;
                        iframeContents.find('html, body').animate({
                            'scrollTop': position
                        }, 500);
                    }
                }
            });
        }

        function customizerLicense() {

            //console.log( WPZOOM_Customizer );

            if( !WPZOOM_Customizer.is_limited || WPZOOM_Customizer.is_limited == false ) {
                return;
            }

            var sections = [ 'style-kits', 'color-palettes-container', 'header', 'font-site-body', 'font-site-title', 'description-typography', 'topmenu-typography', 'font-nav', 'slider-container', 'font-nav-mobile', 'font-slider', 'font-slider-description', 'font-slider-button', 'font-widgets-homepage', 'font-widgets-others', 'font-widgets', 'font-post-title', 'font-archive-post-content', 'font-post-sticky-title', 'font-single-post-title-image', 'font-single-post-title', 'font-single-post-content', 'font-page-title', 'font-page-title-image', 'font-portfolio-title', 'font-portfolio-title-lightbox', 'font-footer-menu', 'slider-style', 'slider-mobile', 'color', 'color-top-menu', 'color-main-menu', 'color-sidebar', 'color-slider', 'color-posts', 'color-navigation', 'color-single', 'color-portfolio', 'color-widgets', 'color-footer', 'footer-area'];

            $.each( sections, function( i, val ) {

                $('#sub-accordion-section-' + val + ' li:not(.section-meta)').empty().remove();
                $('#sub-accordion-section-' + val ).append( '<li>' + WPZOOM_Customizer.message + '</li>' );

            });

        }

        customizerLicense();

        // Typography panel group dividers (data passed via wpzoomTypoGroups)
        if ( typeof wpzoomTypoGroups !== 'undefined' && wpzoomTypoGroups.length ) {
            $.each( wpzoomTypoGroups, function( i, group ) {
                var $section = $( '#accordion-section-' + group.before );
                if ( $section.length && ! $section.prev( '.wpzoom-typo-group-title' ).length ) {
                    $section.before(
                        '<li class="wpzoom-typo-group-title"><h4>' + group.label + '</h4></li>'
                    );
                }
            });
        }

    });

    // Palette Selector Control
    api.controlConstructor['wpzoom-palette'] = api.Control.extend({
        ready() {
            const control = this;
            const $container = this.container;
            const $input = $container.find('.wpzoom-palette-input');
            const $options = $container.find('.wpzoom-palette-option');

            // Get palette data from control params (passed from PHP)
            const palettes = control.params.palettes || {};

            // Set initial selected state based on current value
            const currentValue = control.setting.get();
            if (currentValue) {
                $options.removeClass('selected');
                $container.find('.wpzoom-palette-option[data-palette="' + currentValue + '"]').addClass('selected');
            }

            // Update dependent controls visibility based on current palette value
            updateDependentControls(currentValue);

            // Handle palette selection
            $options.on('click', function () {
                const $option = $(this);
                const paletteId = $option.data('palette');

                // Update UI
                $options.removeClass('selected');
                $option.addClass('selected');

                // Update setting
                control.setting.set(paletteId);

                // Trigger change event for dependency system
                $container.trigger('change');

                // Update dependent controls visibility
                updateDependentControls(paletteId);

                // Update all theme colors from the palette
                if (palettes[paletteId] && palettes[paletteId].theme_colors) {
                    const themeColors = palettes[paletteId].theme_colors;

                    // Loop through each color setting and update it
                    $.each(themeColors, function(settingId, colorValue) {
                        if (api(settingId)) {
                            api(settingId).set(colorValue);
                        }
                    });
                }
            });

            // Update UI when setting changes externally
            control.setting.bind(function (value) {
                $options.removeClass('selected');
                $container.find('.wpzoom-palette-option[data-palette="' + value + '"]').addClass('selected');
                updateDependentControls(value);
            });

            /**
             * Show/hide controls that depend on the palette selection
             */
            function updateDependentControls(paletteValue) {
                // Controls that should only show when 'custom' palette is selected
                const customOnlyControls = ['custom-accent-color', 'custom-text-color'];

                customOnlyControls.forEach(function(controlId) {
                    const $controlContainer = $('#customize-control-' + controlId);
                    if (paletteValue === 'custom') {
                        $controlContainer.slideDown();
                    } else {
                        $controlContainer.slideUp();
                    }
                });
            }

            /**
             * Update custom palette preview colors based on accent color
             */
            function updateCustomPalettePreview(accentColor) {
                const $customPalette = $container.find('.wpzoom-palette-option[data-palette="custom"]');
                if (!$customPalette.length) return;

                const colors = generatePaletteFromAccent(accentColor);
                const $colorSpans = $customPalette.find('.wpzoom-palette-color');

                $colorSpans.eq(0).css('background-color', colors.primary).attr('title', 'primary: ' + colors.primary);
                $colorSpans.eq(1).css('background-color', colors.secondary).attr('title', 'secondary: ' + colors.secondary);
                $colorSpans.eq(2).css('background-color', colors.tertiary).attr('title', 'tertiary: ' + colors.tertiary);
                $colorSpans.eq(3).css('background-color', colors.accent).attr('title', 'accent: ' + colors.accent);
            }

            /**
             * Generate palette colors from accent (mirrors PHP logic)
             */
            function generatePaletteFromAccent(accentHex) {
                return {
                    primary: accentHex,
                    secondary: adjustBrightness(accentHex, 30),
                    tertiary: adjustBrightness(accentHex, -30),
                    accent: accentHex
                };
            }

            /**
             * Adjust color brightness (mirrors PHP logic)
             */
            function adjustBrightness(hex, percent) {
                hex = hex.replace('#', '');
                if (hex.length === 3) {
                    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                }

                let r = parseInt(hex.substring(0, 2), 16);
                let g = parseInt(hex.substring(2, 4), 16);
                let b = parseInt(hex.substring(4, 6), 16);

                r = Math.max(0, Math.min(255, r + (r * percent / 100)));
                g = Math.max(0, Math.min(255, g + (g * percent / 100)));
                b = Math.max(0, Math.min(255, b + (b * percent / 100)));

                return '#' +
                    ('0' + Math.round(r).toString(16)).slice(-2) +
                    ('0' + Math.round(g).toString(16)).slice(-2) +
                    ('0' + Math.round(b).toString(16)).slice(-2);
            }

            // Listen for accent color changes and update preview
            api('custom-accent-color', function(setting) {
                setting.bind(function(newColor) {
                    updateCustomPalettePreview(newColor);
                });
            });
        }
    });

})(wp, jQuery);