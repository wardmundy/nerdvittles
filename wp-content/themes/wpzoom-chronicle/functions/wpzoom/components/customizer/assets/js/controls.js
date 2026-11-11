/**
 * @package WPZOOM Framework
 */

/* global jQuery, wp */
(function (wp, $, WPZOOM_Controls) {
    'use strict';

    if ( ! wp || ! wp.customize || ! WPZOOM_Controls ) { return; }

    var api = wp.customize,
        WPZOOM;

    Object.size = function(obj) {
        var size = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) size++;
        }
        return size;
    };

    // Setup
    WPZOOM = $.extend(WPZOOM_Controls, {
        cache: {
            $document: $(document),
            list_controls: api.control._value,
            control_elements: {},
            cloud: {},
            deps_is_ready: false,
            frag: false
        },
        __construct: function() {
            var self = this;

            self.setDependencies();
            self.checkDependency();
            self.initFont();
            self.fontResetOption();
            self.initRPM();
            self.initRSH();
            self.initCustomizerResetPlaceholder();
        },
        initCustomizerResetPlaceholder: function() {
            var self = this,
                plugin = self.customizerResetPlugin || {},
                l10n = self.l10n || {},
                $container = $('#customize-header-actions');

            if ( ! $container.length || plugin.isActive || $container.find('.zoom-reset-settings').length || $container.find('.wpzoom-customizer-reset-placeholder').length ) {
                return;
            }

            var buttonClasses = 'wpzoom-customizer-reset-placeholder',
                buttonContents = l10n.reset_button || 'Reset';

            if ( ! plugin.isInstalled ) {
                buttonClasses += ' wpzoom-customizer-reset-placeholder-link';
            }

            var $button = $('<button type="button">')
                .addClass(buttonClasses)
                .attr({
                    'aria-label': l10n.reset_tooltip || 'Reset',
                    'title': l10n.reset_tooltip || 'Reset'
                })
                .html(buttonContents);

            $container.append($button);

            $button.on('click', function(e) {
                e.preventDefault();
                self.openCustomizerResetPlaceholderModal();
            });
        },
        openCustomizerResetPlaceholderModal: function() {
            var self = this,
                plugin = self.customizerResetPlugin || {},
                l10n = self.l10n || {};

            var closeModal = function() {
                $('.wpzoom-customizer-reset-modal-overlay').remove();
                $(document).off('keydown.wpzoomCustomizerResetModal');
            };

            $('.wpzoom-customizer-reset-modal-overlay').remove();
            $(document).off('keydown.wpzoomCustomizerResetModal');

            var detailText = plugin.isInstalled && plugin.canActivate ? l10n.reset_plugin_modal_active : l10n.reset_plugin_modal_install;
            var primaryLabel = l10n.reset_plugin_learn_more;

            if ( plugin.isInstalled && plugin.canActivate ) {
                primaryLabel = l10n.reset_plugin_activate;
            } else if ( ! plugin.isInstalled && plugin.canInstall ) {
                primaryLabel = l10n.reset_plugin_install;
            }

            var $overlay = $('<div class="wpzoom-customizer-reset-modal-overlay" />');
            var $modal = $('<div class="wpzoom-customizer-reset-modal" role="dialog" aria-modal="true" aria-labelledby="wpzoom-customizer-reset-modal-title" />');
            var $content = $('<div class="wpzoom-customizer-reset-modal-content" />');
            var $title = $('<h3 id="wpzoom-customizer-reset-modal-title" />').text(l10n.reset_plugin_modal_title || 'Reset Customizer Settings');
            var $intro = $('<p class="wpzoom-customizer-reset-modal-intro" />').text(l10n.reset_plugin_modal_text || '');
            var $detail = $('<p class="wpzoom-customizer-reset-modal-detail" />').text(detailText || '');
            var $actions = $('<div class="wpzoom-customizer-reset-modal-actions" />');
            var $primary = $('<button type="button" class="button button-primary wpzoom-customizer-reset-modal-primary" />').text(primaryLabel || 'Learn More');
            var $secondary = $('<button type="button" class="button button-secondary wpzoom-customizer-reset-modal-close" />').text(l10n.reset_plugin_close || 'Close');

            $actions.append($primary, $secondary);
            $content.append($title, $intro, $detail, $actions);
            $modal.append($content);
            $overlay.append($modal);
            $('body').append($overlay);

            $secondary.on('click', function(e) {
                e.preventDefault();
                closeModal();
            });

            $overlay.on('click', function(e) {
                if ( $(e.target).is('.wpzoom-customizer-reset-modal-overlay') ) {
                    closeModal();
                }
            });

            $(document).on('keydown.wpzoomCustomizerResetModal', function(e) {
                if ( e.key === 'Escape' ) {
                    closeModal();
                }
            });

            $primary.on('click', function(e) {
                e.preventDefault();

                if ( plugin.isInstalled && plugin.canActivate ) {
                    self.activateCustomizerResetPlugin($(this), $overlay);
                    return;
                }

                if ( ! plugin.isInstalled && plugin.canInstall ) {
                    self.installCustomizerResetPlugin($(this), $overlay);
                    return;
                }

                window.open(plugin.pluginUrl, '_blank', 'noopener');
            });
        },
        installCustomizerResetPlugin: function($button, $overlay) {
            var self = this,
                plugin = self.customizerResetPlugin || {},
                l10n = self.l10n || {};

            $button.prop('disabled', true).text(l10n.reset_plugin_installing || 'Installing plugin…');

            $.post(self.ajaxurl, {
                action: 'wpzoom_install_plugin',
                slug: plugin.pluginSlug,
                pluginData: JSON.stringify({
                    file_path: plugin.pluginFile
                })
            }).done(function(response) {
                if ( response && response.success ) {
                    window.location.reload();
                    return;
                }

                window.alert((response && response.data && response.data.message) || (response && response.data) || l10n.reset_plugin_install_error || 'Could not install the plugin.');
                $button.prop('disabled', false).text(l10n.reset_plugin_install || 'Install Plugin');
            }).fail(function(xhr) {
                var message = l10n.reset_plugin_install_error || 'Could not install the plugin.';

                if ( xhr && xhr.responseJSON && xhr.responseJSON.data && xhr.responseJSON.data.message ) {
                    message = xhr.responseJSON.data.message;
                }

                window.alert(message);
                $button.prop('disabled', false).text(l10n.reset_plugin_install || 'Install Plugin');
            });
        },
        activateCustomizerResetPlugin: function($button, $overlay) {
            var self = this,
                plugin = self.customizerResetPlugin || {},
                l10n = self.l10n || {};

            $button.prop('disabled', true).text(l10n.reset_plugin_activating || 'Activating plugin…');

            $.post(self.ajaxurl, {
                action: 'wpzoom_activate_customizer_reset_plugin',
                nonce: plugin.activateNonce
            }).done(function(response) {
                if ( response && response.success ) {
                    window.location.reload();
                    return;
                }

                window.alert((response && response.data) || l10n.reset_plugin_activate_error || 'Could not activate the plugin.');
                $button.prop('disabled', false).text(l10n.reset_plugin_activate || 'Activate Plugin');
            }).fail(function() {
                window.alert(l10n.reset_plugin_activate_error || 'Could not activate the plugin.');
                $button.prop('disabled', false).text(l10n.reset_plugin_activate || 'Activate Plugin');
            });
        },
        convertToType: function(value, type) {
            switch (type) {
                case 'number':
                    value = Number(value);
                    break;

                case 'string':
                    value = String(value);
                    break;

                case 'boolean':
                    value = Boolean(value);
                    break;
            }

            return value;
        },
        prepareItems: function(data, callback) {
            var self = this;

            var frag = document.createDocumentFragment();

            _.each(data, function (item, key) {

                _.each(item, function (text, val) {

                    var $option = new Option( text, val );

                    if ( val === 'label' ) {
                        $option = document.createElement('option');
                        $option.setAttribute( 'value', val + '-' + key );
                        $option.setAttribute( 'disabled', 'disabled' );
                        $option.textContent = text;
                    }

                    if ( val !== 'label' ) {
                        var font_families_with_preview = WPZOOM.font_families_with_preview;
                        $option.title = text;

                        if ( typeof font_families_with_preview[ text ] !== 'undefined' ) {
                            $option.classList.add('font-has-preview');
                        }
                    }

                    frag.appendChild($option);
                });

                self.cache.frag = true;
            });

            callback(frag);
        },
        checkDependency: function( event ) {
            event = event || 'ready';

            var self = this,
                list = self.cache.list_controls,
                list_dep = self.cache.list_dependencies,
                elements = self.cache.control_elements,
                controlID;

            var doCheck = function( event ) {
                var check = [];

                // Each all registered controls
                _.each(list, function(control){

                    var dependencies = {}, node = $(control.selector), element;

                    // Set control id
                    controlID = control.id;

                    // on document ready
                    if ( event == 'ready' && typeof list_dep[ controlID ] !== 'undefined' ) {
                        dependencies = list_dep[ controlID ]; // list of dependencies of this item
                    }

                    // on document change
                    if ( event == 'change' && typeof control.params.dependency != 'undefined' ) {
                        dependencies = control.params.dependency;
                    }

                    // Get the size of an object
                    var size = Object.size(dependencies);

                    // We have dependencies
                    if ( size ) {

                        check[ controlID ] = [];

                        // Link Elements
                        if ( typeof elements[ control.id ] == 'undefined' ) {
                            elements[ control.id ] = control;
                        }

                        // Each all dependencies to check if control satisfy all conditions or not
                        _.each(dependencies, function(val, id){

                            var control      = list[ id ], // dependency control
                                value        = control.setting.get(), // value of dependency control
                                value_type   = typeof value,
                                control_type = control.params.type,
                                node         = $(control.selector),
                                helper       = [];

                            if ( value == '' ) value = '0';

                            helper[ controlID ] = [];

                            // Link Elements
                            if ( typeof elements[ control.id ] == 'undefined' ) {
                                elements[ control.id ] = control;
                            }

                            // Check for multiple values
                            if ( _.isArray( val ) ) {
                                _.each(val, function(_val) {
                                    _val = WPZOOM.convertToType( _val, value_type );

                                    helper[ controlID ].push(value == _val);
                                });
                            } else {
                                val = WPZOOM.convertToType( val, value_type );

                                helper[ controlID ].push(value == val);
                            }

                            if ( _.contains( helper[ controlID ], true ) ) {
                                check[ controlID ].push(true);
                            } else {
                                check[ controlID ].push(false);
                            }

                        });

                    }

                    // Skip controls that has no dependency
                    if ( typeof check[ controlID ] == 'undefined' ) return;

                    // If control satisfy all conditions it remains visible
                    // else hide control until all conditions will be true
                    if ( _.contains(check[ controlID ], true) && ! _.contains(check[ controlID ], false) ) {
                        $('#customize-control-' + controlID).slideDown();
                    } else {
                        $('#customize-control-' + controlID).slideUp();
                    }

                });
            }

            // Check dependencies
            doCheck( event );

            // on Change event

            _.each(elements, function(control){
                var element = $(control.selector);

                if ( control.params.type == 'zoom_checkbox' && control.params.value == '0' ) {
                    element.find('input[type="checkbox"]').prop('checked', false);
                }

                // Update customizer controls visibility
                element.bind('change', function(e) {
                    doCheck(e.type);
                });
            });
        },
        setDependencies: function() {
            var self = this,
                list = self.cache.list_controls,
                dependencies = {};

            if ( self.cache.deps_is_ready ) return;

            _.each(list, function(control) {
                if ( typeof control.params.dependency != 'undefined' ) {
                    var id = control.id,
                        dependency = control.params.dependency;

                    if ( dependency ) {
                        dependencies[ id ] = dependency;
                    };
                }
            });

            self.cache.deps_is_ready = true;
            self.cache.list_dependencies = dependencies;
        }
    });

    // Font choice loader
    WPZOOM = $.extend(WPZOOM_Controls, {
        fontElements: $(),
        tomSelectInstances: {},

        initFont: function() {
            var self = this;

            self.cache.toSync = $(document).find('[data-customize-setting-link="body-font-family-sync-all"]').is(':checked');

            // Build Tom Select options array once from fontChoises
            self.cache.tsOptions = [];
            self.cache.tsOptgroups = [];
            var font_families_with_preview = self.font_families_with_preview || {};

            var sortIndex = 0;
            _.each(self.fontChoises, function(item, groupKey) {
                var groupLabel = item.label || groupKey;
                self.cache.tsOptgroups.push({ value: groupKey, label: groupLabel });

                _.each(item, function(text, val) {
                    if ( val === 'label' ) return;
                    self.cache.tsOptions.push({
                        value: val,
                        text: text,
                        optgroup: groupKey,
                        hasPreview: typeof font_families_with_preview[ text ] !== 'undefined',
                        sortOrder: sortIndex++
                    });
                });
            });

            self.cache.$document.ready(function() {
                self.getFontElements();

                self.fontElements.each(function() {
                    var el = this;
                    var settingId = $(el).data('settingId');

                    if ( self.tomSelectInstances[ settingId ] ) {
                        return;
                    }

                    // Clear the single placeholder option before Tom Select init
                    $(el).empty();

                    var ts = new TomSelect(el, {
                        options: self.cache.tsOptions,
                        optgroups: self.cache.tsOptgroups,
                        optgroupField: 'optgroup',
                        optgroupOrder: ['standard-fonts', 'popular-google-fonts', 'google-fonts'],
                        sortField: [{ field: 'sortOrder', direction: 'asc' }],
                        valueField: 'value',
                        labelField: 'text',
                        searchField: ['text'],
                        maxOptions: null,
                        items: [ $(el).data('currentValue') || '' ],
                        render: {
                            option: function(data, escape) {
                                var cls = data.hasPreview ? ' font-has-preview' : '';
                                return '<div class="option' + cls + '" title="' + escape(data.text) + '">' + escape(data.text) + '</div>';
                            }
                        },
                        onChange: function(value) {
                            if ( !value ) return;
                            var params = { selected: value };
                            self.updateFontParams(params);

                            var sid = $(el).data('settingId');

                            // Only sync all fonts when the body font-family itself changes
                            if ( self.cache.toSync && sid === 'body-font-family' ) {
                                self.syncFontFamily( true );
                            }

                            // Update the customizer setting
                            if ( sid ) {
                                api( sid, function( setting ) {
                                    setting.set( value );
                                });
                            }

                            self.cache.$document.find('.zoom-font-family-preview-modal').remove();
                        }
                    });

                    self.tomSelectInstances[ settingId ] = ts;
                });
            });
        },

        getFontElements: function() {
            var self = this;
            var font;

            self.fontSettings = self.fontSettings || {};

            $.each(self.fontSettings, function(i, setting) {
                api.control(setting.setting_id, function(control) {
                    var $element = control.container.find('select');
                    var value = setting.default;

                    $element.data('settingId', setting.setting_id);

                    // Check selected value
                    if ( typeof setting.value != 'undefined' ) {
                        value = setting.value;
                    }

                    if ( setting.rule == 'font-family' ) {
                        $element.html('<option value="'+ value +'" selected="selected">' + value + '</option>');
                        $element.data('currentValue', value);
                        font = value;

                        self.cache.cloud[ control.params.section ] = {};
                        self.fontElements = self.fontElements.add($element);
                    }

                    if ( setting.rule == 'font-weight' || setting.rule == 'font-subset' || setting.rule == 'font-style' ) {
                        self.updateFontParams({'container': control.container, 'selected': font, 'value': setting.value}, true);
                    }
                });
            });
        },

        updateFontElements: function() {
            // No-op: Tom Select manages its own options, no need to rebuild
        },

        updateFontParams: function(params, init) {
            init = init || false;

            var options = $.extend({
                init: init,
                labels: ['font-weight', 'font-subset', 'font-style']
            }, params);

            var self = WPZOOM;
            var active_panel = self.cache.$document.find('.control-section.open');

            if ( options.init ) {

                _.each(options.labels, function(label){

                    options.label = label;

                    self.toggleFontLabels(options.container, options);
                });

            } else if ( ! init && active_panel.length ) {

                _.each(options.labels, function(label) {

                    var customize_control = active_panel.find('[id$="'+ label +'"][class*="customize-control"]');

                    if ( ! customize_control.length ) return;

                    var matches = customize_control.attr('id').match(/customize-control-(.*)/),
                        setting_id = matches[1],
                        $container = api.control(setting_id).container;

                    // Preserve current value instead of resetting to 'normal'
                    var currentValue = api( setting_id ) ? api( setting_id ).get() : 'normal';
                    options.triggerSet = _.isString( currentValue ) ? currentValue : JSON.stringify( currentValue );
                    options.trigger = true;
                    options.label = label;

                    self.toggleFontLabels($container, options);
                });
            }
        },

        toggleFontLabels: function($container, options) {
            var self = WPZOOM;

            var label = options.label,
                triggerSet = options.triggerSet || 'normal';

            var standard_fonts = self.fontParams['standard-fonts'],
                google_fonts = self.fontParams['google-fonts'];

            // Hide all labels
            $container.find('label[for*="' + label + '"]').hide();

            // Standard Fonts
            if ( typeof standard_fonts.fonts[options.selected] != 'undefined' ) {

                var fontData = standard_fonts.fonts[options.selected];

                // Show weight labels based on the font's defined weights
                if ( 'font-weight' == label && fontData.weights ) {
                    _.each( fontData.weights, function( weight ) {
                        $container.find('label[for$="font-weight' + weight + '"]').show();
                    });
                }

                // Show style labels based on the font's defined styles
                if ( 'font-style' == label && fontData.styles ) {
                    _.each( fontData.styles, function( style ) {
                        // Map 'regular' to 'normal' to match the control values
                        var styleValue = ( style === 'regular' ) ? 'normal' : style;
                        $container.find('label[for$="font-style' + styleValue + '"]').show();
                    });
                }

                // Hide 'Font Languages' control
                if ( $container.attr('id').indexOf('font-subset') != -1 ) {
                    $container.hide();
                }

                // Set default or restore value from options.triggerSet
                if ( options.trigger ) {

                    if ( 'font-weight' == label ) {
                        var weightLabel = $container.find('label[for$="font-weight' + triggerSet + '"]');
                        if ( weightLabel.length ) {
                            weightLabel.trigger('click');
                        } else {
                            $container.find('label[for$="font-weightnormal"]').trigger('click');
                        }
                    }

                    if ( 'font-style' == label ) {
                        if ( triggerSet.match(/(italic|normal)/) ) {
                            $container.find('label[for$="font-style'+ triggerSet +'"]').trigger('click');
                        }
                    }

                }

            }

            // Google Fonts
            if ( typeof google_fonts.fonts[options.selected] != 'undefined' ) {

                // Loop only font variants: 100, 200, 300, 400, ...
                // and skip variants: 100italic, 200italic, 300italic, 400italic, ...
                _.each(google_fonts.fonts[options.selected].variants, function (variant) {

                    var hasOnlyItalic = google_fonts.fonts[options.selected].variants.length === 1 && variant.indexOf('italic') === 0;
                    var hasOnlyRegular = google_fonts.fonts[options.selected].variants.length === 1 && variant.indexOf('regular') === 0;

                    // font family has only `italic` as font style variant
                    if ( hasOnlyItalic ) {
                        if ( label == 'font-style' ) {
                            // Display font style `italic`
                            $container.find('label[for$="font-style'+ variant +'"]').show();
                            // Set font style 'italic' as default
                            if ( options.trigger ) {
                                // Trigger 'click' if default value is not active
                                if ( ! $container.find('input[id$="font-style'+ variant +'"]').is(':checked') ) {
                                    $container.find('label[for$="font-style'+ variant +'"]').trigger('click');
                                }
                            }
                            return;
                        }
                    }
                    // font family has multiple font style variants
                    // and we need to skip variant that include `italic` style
                    else if ( variant.indexOf('italic') != -1 ) {
                        return;
                    }

                    // Regular is 400
                    if ( variant == 'regular' ) variant = 'normal';

                    // Show needed labels
                    $container.find('label[for$="font-weight'+ variant +'"]').show();

                    if ( hasOnlyItalic ) {
                        $container.find('label[for$="font-stylenormal"]').hide();
                        $container.find('label[for$="font-styleitalic"]').show();
                    }
                    if ( hasOnlyRegular ) {
                        $container.find('label[for$="font-stylenormal"]').show();
                        $container.find('label[for$="font-styleitalic"]').hide();
                    }
                    if ( ! hasOnlyRegular && ! hasOnlyItalic ) {
                        $container.find('label[for$="font-stylenormal"]').show();
                        $container.find('label[for$="font-styleitalic"]').show();
                    }

                    // Set 'normal' as default
                    // or value from options.triggerSet if exists
                    if ( options.trigger && variant == triggerSet ) {

                        // Trigger 'click' if default value is not active
                        if ( ! $container.find('input[id$="font-weight'+ variant +'"]').is(':checked') ) {
                            $container.find('label[for$="font-weight'+ variant +'"]').trigger('click');
                        }
                    }

                    // Show 'bold'
                    if ( variant == '700' || variant == '800' || variant == '900' ) {
                        $container.find('label[for$="font-weightbold"]').show();
                    }

                });


                // Show 'Font Languages' control
                if ( $container.attr('id').indexOf('font-subset') != -1 ) {
                    $container.show();
                }

                // Font subsets (latin, cyrillic, greek, ...)
                _.each(google_fonts.fonts[options.selected].subsets, function (subset) {

                    // Show needed labels
                    $container.find('label[for$="font-subset'+ subset +'"]').show();

                    // Show 'all' label if font has more than 3 subsets
                    if ( google_fonts.fonts[options.selected].subsets.length > 3 ) {
                        $container.find('label[for$="font-subsetall"]').show();
                    }

                    // Set 'latin' as default
                    // or value from options.triggerSet if exists
                    if ( options.trigger ) {

                        if ( ( triggerSet != 'normal' && subset == triggerSet) || (triggerSet == 'normal' && subset == 'latin' ) ) {
                            // Trigger 'click' if default value is not active
                            if ( ! $container.find('input[id$="font-subset'+ subset +'"]').is(':checked') ) {
                                $container.find('label[for$="font-subset'+ subset +'"]').trigger('click');
                            }
                        }

                    }

                });

            }

        },

        insertFontChoices: function(content) {
            // No-op: Tom Select manages its own options
        },

        fontResetOption: function() {
            var self = this;

            $('<span class="wpz-customizer-font-reset button" title="' + WPZOOM.l10n.reset_tooltip + '" role="button"><span class="dashicons dashicons-undo"></span> ' + WPZOOM.l10n.reset_button + '</span>')
                .on( 'click', function(e){
                    if ( confirm( WPZOOM.l10n.dialog_confirm ) ) {
                        var $this = $(this);

                        self.updateFontElements();

                        wp.ajax.post( 'wpz_customizer_get_options_defaults', { nonce: wp.customize.settings.nonce['wpzoom-customizer-options-defaults'], wp_customize: 'on' } )
                            .done( function(response){
                                if ( response && response.data ) {
                                    var ajaxData = response.data;

                                    $.each( $this.closest('ul.control-section').find('select[name^="_customize-"], input[name^="_customize-"], input.zoom-range-input, input.zoom-responsive-input'), function(key,val){
                                        var $input = $(val);
                                        var devices = [ 'desktop', 'tablet', 'mobile' ];
                                        var id = $input.attr('id'),
                                            device = $input.attr('data-id'),
                                            isResponsive = $.inArray( device, devices ) !== -1;

                                        if ( isResponsive ) {
                                            id = id.replace('-'+device, '');
                                        }

                                        if ( $input.is('input') ) id = id.replace( /^input_/i, '' ).replace( new RegExp( $.trim( $input.val() ) + '$' ), '' );

                                        if ( id != '' && ( id in ajaxData ) ) {
                                            var dflt = ajaxData[ id ];

                                            if ( id.indexOf('font-subset') !== -1 && !(dflt instanceof Array) ) dflt = [dflt];

                                            if ( isResponsive ) {
                                                var $select_unit = $input.parent().find('.zoom-responsive-select.' + device);

                                                if ( (typeof dflt === 'object') && (device + '-unit' in dflt) ) {
                                                    $select_unit.val( dflt[ device + '-unit' ] );
                                                }

                                                $select_unit.trigger('change');

                                                dflt = (typeof dflt === 'object') && (device in dflt) ? dflt[ device ] : dflt;
                                            }

                                            var newval, original;

                                            if ( $input.is('input[type="checkbox"], input[type="radio"]') ) {
                                                original = $input.prop('checked');
                                                newval = dflt instanceof Array && dflt.indexOf( $input.val() ) !== -1 ? true : ( $input.val() == dflt );
                                                $input.prop('checked', newval);
                                            } else {
                                                original = $input.val();
                                                newval = dflt;
                                                $input.val( newval );
                                            }

                                            if ( newval != original ) {
                                                $input.trigger('change');

                                                if ( $input.is('select') ) {
                                                    // Update Tom Select if this is a font-family select
                                                    var inputSettingId = $input.data('settingId');
                                                    var ts = inputSettingId && self.tomSelectInstances[ inputSettingId ];
                                                    if ( ts ) {
                                                        ts.setValue( newval, true );
                                                    }
                                                    self.updateFontParams({ 'container': $input.closest('.customize-control'), 'selected': newval, 'value': newval });
                                                }
                                            }
                                        }
                                    } );
                                }
                            } );
                    }

                    e.preventDefault();
                } )
                .appendTo('#customize-theme-controls [id^="sub-accordion-section-font-"] .customize-section-title');
        },

        syncFontFamily: function( toSync ) {
            var self = this;

            var typography_panels = _.filter( self.cache.list_controls, function( control ) {
                return 'body-font-family-sync-all' !== control.id && control.id.match(/(font-family|font-weight|font-subset|font-style)/);
            } );

            var font_family_to_sync = '',
                isChecked = typeof toSync !== 'undefined';

            self.cache.toSync = isChecked;
            self.updateFontElements();

            _.each( typography_panels, function(control){
                var matches = control.id.match(/(font-family|font-weight|font-subset|font-style)/);
                var section = control.params.section,
                    rule = matches[0];

                var options = {
                    trigger: true,
                    triggerSet: 'normal',
                    selected: '',
                    label: rule
                };

                // store values in case we need to revert back to
                if ( typeof self.cache.cloud[ section ] === 'undefined' ) {
                    self.cache.cloud[ section ] = {};
                }
                if ( typeof self.cache.cloud[ section ][ rule ] === 'undefined' ) {
                    self.cache.cloud[ section ][ rule ] = control.setting.get();
                }

                // match only font-family rule
                if ( 'font-family' === rule ) {
                    // get selected body font family
                    if ( 'body-font-family' === control.id ) {
                        font_family_to_sync = control.setting.get();
                    }

                    // "Sync all fonts" is checked
                    if ( isChecked ) {
                        if ( '' !== font_family_to_sync ) {
                            control.setting.set( font_family_to_sync );
                        }
                    }
                    // revert back values
                    else {

                        if ( 'body-font-family' !== control.id ) {
                            font_family_to_sync = self.cache.cloud[ section ][ rule ];
                            control.setting.set( font_family_to_sync );
                        }

                    }

                    options['selected'] = font_family_to_sync;
                    options['toSync'] = false;

                    // Update Tom Select instance visually
                    var ts = self.tomSelectInstances[ control.id ];
                    if ( ts ) {
                        // Use silent=true to avoid triggering onChange which would recurse
                        ts.setValue( font_family_to_sync, true );
                    }

                    // Trigger change on the underlying select for customizer transport
                    control.container.find('select').trigger('change', options);

                }
                // match rules font-weight, font-subset, font-style
                else {

                    options['triggerSet']   = _.isString( self.cache.cloud[ section ][ rule ] ) ? self.cache.cloud[ section ][ rule ] : JSON.stringify( self.cache.cloud[ section ][ rule ] );
                    options['selected']     = font_family_to_sync;

                    self.toggleFontLabels(control.container, options);
                }

            });
        }
    });

    // Reorderable post meta feature
    WPZOOM = $.extend(WPZOOM_Controls, {
        initRPM: function() {
            var self = this;

            if ( typeof self.rpm !== 'undefined' && typeof self.rpm.homepage_post_meta !== 'undefined' ) {
                var $homepage_meta = $("<div class='post-meta-editor homepage-post-meta'>" + self.buildMetaList( self.rpm.homepage_post_meta ) + "</div>").insertAfter( "#_customize-input-homepage-post-meta" ),
                    $archive_meta = $("<div class='post-meta-editor archive-post-meta'>" + self.buildMetaList( self.rpm.archive_post_meta ) + "</div>").insertAfter( "#_customize-input-archive-post-meta" ),
                    $single_meta = $("<div class='post-meta-editor single-post-meta'>" + self.buildMetaList( self.rpm.single_post_meta ) + "</div>").insertAfter( "#_customize-input-single-post-meta" );

                var $sortables = $homepage_meta.add( $archive_meta ).add( $single_meta ).find( ".post-meta-section-fields" );

                $sortables.each( function() {
                    $( this ).sortable( {
                        axis: "y",
                        connectWith: $( this ).closest( ".post-meta-editor" ).find( ".post-meta-section-fields" ),
                        containment: $( this ).closest( ".post-meta-editor" ),
                        create: function() { $( this ).css( "min-height", $( this ).find( "> li" ).height() + "px" ); },
                        cursor: "move",
                        forcePlaceholderSize: true,
                        handle: "> .dashicons",
                        items: "> li",
                        placeholder: "ui-state-highlight",
                        start: function() { $( this ).height( "auto" ); },
                        tolerance: "pointer",
                        update: function() {
                            $( this ).toggleClass( "empty", $( this ).find( "li:not(.ui-sortable-helper)" ).length < 1 );
                            self.updateValue( $( this ).closest( ".post-meta-editor" ) );
                        }
                    } );
                } );

                $sortables.disableSelection();

                $sortables.find( "> li" )
                    .mousedown( function() {
                        var $cont = $( this ).closest( ".post-meta-section-fields" );
                        $cont.height( $cont.height() );
                    } )
                    .mouseup( function() {
                        $( this ).closest( ".post-meta-section-fields" ).height( "auto" );
                    } );

                $sortables.find("input:checkbox")
                    .on( "change", function(){
                        $(this).closest("li").toggleClass( "unchecked", !$(this).is(":checked") );
                        self.updateValue( $(this).closest( ".post-meta-editor" ) );
                    } );
            }
        },

        buildMetaList: function( array_in ) {
            var output = "";

            if ( array_in && array_in.length > 0 && typeof array_in[0] !== 'undefined' ) {
                if ( typeof array_in[0].name !== 'undefined' && typeof array_in[0].fields !== 'undefined' ) {
                    array_in.forEach( function(v){
                        var section_name = v.name.replace( /_/g, " " ),
                            fields = v.fields;

                        output += "<div class='post-meta-section post-meta-section-" + v.name + "' data-section='" + v.name + "'><h3 class='post-meta-section-name'>" + section_name + "</h3><ul class='post-meta-section-fields'>";

                        fields.forEach( function(z){
                            var checked = z.enabled ? " checked='checked'" : "",
                                clazz = z.enabled ? "" : " unchecked",
                                name = z.field.replace( /_/g, " " ).replace( "previous next", "previous/Next" );

                            output += "<li class='post-meta-" + z.field + clazz + "' data-field='" + z.field + "'><span class='dashicons dashicons-move'></span> <label><input type='checkbox'" + checked + " /> " + name + "</label></li>";
                        } );

                        output += "</ul></div>";
                    } );
                } else {
                    output += "<div class='post-meta-section'><ul class='post-meta-section-fields'>";

                    array_in.forEach( function(v){
                        var checked = v.enabled ? " checked='checked'" : "",
                            clazz = v.enabled ? "" : " unchecked",
                            name = v.field.replace( /_/g, " " ).replace( "previous next", "previous/Next" );

                        output += "<li class='post-meta-" + v.field + clazz + "' data-field='" + v.field + "'><span class='dashicons dashicons-move'></span> <label><input type='checkbox'" + checked + " /> " + name + "</label></li>";
                    } );

                    output += "</ul></div>";
                }
            }

            return output;
        },

        updateValue: function( $wrapper ) {
            var newVal = "";

            if ( $wrapper.find( ".post-meta-section-name" ).length > 0 ) {
                newVal += "[";

                $wrapper.find( ".post-meta-section" ).each( function() {
                    var name = typeof $( this ).data( "section" ) !== "undefined" ? $( this ).data( "section" ) : "",
                        fields = $( this ).find( ".post-meta-section-fields" ),
                        arr = fields.sortable( "toArray", { attribute: "data-field" } ),
                        mapped = arr.map( function( x ) { return '{"field":"' + x + '","enabled":' + fields.find( "li.post-meta-" + x + " input:checkbox" ).is( ":checked" ) + '}'; } );

                    newVal += '{"name":"' + name + '","fields":[' + mapped + ']},';
                } );

                newVal = newVal.replace( /,+$/, "" ) + "]";
            } else {
                var fields = $wrapper.find( ".post-meta-section-fields" ),
                    arr = fields.sortable( "toArray", { attribute: "data-field" } ),
                    mapped = arr.map( function( x ) { return '{"field":"' + x + '","enabled":' + fields.find( "li.post-meta-" + x + " input:checkbox" ).is( ":checked" ) + '}'; } );

                newVal = '[' + mapped + ']';
            }

            if ( $wrapper.hasClass( "homepage-post-meta" ) ) {
                if ( this.rpm.homepage_post_meta != newVal ) {
                    this.rpm.homepage_post_meta = newVal;

                    $wrapper.parent().find( "#_customize-input-homepage-post-meta" )
                        .val( this.rpm.homepage_post_meta )
                        .trigger( "change" );
                }
            } else if ( $wrapper.hasClass( "archive-post-meta" ) ) {
                if ( this.rpm.archive_post_meta != newVal ) {
                    this.rpm.archive_post_meta = newVal;

                    $wrapper.parent().find( "#_customize-input-archive-post-meta" )
                        .val( this.rpm.archive_post_meta )
                        .trigger( "change" );
                }
            } else {
                if ( this.rpm.single_post_meta != newVal ) {
                    this.rpm.single_post_meta = newVal;

                    $wrapper.parent().find( "#_customize-input-single-post-meta" )
                        .val( this.rpm.single_post_meta )
                        .trigger( "change" );
                }
            }
        }
    });

    // Responsive slider height feature
    WPZOOM = $.extend( WPZOOM_Controls, {
        initRSH: function() {
            var self = this;

            if ( typeof self.rsh !== 'undefined' && true == self.rsh ) {
                var $desktop = $( '#customize-control-slideshow_height_desktop' ),
                    $tablet  = $( '#customize-control-slideshow_height_tablet' ),
                    $phone   = $( '#customize-control-slideshow_height_phone' ),
                    $all     = $desktop.add( $tablet ).add( $phone );

                $( '<span class="device-select dashicons dashicons-desktop"></span>' )
                    .appendTo( $desktop.find( '.customize-control-title' ) )
                    .on( 'click', function( e ) { e.preventDefault(); api.previewedDevice.set( 'tablet' ); } );

                $( '<span class="device-select dashicons dashicons-tablet"></span>' )
                    .appendTo( $tablet.find( '.customize-control-title' ) )
                    .on( 'click', function( e ) { e.preventDefault(); api.previewedDevice.set( 'mobile' ); } );

                $( '<span class="device-select dashicons dashicons-smartphone"></span>' )
                    .appendTo( $phone.find( '.customize-control-title' ) )
                    .on( 'click', function( e ) { e.preventDefault(); api.previewedDevice.set( 'desktop' ); } );

                $tablet.add( $phone ).hide();

                api.previewedDevice.bind( function( newDevice ) {
                    var height = '100';

                    $all.hide();

                    if ( 'desktop' == newDevice ) {
                        height = api( 'slideshow_height_desktop' ).get();

                        $desktop.show();
                    } else if ( 'tablet' == newDevice ) {
                        height = api( 'slideshow_height_tablet' ).get();

                        $tablet.show();
                    } else if ( 'mobile' == newDevice ) {
                        height = api( 'slideshow_height_phone' ).get();

                        $phone.show();
                    }

                    api.previewer.send( 'update-slider', parseInt( height ) );
                } );

                api( 'slideshow_height_desktop', function( value ) { value.bind( self.updateSlider ) } );
                api( 'slideshow_height_tablet', function( value ) { value.bind( self.updateSlider ) } );
                api( 'slideshow_height_phone', function( value ) { value.bind( self.updateSlider ) } );
            }
        },

        updateSlider: function() {
            var height = '100',
                currentDevice = api.previewedDevice.get();

            if ( 'desktop' == currentDevice ) {
                height = api( 'slideshow_height_desktop' ).get();
            } else if ( 'tablet' == currentDevice ) {
                height = api( 'slideshow_height_tablet' ).get();
            } else if ( 'mobile' == currentDevice ) {
                height = api( 'slideshow_height_phone' ).get();
            }

            api.previewer.send( 'update-slider', parseInt( height ) );
        }
    } );

    $(document).ready(function() {
        WPZOOM.__construct();
    });

    $('.wp-full-overlay-footer .devices button').on('click', function() {

        var device = $(this).attr('data-device');

        $('.customize-control-zoom_responsive .zoom-range-container, .customize-control .zoom-responsive-btns > li').removeClass( 'active' );
        $('.customize-control-zoom_responsive .zoom-range-container.' + device + ', .customize-control .zoom-responsive-btns > li.' + device).addClass( 'active' );
    });


    api.controlConstructor.zoom_responsive = api.Control.extend({

        // When we're finished loading continue processing.
        ready: function() {

            'use strict';

            var control = this,
                value;

            control.responsiveContainer = control.container.find('.zoom-responsive-container');
            control.responsiveBtns = control.responsiveContainer.find('.zoom-responsive-btns');
            control.responsiveRange = control.responsiveContainer.find('.zoom-range-container');
            control.valueUpdated = false;

            control.zoomResponsiveInit();
            
            /**
             * Save on change / keyup / paste
             */
            control.responsiveRange.on( 'change keyup paste', 'input.zoom-range-input', function() {

                if ( ! control.valueUpdated ) {
                    // Update value on change.
                    control.updateValue();
                }

            });

            /**
             * Refresh preview frame on blur
             */
            control.responsiveRange.on( 'blur', 'input', function() {

                value = $(this).val() || '';

                if ( value == '' ) {
                    api.previewer.refresh();
                }

            });

        },

        /**
         * Updates the sorting list
         */
        updateValue: function() {

            'use strict';

            var control = this,
            newValue = {};

            control.responsiveRange.each( function() {
                var $input      = $(this).find('.zoom-range-input'),
                    $select     = $(this).find( 'select.zoom-responsive-select' ),
                    item        = $input.data('id'),
                    _item       = $select.data('id'),
                    item_value  = $input.val(),
                    _item_value = $select.val();

                newValue[item] = item_value;
                newValue[_item] = _item_value;
            });

            control.setting.set( newValue );
            control.valueUpdated = true;
        },

        zoomResponsiveInit : function() {
            
            'use strict';

            var control = this;

            control.responsiveRange.each(function() {
                var $input  = $(this).find('.zoom-range-input'),
                    $slider = $(this).find('.zoom-range-slider'),
                    $select = $(this).find('select.zoom-responsive-select'),
                    id      = $input.data('id'),
                    value   = parseFloat( $input.val() ),
                    _value  = parseFloat( $input.attr('data-value') ),
                    min     = parseFloat( $input.attr('min') ),
                    max     = parseFloat( $input.attr('max') ),
                    step    = parseFloat( $input.attr('step') );

                value = !isNaN( value ) ? value : _value;

                // Configure the slider
                $slider.slider({
                    value : value,
                    min   : min,
                    max   : max,
                    step  : step,
                    slide : function(e, ui) { $input.val(ui.value) }
                });

                // Debounce the slide event so the preview pane doesn't update too often
                $slider.on('slide', _.debounce(function(e, ui) {
                    control.valueUpdated = false;
                    $input.keyup().trigger('change');
                }, 300));

                $select.on('change', _.debounce(function(){
                    control.valueUpdated = false;
                    $input.trigger('change');
                }, 300));

                // Sync values of number input and slider
                $input.val( $slider.slider('value')).on('change', function() {
                    $slider.slider('value', $(this).val());
                });

                // Listen for changes to the range input.
                $input.on('change', function() {
                    $slider.slider('value', $(this).val());
                    control.valueUpdated = false;
                    control.responsiveRange.trigger('change');
                });

                // // Update the range if the setting changes.
                control.setting.bind(function(value) {
                    if ( typeof value === 'object' ) {
                        $input.val( value[ id ] );
                    }
                });
            });

            control.responsiveBtns.find('button').on( 'click', function( event ) {
                var device = $(this).attr('data-device');
                if( 'desktop' == device ) {
                    device = 'tablet';
                } else if( 'tablet' == device ) {
                    device = 'mobile';
                } else {
                    device = 'desktop';
                }

                $( '.wp-full-overlay-footer .devices button[data-device="' + device + '"]' ).trigger( 'click' );
            });
        },
    });


    /**
     * Initialize instances of WPZOOM_Customizer_Control_Select
     *
     * @since 1.7.0
     */
    api.controlConstructor.zoom_color_picker = api.Control.extend({
        ready: function() {
            var control = this,
                $container = control.container.find('.zoom-color-picker-container'),
                $input = $('input.zoom-alpha-color-picker', $container);

            $input.alphaColorPicker();
        }
    });

    /**
     * Initialize instances of WPZOOM_Customizer_Control_Select
     *
     * @since 1.7.0
     */
    api.controlConstructor.zoom_select = api.Control.extend({
        ready: function() {
            var control = this,
                $container = control.container.find('.zoom-select-container'),
                $input = $('select', $container);

            // Listen for changes to the select.
            $input.on('change', function() {
                var value = $(this).val();
                var value_type = typeof control.setting.get();

                control.setting.set( WPZOOM.convertToType( value, value_type ) );
            });

            // Update the select if the setting changes.
            control.setting.bind(function(value) {
                $input.val(value);
            });
        }
    });

    /**
     * Initialize instances of WPZOOM_Customizer_Control_Sortable
     *
     * @since 1.7.0
     */
    api.controlConstructor.zoom_sortable = api.Control.extend({
        ready: function() {
            var control = this,
                $container = control.container.find('.zoom-sortable-container'),
                $label = control.container.find('.customize-control-title'),
                $sortable = $('ol', $container),
                $input = $('input[type="hidden"]', $container);

            var newval;

            $label.on('click', function(e){ e.preventDefault(); $sortable.focus(); });

            $sortable.sortable({
                axis: "y",
                containment: "parent",
                update: function(e, ui){
                    var value_type = typeof control.setting.get();
                        newval = '';

                    // Listen for changes to the sortable.
                    $.each($sortable.sortable("toArray"), function(index, id){
                        var value = $container.find('#' + id).attr('data-item-value');

                        newval += value;
                    });

                    control.setting.set( WPZOOM.convertToType( newval, value_type ) );
                }
            });

            // Update the select if the setting changes.
            control.setting.bind(function(value) {
                $input.val(value);
            });
        }
    });

    /**
     * Initialize instances of WPZOOM_Customizer_Control_Radio
     *
     * @since 1.7.0.
     */
    api.controlConstructor.zoom_radio = api.Control.extend({
        ready: function() {
            var control = this,
                $container = control.container.find('.zoom-radio-container');

            $container.each(function() {
                if ($(this).hasClass('zoom-radio-buttonset-container') || $(this).hasClass('zoom-radio-image-container')) {
                    $(this).buttonset();
                }
            });

            // Listen for changes to the radio group.
            $container.on('change', 'input:radio', function(event) {
                var value = $(this).parent().find('input:radio:checked').val();
                var value_type = typeof control.setting.get();

                control.setting.set( WPZOOM.convertToType( value, value_type ) );
            });

            if ( $container.attr('id') == 'input_style-kits-selector' ) {
                $container.find('.ui-button').on('click', function(){
                    var request = wp.ajax.post( 'wpz_customizer_get_stylekit_data', {
                        nonce: wp.customize.settings.nonce['wpzoom-customizer-stylekits'],
                        wp_customize: 'on',
                        stylekit: $(this).attr('for').replace('style-kits-selector', '')
                    });
                    request.done(function(response){
                        _.each(response.data, function(value,id){
                            const setting = wp.customize(id);
                            const controls = setting && typeof setting.findControls === 'function' && setting.findControls();
                            const settingContainer = controls.length > 0 && controls[0].container;

                            if ( settingContainer ) {
                                control = controls[0];
                                $container = $(document).find( settingContainer );

                                setting.set( typeof value === 'object' ? JSON.stringify([value]) : value );
                                $container.find('input, select, textarea').addBack().trigger('change');
                                // Sync Tom Select instances with new values
                                $container.find('select').each(function() {
                                    var inputSettingId = $(this).data('settingId');
                                    var ts = inputSettingId && WPZOOM.tomSelectInstances[ inputSettingId ];
                                    if ( ts ) {
                                        ts.setValue( $(this).val(), true );
                                    }
                                });

                                if ( typeof value === 'object' ) {

                                    if ( 'obj' in control ) {
                                        control.obj[0] = value;
                                    }

                                    _.each(value, function(value2,id2){
                                        var $elem = $container.find('[class*="-' + id2 + '"]');

                                        if ( $elem.length > 0 ) {

                                            $elem.val(value2).trigger('change');

                                            if ( $elem.hasClass('wp-color-picker') ) {
                                                $elem.wpColorPicker('color', value2);
                                            } else if ( $elem.hasClass('zoom-range-input') ) {
                                                $elem.siblings('.zoom-range-slider').slider('value', value2);
                                            }
                                        }
                                    });
                                }
                            }
                        });
                    });
                });
            }

            // Update the radio group if the setting changes.
            control.setting.bind(function(value) {
                $container.find('input:radio').filter('[value=' + value + ']').prop('checked', true);
				wp.customize.previewer.refresh();
            });
        }
    });

    /**
     * Initialize instances of WPZOOM_Customizer_Control_Background_Gradient
     *
     * @since 1.7.1.
     */
    api.controlConstructor.zoom_background_gradient = api.Control.extend({
        obj: {},
        ready: function() {
            var control = this,
                settings = control.setting.get(),
                $container = control.container.find('.zoom-background-gradient-container'),
                picker = control.container.find( '.color-picker-hex' ),
                directions = control.container.find( 'select#directions' ),
                range = control.container.find( '.range-opacity-container' );

            try {
                control.obj = JSON.parse( settings );
            } catch (e) {
                control.obj = [settings];
            }

            picker.each(function(){
                var id = $(this).attr('id'),
                    value = control.obj[0][ id ];

                control.initColorPicker( $(this), value );
            });

            // Listen for changes to the select.
            directions.on('change', function() {
                var value = $(this).val();

                control.obj[0]['direction'] = value;

                control.setting.set( JSON.stringify(control.obj) );
            });

            // Update the select if the setting changes.
            control.setting.bind(function(value) {
                value = JSON.parse(value);

                directions.val(value[0]['direction']);
            });

            range.each(function() {
                control.initRange( $(this) );
            });
        },
        initColorPicker: function( picker, value ) {
            var control = this,
                updating = false,
                id = picker.attr('id');

            picker.val( value ).wpColorPicker({
                change: function() {
                    updating = true;

                    control.obj['picker'] = picker;
                    control.obj['id'] = id;
                    control.obj[0][ id ] = picker.wpColorPicker( 'color' );

                    control.setting.set( JSON.stringify(control.obj) );
                    updating = false;
                },
                clear: function() {
                    updating = true;

                    control.obj['picker'] = picker;
                    control.obj['id'] = id;
                    control.obj[0][ id ] = '';

                    control.setting.set( JSON.stringify(control.obj) );
                    updating = false;
                }
            });

            control.setting.bind( function ( value ) {
                // Bail if the update came from the control itself.
                if ( updating ) {
                    return;
                }

                value = JSON.parse(value);

                var picker = value[ 'picker' ], id = value[ 'id' ];

                _.each(value[0], function(val, key) {
                    if ( id === key ) {
                        picker.val( val );
                        picker.wpColorPicker( 'color', val );
                    }
                });

            } );


            // Collapse color picker when hitting Esc instead of collapsing the current section.
            control.container.on( 'keydown', function( event ) {
                var pickerContainer;
                if ( 27 !== event.which ) { // Esc.
                    return;
                }
                pickerContainer = control.container.find( '.wp-picker-container' );

                $.each(pickerContainer, function(){
                    if ( $(this).hasClass( 'wp-picker-active' ) ) {
                        if ( typeof control.obj[ 'picker' ] !== 'undefined' ) {
                            control.obj[ 'picker' ].wpColorPicker( 'close' );
                        }

                        $(this).find( '.wp-color-result' ).focus();
                        event.stopPropagation(); // Prevent section from being collapsed.
                    }
                });
            } );
        },
        initRange: function( container ) {
            var control = this;

            var $input = container.find('.zoom-range-input'),
                $slider = container.find('.zoom-range-slider'),
                value = parseFloat( $input.val() ),
                min = parseFloat( $input.attr('min') ),
                max = parseFloat( $input.attr('max') ),
                step = parseFloat( $input.attr('step') );

            // Configure the slider
            $slider.slider({
                value : value,
                min   : min,
                max   : max,
                step  : step,
                slide : function(e, ui) { $input.val(ui.value) }
            });

            // Debounce the slide event so the preview pane doesn't update too often
            $slider.on('slide', _.debounce(function(e, ui) {
                $input.keyup().trigger('change');
            }, 300));

            // Sync values of number input and slider
            $input.val( $slider.slider('value')).on('change', function() {
                $slider.slider('value', $(this).val());
            });

            // Listen for changes to the range.
            $input.on('change', function() {
                var value = $(this).val(),
                    id = $(this).attr('id');

                control.obj['slide'] = $(this);
                control.obj['slide_id'] = id;
                control.obj[0][ id ] = value;

                control.setting.set( JSON.stringify(control.obj) );
            });

            // Update the range if the setting changes.
            control.setting.bind(function(value) {
                var $input = control.obj['slide'],
                    id = control.obj['slide_id'];

                value = JSON.parse(value);

                if ( typeof id !== 'undefined' ) {
                    $input.val(value[0][ id ]);
                }
            });
        }
    });

    /**
     * Initialize instances of WPZOOM_Customizer_Control_Checkbox_Multiple
     *
     * @since 1.7.0.
     */
    api.controlConstructor.zoom_checkbox_multiple = api.Control.extend({
        ready: function() {
            var control = this,
                multiple_values = [],
                $container = control.container.find('.zoom-checkbox-container');

            $container.each(function() {
                if ($(this).hasClass('zoom-checkbox-buttonset-container')) {
                    $(this).buttonset();
                }
            });

            // Map checked values
            $container.find('input:checkbox').each(function() {
                if ( $(this).is(':checked') ) {
                    multiple_values.push( $(this).val() );
                }
            });

            // Listen for changes to the checkbox group.
            $container.on('change', 'input:checkbox', function() {
                var value = $(this).val();
                var isButtonset = $(this).hasClass('zoom-checkbox-buttonset-container');

                // Add new value in array if doesn't contains
                // else remove it
                if ( ! _.contains(multiple_values, value) ) {
                    multiple_values.push( value );
                } else {
                    multiple_values = $.grep(multiple_values, function(val) {
                        return val != value;
                    });
                }

                // Check all checkboxes
                if ( value == 'all' ) {

                    if ( isButtonset ) {
                        $container.find('input:checkbox').prop('checked', this.checked).button('refresh');
                    } else {
                        $container.find('input:checkbox').prop('checked', this.checked);
                    }

                    // Push all values in array if 'all' is checked
                    // else empty array
                    if ( this.checked ) {
                        $container.find('input:checkbox').each(function() {
                            if ( $(this).val() != 'all' ) {
                                multiple_values.push( $(this).val() );
                            }
                        });
                    } else {
                        multiple_values = [];
                    }
                }

                control.setting.set(multiple_values);
            });

            // Update the checkbox group if the setting changes.
            control.setting.bind(function(value) {
                var isButtonset = $container.hasClass('zoom-checkbox-buttonset-container');

                _.each(multiple_values, function(val){

                    if ( isButtonset ) {
                        $container.find('input:checkbox').filter('[value=' + val + ']').prop('checked', true).button('refresh');
                    } else {
                        $container.find('input:checkbox').filter('[value=' + val + ']').prop('checked', true);
                    }

                });
            });
        }
    });

    /**
     * Initialize instances of WPZOOM_Customizer_Control_Checkbox
     *
     * @since 1.7.1.
     */
    api.controlConstructor.zoom_checkbox = api.Control.extend({
        ready: function() {
            var control = this,
                $container = control.container.find('.zoom-checkbox-container');

            // Listen for changes to the checkbox.
            $container.on('change', 'input:checkbox', function() {
                var value = $(this).parent().find('input:checkbox:checked').val();
                var value_type = typeof control.setting.get();

                if ( 'body-font-family-sync-all' === control.id ) {
                    WPZOOM.syncFontFamily( value );
                }

                control.setting.set( WPZOOM.convertToType( value, value_type ) );
            });

            // Update the checkbox if the setting changes.
            control.setting.bind(function(value) {
                $container.find('input:checkbox').filter('[value=' + value + ']').prop('checked', true);
				wp.customize.previewer.refresh();
            });
        }
    });

    /**
     * Initialize instances of WPZOOM_Customizer_Control_Alignment
     *
     * @since 1.9.0
     */
    api.controlConstructor.zoom_alignment = api.Control.extend({
        ready: function () {
            var control = this,
                $container = control.container,
                $buttons = $container.find('.zoom-alignment-buttons button'),
                $input = $container.find('input[type="hidden"]');

            var setActive = function (value) {
                $buttons.removeClass('active');
                $buttons.filter('[data-alignment="' + value + '"]').addClass('active');
                if ($input.length) { $input.val(value); }
            };

            $container.on('click', '.zoom-alignment-buttons button', function (e) {
                e.preventDefault();
                var value = $(this).data('alignment');
                control.setting.set(value);
                setActive(value);
            });

            control.setting.bind(function (value) {
                setActive(value);
            });
        }
    });

    /**
     * UI-only device toggle control
     *
     * @since 1.9.0
     */
    api.controlConstructor.zoom_device_toggle = api.Control.extend({
        ready: function () {
            var control = this,
                $container = control.container,
                targets = (control.params && control.params.targets) || {};

            var allDevices = ['desktop', 'tablet', 'mobile'];
            var availableDevices = allDevices.filter(function (d) { return (targets[d] || []).length > 0; });

            var showFor = function (device) {
                $container.find('.wpz-device-tabs__btn').removeClass('is-active');
                $container.find('.wpz-device-tabs__btn[data-device="' + device + '"]').addClass('is-active');

                allDevices.forEach(function (d) {
                    var ids = targets[d] || [];
                    ids.forEach(function (id) {
                        // Prefer working with control.container to avoid timing issues
                        if (api.control && typeof api.control === 'function') {
                            api.control(id, function (ctrl) {
                                if (d === device) {
                                    ctrl.container.show();
                                } else {
                                    ctrl.container.hide();
                                }
                            });
                        } else {
                            var sel = '#customize-control-' + id;
                            if (d === device) {
                                jQuery(sel).show();
                            } else {
                                jQuery(sel).hide();
                            }
                        }
                    });
                });

                if (api.previewedDevice && typeof api.previewedDevice.set === 'function') {
                    api.previewedDevice.set(device);
                }
            };

            // Default to desktop (or first available)
            var initial = availableDevices.indexOf('desktop') !== -1 ? 'desktop' : (availableDevices[0] || 'desktop');
            // Ensure initial visibility once controls exist; try immediate and via control bindings
            showFor(initial);
            
            $container.on('click', '.wpz-device-tabs__btn', function (e) {
                e.preventDefault();
                var device = jQuery(this).data('device');
                showFor(device);
            });
        }
    });

    /**
     * Initialize instances of WPZOOM_Customizer_Control_Text
     *
     * @since 1.7.1.
     */
    api.controlConstructor.zoom_text = api.Control.extend({
        ready: function() {
            var control = this,
                $container = control.container.find('.zoom-text-container');

            // Listen for changes to the text input.
            $container.on('change', 'input:text', function() {
                var value = $(this).val();
                var value_type = typeof control.setting.get();

                control.setting.set( WPZOOM.convertToType( value, value_type ) );
            });

            // Update the text input if the setting changes.
            control.setting.bind(function(value) {
                $container.find('input:text').val(value);
            });
        }
    });

    /**
     * Initialize instances of WPZOOM_Customizer_Control_Range
     *
     * @since 1.7.0.
     */
    api.controlConstructor.zoom_range = api.Control.extend({
        ready: function() {
            var control = this,
                $container = control.container.find('.zoom-range-container');

            $container.each(function() {
                var $input = $(this).find('.zoom-range-input'),
                    $slider = $(this).find('.zoom-range-slider'),
                    value = parseFloat( $input.val() ),
                    _value = parseFloat( $input.attr('data-value') ),
                    min = parseFloat( $input.attr('min') ),
                    max = parseFloat( $input.attr('max') ),
                    step = parseFloat( $input.attr('step') );

                value = !isNaN( value ) ? value : _value;

                // Configure the slider
                $slider.slider({
                    value : value,
                    min   : min,
                    max   : max,
                    step  : step,
                    slide : function(e, ui) { $input.val(ui.value) }
                });

                // Debounce the slide event so the preview pane doesn't update too often
                $slider.on('slide', _.debounce(function(e, ui) {
                    $input.keyup().trigger('change');
                }, 300));

                // Sync values of number input and slider
                $input.val( $slider.slider('value')).on('change', function() {
                    $slider.slider('value', $(this).val());
                });

                // Listen for changes to the range.
                $input.on('change', function() {
                    var value = $(this).val();
                    control.setting.set(value);
                });

                // Update the range if the setting changes.
                control.setting.bind(function(value) {
                    $input.val(value);
                });
            });
        }
    });

    /**
     * Handles the TinyMCE editor settings API for the copyright field.
     * This function wait for initializes the TinyMCE editor and interacts with its API.
     * The TinyMCE editor is loaded through the WPZOOM_Customizer_Control_Copyright_WP_Editor PHP class.
     *
     * @since 8.0.25
     */
    // Use the TinyMCE editor initialization event
    $(document).on('tinymce-editor-init', function (event, editor) {

        // setup data
        const controlId = 'blogcopyright';
        const settingId = controlId;

        // check id
        if (editor.id === controlId) {
            // Add a listener for the 'input' event for real-time changes
            // logic for Visual edit type
            editor.on('change', function (e) {
                let content = editor.getContent();

                // Set the value of the setting in the Customizer
                api(settingId).set(content);

                // Trigger a live preview update with the new content
                api.previewer.refresh();
            });

            // logic for Text edit type
            document.getElementById(controlId).addEventListener('input', function () {
                let content = document.getElementById(controlId).value;

                // Set the value of the setting in the Customizer
                api(settingId).set(content);

                // Trigger a live preview update with the new content
                api.previewer.refresh();
            });
        } // end if
    });

    /**
     * Initialize instances of WPZOOM_Customizer_Control_Dimension
     *
     * @since 1.8.6
     */
    api.controlConstructor.zoom_dimension = api.Control.extend({
        ready: function () {
            var control = this,
                $container = control.container.find('.zoom-dimension-container'),
                isMultidirectional = control.params.multidirectional;

            if (isMultidirectional) {
                this.initMultidirectional(control, $container);
            } else {
                this.initSimple(control, $container);
            }
        },

        initSimple: function (control, $container) {
            var $input = $container.find('.zoom-dimension-input'),
                $select = $container.find('.zoom-dimension-select');

                // Function to update the setting
                var updateSetting = function () {
                    var value = $input.val();
                    var unit = $select.val();

                    control.setting.set({
                        value: value,
                        unit: unit
                    });
                };

                // Listen for changes to the dimension input
                $input.on('input change', function () {
                    updateSetting();
                });

                // Listen for changes to the dimension select
                $select.on('change', function () {
                    updateSetting();
                });

                // Update the inputs if the setting changes
                control.setting.bind(function (value) {
                    if (typeof value === 'object' && value !== null) {
                        $input.val(value.value || '');
                        $select.val(value.unit || 'px');
                    } else {
                        $input.val(value || '');
                        $select.val('px');
                    }
                });
        },

        initMultidirectional: function (control, $container) {
            var $toggle = $container.find('.zoom-dimension-link-toggle'),
                $inputs = $container.find('.zoom-dimension-input'),
                $unitSelect = $container.find('.zoom-dimension-unit-select'),
                isLinked = control.params.value.linked;

            // Function to update the setting
            var updateSetting = function () {
                var value = {
                    top: $container.find('.zoom-dimension-input-top').val(),
                    right: $container.find('.zoom-dimension-input-right').val(),
                    bottom: $container.find('.zoom-dimension-input-bottom').val(),
                    left: $container.find('.zoom-dimension-input-left').val(),
                    unit: $unitSelect.val(),
                    linked: isLinked
                };

                control.setting.set(value);
            };

            // Function to sync all inputs when linked
            var syncInputs = function (sourceInput) {
                if (!isLinked) return;

                var $source = $(sourceInput);
                var value = $source.val();

                $inputs.not($source).val(value);
            };

            // Toggle linked/unlinked mode
            $toggle.on('click', function () {
                isLinked = !isLinked;
                $(this).toggleClass('active', isLinked);
                $(this).attr('data-linked', isLinked);

                // Update label
                var $label = $container.find('.zoom-dimension-toggle-label');
                $label.text(isLinked ? 'Linked' : 'Unlinked');

                // If switching to linked, sync all inputs to the first one
                if (isLinked) {
                    var firstValue = $container.find('.zoom-dimension-input-top').val();
                    $inputs.val(firstValue);
                }
            });

            // Listen for changes to inputs
            $inputs.on('input change', function () {
                syncInputs(this);
                updateSetting();
            });

            // Listen for changes to unit select
            $unitSelect.on('change', function () {
                updateSetting();
            });

            // Update the inputs if the setting changes
            control.setting.bind(function (value) {
                if (typeof value === 'object' && value !== null) {
                    // Update individual direction values
                    if (typeof value.top !== 'undefined') {
                        $container.find('.zoom-dimension-input-top').val(value.top || '');
                    }
                    if (typeof value.right !== 'undefined') {
                        $container.find('.zoom-dimension-input-right').val(value.right || '');
                    }
                    if (typeof value.bottom !== 'undefined') {
                        $container.find('.zoom-dimension-input-bottom').val(value.bottom || '');
                    }
                    if (typeof value.left !== 'undefined') {
                        $container.find('.zoom-dimension-input-left').val(value.left || '');
                    }

                    // Update unit
                    if (typeof value.unit !== 'undefined') {
                        $unitSelect.val(value.unit || 'px');
                    }

                    // Update linked state
                    if (typeof value.linked === 'boolean') {
                        isLinked = value.linked;
                        $toggle.toggleClass('active', isLinked);
                        $toggle.attr('data-linked', isLinked);
                        var $label = $container.find('.zoom-dimension-toggle-label');
                        $label.text(isLinked ? 'Linked' : 'Unlinked');
                    }
                }
            });
        }
    });

})(wp, jQuery, WPZOOM_Controls);

/**
 * Customizer settings search.
 *
 * Adds a search field under the "You are customizing" header. The index is
 * built from the live Customizer API (every registered control with a label,
 * its section and panel), so it covers theme, core and plugin settings without
 * configuration. Selecting a result focuses the control — the Customizer
 * expands its panel/section and scrolls to it. "/" focuses the field.
 */
(function (wp, $, WPZOOM_Controls) {
    'use strict';

    if (!wp || !wp.customize) { return; }

    var api = wp.customize;
    var l10n = (WPZOOM_Controls && WPZOOM_Controls.l10n) || {};
    var MAX_RESULTS = 15;

    function t(key, fallback) { return l10n[key] || fallback; }
    function strip(html) { return $.trim($('<div>').html(html || '').text()).replace(/\s+/g, ' '); }
    function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]; }); }
    function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    api.bind('ready', function () {
        var $info = $('#customize-info');
        if (!$info.length || $('.wpz-customizer-search').length) { return; }

        var $box = $(
            '<div class="wpz-customizer-search" role="search">' +
                '<label for="wpz-customizer-search-input" class="screen-reader-text">' + escapeHtml(t('search_label', 'Search settings')) + '</label>' +
                '<svg class="wpz-customizer-search__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
                '<input type="search" id="wpz-customizer-search-input" class="wpz-customizer-search__input" placeholder="' + escapeHtml(t('search_placeholder', 'Search settings…')) + '" autocomplete="off" spellcheck="false" aria-autocomplete="list" aria-controls="wpz-customizer-search-results" aria-expanded="false" />' +
                '<kbd class="wpz-customizer-search__hint" aria-hidden="true">/</kbd>' +
                '<button type="button" class="wpz-customizer-search__clear" aria-label="' + escapeHtml(t('search_clear', 'Clear search')) + '" hidden><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
            '</div>'
        );
        var $results = $('<ul id="wpz-customizer-search-results" class="wpz-customizer-search__results" role="listbox" hidden></ul>');

        $info.after($box);
        $box.after($results);

        var $input = $box.find('.wpz-customizer-search__input');
        var $clear = $box.find('.wpz-customizer-search__clear');
        var index = [];
        var dirty = true;
        var results = [];
        var hiddenInactive = 0;
        var activeIndex = -1;
        var timer = null;

        // Rebuild lazily whenever controls are added (widgets, menus, plugins).
        api.control.bind('add', function () { dirty = true; });
        api.control.bind('remove', function () { dirty = true; });

        function build() {
            index = [];
            api.control.each(function (control) {
                var params = control.params || {};
                var label = strip(params.label);
                if (!label) { return; }

                var sectionId = typeof control.section === 'function' ? control.section() : params.section;
                var section = sectionId ? api.section(sectionId) : null;
                if (!section) { return; }
                // Dynamic menu/widget controls carry generic labels — leave them out.
                if (/^(nav_menu|sidebar-widgets-|add_menu|new_menu|menu_locations)/.test(sectionId)) { return; }

                var panelId = typeof section.panel === 'function' ? section.panel() : section.params.panel;
                var panel = panelId ? api.panel(panelId) : null;
                var sectionTitle = strip(section.params.title);
                var panelTitle = panel ? strip(panel.params.title) : '';
                var desc = strip(params.description);
                var path = [panelTitle, sectionTitle].filter(Boolean);

                index.push({
                    id: control.id,
                    control: control,
                    section: section,
                    panel: panel,
                    label: label,
                    desc: desc,
                    path: path,
                    labelLc: label.toLowerCase(),
                    descLc: desc.toLowerCase(),
                    idLc: String(control.id).toLowerCase().replace(/[_\-\[\]]+/g, ' '),
                    pathLc: path.join(' ').toLowerCase()
                });
            });

            // Theme Options rows (localized by PHP) open the options page in a new tab, focused on the row.
            var options = (WPZOOM_Controls && $.isArray(WPZOOM_Controls.themeOptionsIndex)) ? WPZOOM_Controls.themeOptionsIndex : [];
            var optionsLabel = t('theme_options', 'Theme Options');
            options.forEach(function (o) {
                if (!o.label) { return; }
                var path = [optionsLabel, o.section, o.sub].filter(Boolean);
                index.push({
                    id: 'wpz-option:' + o.id,
                    control: null,
                    external: true,
                    url: o.url,
                    label: o.label,
                    desc: o.desc || '',
                    path: path,
                    labelLc: o.label.toLowerCase(),
                    descLc: (o.desc || '').toLowerCase(),
                    idLc: String(o.id).toLowerCase().replace(/[_\-]+/g, ' '),
                    pathLc: path.join(' ').toLowerCase()
                });
            });
            dirty = false;
        }

        // The Customizer only shows a control when it, its section and its panel are
        // active (e.g. Header Builder sections stay inactive until the builder is enabled).
        function isActive(x) { return !x || typeof x.active !== 'function' || x.active(); }
        function isShown(item) { return item.external || (isActive(item.control) && isActive(item.section) && isActive(item.panel)); }

        function tokenize(query) {
            return $.trim(query.toLowerCase()).replace(/[&<>"']/g, ' ').split(/\s+/).filter(function (x) { return x.length; });
        }

        function scoreItem(item, tokens) {
            var score = 0;
            for (var i = 0; i < tokens.length; i++) {
                var tok = tokens[i], s = 0;
                if (item.labelLc.indexOf(tok) !== -1) {
                    s = new RegExp('(^|\\s)' + escapeRegExp(tok)).test(item.labelLc) ? 10 : 6;
                } else if (item.pathLc.indexOf(tok) !== -1) {
                    s = 4;
                } else if (item.idLc.indexOf(tok) !== -1) {
                    s = 3;
                } else if (item.descLc.indexOf(tok) !== -1) {
                    s = 1;
                }
                if (!s) { return 0; }
                score += s;
            }
            // On equal relevance, Customizer controls rank above Theme Options rows.
            return item.external ? score - 0.5 : score;
        }

        function highlight(text, tokens) {
            var html = escapeHtml(text);
            if (!tokens.length) { return html; }
            return html.replace(new RegExp('(' + tokens.map(escapeRegExp).join('|') + ')', 'gi'), '<mark>$1</mark>');
        }

        function snippet(desc, tokens) {
            if (!desc) { return ''; }
            var lc = desc.toLowerCase(), pos = -1;
            for (var i = 0; i < tokens.length; i++) { pos = lc.indexOf(tokens[i]); if (pos !== -1) { break; } }
            var start = Math.max(0, pos - 30);
            return highlight((start > 0 ? '…' : '') + desc.substr(start, 90) + (desc.length > start + 90 ? '…' : ''), tokens);
        }

        function setActive(i) {
            activeIndex = i;
            var $items = $results.children('.wpz-customizer-search__item');
            $items.removeClass('is-active').attr('aria-selected', 'false');
            if (i < 0) { $input.removeAttr('aria-activedescendant'); return; }
            var $item = $items.eq(i).addClass('is-active').attr('aria-selected', 'true');
            $input.attr('aria-activedescendant', $item.attr('id'));
            if ($item.length) { $item[0].scrollIntoView({ block: 'nearest' }); }
        }

        function render(query, tokens) {
            var html = '';
            if (!results.length) {
                html = '<li class="wpz-customizer-search__empty">' + escapeHtml(t('search_no_results', 'No settings match')) + ' “' + escapeHtml(query) + '”</li>';
            } else {
                var opens = t('search_opens_options', 'Opens in Theme Options (new tab)');
                results.forEach(function (item, i) {
                    html += '<li class="wpz-customizer-search__item' + (item.external ? ' wpz-customizer-search__item--external' : '') + '" role="option" id="wpz-customizer-search-item-' + i + '" data-index="' + i + '" aria-selected="false"' + (item.external ? ' title="' + escapeHtml(opens) + '"' : '') + '>' +
                        (item.external ? '<svg class="wpz-customizer-search__ext" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>' : '') +
                        (item.path.length ? '<span class="wpz-customizer-search__path">' + item.path.map(escapeHtml).join(' › ') + '</span>' : '') +
                        '<span class="wpz-customizer-search__label">' + highlight(item.label, tokens) + '</span>' +
                        (item.desc ? '<span class="wpz-customizer-search__desc">' + snippet(item.desc, tokens) + '</span>' : '') +
                    '</li>';
                });
            }
            if (hiddenInactive > 0) {
                html += '<li class="wpz-customizer-search__note">' + escapeHtml(t('search_hidden_inactive', '%d more matching settings are hidden until their feature is enabled').replace('%d', hiddenInactive)) + '</li>';
            }
            $results.html(html).prop('hidden', false);
            $input.attr('aria-expanded', 'true');
            $('body').addClass('wpz-customizer-searching');
            setActive(-1);
        }

        function close() {
            $results.prop('hidden', true).empty();
            $input.attr('aria-expanded', 'false');
            $('body').removeClass('wpz-customizer-searching');
            setActive(-1);
        }

        function search() {
            var query = $input.val();
            var tokens = tokenize(query);
            $box.toggleClass('has-value', query.length > 0);
            $clear.prop('hidden', query.length === 0);

            if (!tokens.length || query.length < 2) {
                results = [];
                close();
                return;
            }

            if (dirty) { build(); }

            hiddenInactive = 0;
            results = index
                .map(function (item) { return { item: item, score: scoreItem(item, tokens) }; })
                .filter(function (r) { return r.score > 0; })
                .filter(function (r) { if (isShown(r.item)) { return true; } hiddenInactive++; return false; })
                .sort(function (a, b) { return b.score - a.score; })
                .slice(0, MAX_RESULTS)
                .map(function (r) { return r.item; });

            render(query, tokens);
        }

        function clear(refocus) {
            clearTimeout(timer);
            $input.val('');
            search();
            if (refocus) { $input.trigger('focus'); } else { $input.trigger('blur'); }
        }

        function goTo(item) {
            if (item.external) {
                close();
                $input.trigger('blur');
                window.open(item.url, '_blank', 'noopener');
                return;
            }
            var control = api.control(item.id);
            if (!control) { return; }
            close();
            $input.trigger('blur');
            control.focus();
        }

        $input.on('input search', function () {
            clearTimeout(timer);
            timer = setTimeout(search, 60);
        });

        $input.on('focus', function () {
            if ($input.val().length >= 2 && $results.prop('hidden')) { search(); }
        });

        $input.on('keydown', function (e) {
            var n = results.length;
            if (e.key === 'ArrowDown' && n) {
                e.preventDefault();
                setActive((activeIndex + 1) % n);
            } else if (e.key === 'ArrowUp' && n) {
                e.preventDefault();
                setActive((activeIndex - 1 + n) % n);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (n) { goTo(results[activeIndex < 0 ? 0 : activeIndex]); }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                if (!$results.prop('hidden')) { close(); } else { clear(false); }
            }
        });

        $clear.on('click', function (e) {
            e.preventDefault();
            clear(true);
        });

        $results.on('mousedown', '.wpz-customizer-search__item', function (e) {
            e.preventDefault();
            goTo(results[parseInt($(this).attr('data-index'), 10)]);
        });

        $results.on('mousemove', '.wpz-customizer-search__item', function () {
            var i = parseInt($(this).attr('data-index'), 10);
            if (i !== activeIndex) { setActive(i); }
        });

        // "/" focuses the search unless the user is typing in a field.
        $(document).on('keydown', function (e) {
            var tag = (e.target.tagName || '').toLowerCase();
            var typing = tag === 'input' || tag === 'select' || tag === 'textarea' || e.target.isContentEditable;
            if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
                e.preventDefault();
                $input.trigger('focus').trigger('select');
            }
        });
    });
})(wp, jQuery, window.WPZOOM_Controls);
