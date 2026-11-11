/**
 * AJAX Request Queue
 *
 * - add()
 * - remove()
 * - run()
 * - stop()
 *
 * @since 2.0.0
 */
const WPZOOM_Demo_Importer_Ajax_Queue = (function () {

	let requests = [];

	return {

		/**
		 * Add AJAX request
		 *
		 * @since 2.0.0
		 */
		add: function (opt) {
			requests.push(opt);
		},

		/**
		 * Remove AJAX request
		 *
		 * @since 2.0.0
		 */
		remove: function (opt) {
			if (jQuery.inArray(opt, requests) > -1) {
				requests.splice($.inArray(opt, requests), 1);
			}
		},

		/**
		 * Run / Process AJAX request
		 *
		 * @since 2.0.0
		 */
		run: function () {
			const self = this;
			let oriSuc;


			if (requests.length) {
				oriSuc = requests[0].complete;

				requests[0].complete = function () {
					if (typeof (oriSuc) === 'function') oriSuc();
					requests.shift();
					self.run.apply(self, []);
				};

				jQuery.ajax(requests[0]);
			} else {
				self.tid = setTimeout(function () {
					self.run.apply(self, []);
				}, 1000);
			}

		},

		/**
		 * Stop AJAX request
		 *
		 * @since 2.0.0
		 */
		stop: function () {
			requests = [];
			clearTimeout(this.tid);
		},

		/**
		 * Debugging.
		 *
		 * @param  {mixed} data Mixed data.
		 */
		_log: function (data, level) {
			const date = new Date();
			const time = date.toLocaleTimeString();

			if (typeof data == 'object') {
				console.log(data);
			} else {
				console.log(data + ' ' + time);
			}
		},
	};

}());

(function ($, _) {
    const WPZOOM_SSE_Import = {
        complete: {
            posts: 0,
            pages: 0,
            media: 0,
            portfolios: 0,
            nav_menu_items: 0,
            users: 0,
            comments: 0,
            terms: 0,
            other: 0
        },

        updateDelta: function (type, delta) {
            this.complete[type] += delta;

            var self = this;
            requestAnimationFrame(function () {
                self.render();
            });
        },

        updateProgress: function (type, complete, total, label = '', logTitle = true) {
            var text = complete + "/" + total;
            label = label || wpzoomDemoImporterVars.labels.progress_imported;

            if ("undefined" !== type && "undefined" !== text) {
                total = parseInt(total, 10);
                if (0 === total || isNaN(total)) {
                    total = 1;
                }

                var percent = parseInt(complete, 10) / total;
                var progress = Math.round(percent * 100) + "%";
                var progress_bar = percent * 100;

                if (progress_bar <= 100) {
                    const $el = $(document).find(`.wpzoom-demo-import-process-wrap[data-import-type="${type}"]`);
                    if ($el) {
                        $el.find('progress-ring').attr("progress", progress_bar);
                        $el.find('span').html(`${complete}/${total}`);

                        if ( 100 === progress_bar ) {
                            $el.addClass('process-status_active');
                        }

                        if (
                            $(document).find(".wpz-onboard_demo-import-percent").length
                        ) {
                            $(".wpz-onboard_demo-import-percent")
                                .attr('data-progress-loading', progress)
                                .find("dfn > span")
                                .html(progress);
                            $(".wpz-onboard_demo-import-progress-bar-fill").css('width', progress);
                        } else {
                            $(".wpz-onboard_demo-import-modal-footer").prepend(
                                `<div class="wpz-onboard_demo-import-progress-bar"><div class="wpz-onboard_demo-import-progress-bar-fill" style="width: ${progress}"></div></div>`
                            );
                            $(".wpz-onboard_demo-import-start").before(
                                `<p class="wpz-onboard_demo-import-percent" data-progress-loading="${progress}"><dfn>${label} <span>${progress}</span></dfn><span class="wpz-onboard_dot-elastic"></span></p>`
                            );
                        }
                    }
                    if ( logTitle ) {
                        window.demoImporter._log_title(`${wpzoomDemoImporterVars.labels.importing}:`, false);
                    }
                }
            }
        },

        render: function () {
            let types = this.data.sort.reverse(); // Reverse sortable array because of append.
            let complete = 0;
            let total = 0;

            for (let i = types.length - 1; i >= 0; i--) {
                let type = types[i];
                let typeName = this.capitalizeFirstLetter(type);

                if ( undefined === this.data.count[type] ) {
                    continue;
                }
                
                this.updateProgress(
                    type,
                    this.complete[type],
                    this.data.count[type]
                );

                complete += this.complete[type];
                total += this.data.count[type];

                if ( ! $(document).find(`.wpzoom-demo-import-process-wrap[data-import-type="${type}"]`).length ) {
                    $(".current-importing-status-wrap")
                        .append(
                            `<div class="wpzoom-demo-import-process-wrap" data-import-type="${type}"><progress-ring class="wpzoom-demo-import-process" stroke="4" radius="18" progress="0"></progress-ring><div class="wpzoom-demo-import-process-type-count"><h3>${typeName}</h3> - <span>${this.complete[type]}/${this.data.count[type]}</span></div></div>`
                        );       
                }
            }

            this.updateProgress("total", complete, total);
        },

        renderRegenerateAttachments: function (type, complete, total) {
            const typeName = this.capitalizeFirstLetter(type);
            this.updateProgress(
                type,
                complete,
                total,
                wpzoomDemoImporterVars.labels.progress_regenerated,
                false
            );

            if ( ! $(document).find(`.wpzoom-demo-import-process-wrap[data-import-type="${type}"]`).length ) {
                $(".current-importing-status-wrap")
                    .append(
                        `<div class="wpzoom-demo-import-process-wrap" data-import-type="${type}"><progress-ring class="wpzoom-demo-import-process" stroke="4" radius="18" progress="0"></progress-ring><div class="wpzoom-demo-import-process-type-count"><h3>${typeName}</h3> - <span>${complete}/${total}</span></div></div>`
                    );       
            }
        },

        capitalizeFirstLetter: function(string) {
            string = string.replace(/_/g, ' ');
            return string.charAt(0).toUpperCase() + string.slice(1);
        }
    };

    /**
     * Create custom web component for progress ring
     */
    class WPZOOM_Progress_Ring extends HTMLElement {
        constructor() {
            super();
            const stroke = this.getAttribute("stroke");
            const radius = this.getAttribute("radius");
            const normalizedRadius = radius - stroke * 2;
            this._circumference = normalizedRadius * 2 * Math.PI;

            this._root = this.attachShadow({ mode: "open" });
            this._root.innerHTML = `
            <svg
                height="${radius * 2}"
                width="${radius * 2}"
             >
                <circle
                    class="wpz-onboard_demo-progress-circle"
                    stroke="#22BB66"
                    stroke-dasharray="${this._circumference} ${this._circumference}"
                    style="stroke-dashoffset:${this._circumference}"
                    stroke-width="${stroke}"
                    fill="transparent"
                    r="${normalizedRadius}"
                    cx="${radius}"
                    cy="${radius}"
                />
                <circle
                    class="wpz-onboard_demo-progress-circle-full"
                    stroke="#22BB66"
                    style="stroke-dashoffset:0"
                    stroke-width="${stroke}"
                    fill="transparent"
                    r="${normalizedRadius}"
                    cx="${radius}"
                    cy="${radius}"
                />
            </svg>
      
            <style>
                circle {
                    transition: stroke-dashoffset 0.35s;
                    transform: rotate(-90deg);
                    transform-origin: 50% 50%;
                }
                .wpz-onboard_demo-progress-circle-full {
                    opacity: 0.2;
                }
            </style>
          `;
        }

        setProgress(percent) {
            const offset =
                this._circumference - (percent / 100) * this._circumference;
            const circle = this._root.querySelector("circle");
            circle.style.strokeDashoffset = offset;
        }

        static get observedAttributes() {
            return ["progress"];
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (name === "progress") {
                this.setProgress(newValue);
            }
        }
    }

    class WPZOOM_Demo_Importer {
        constructor() {
            this.init = this.init.bind(this);
            
            // The Demo Importer tab is a stepper that hides non-current steps, so the modal must live
            // outside the steps. Everything this class looks up is inside the tab container anyway.
            this.wrapper = $(".wpz-onboard_content-main-demo-importer");
            if ( ! this.wrapper.length ) {
                this.wrapper = $("#step-import-demo");
            }
            this.templateData = {
                name: "",
                wxr_type: "",
                wxr_url: "",
            };
            this.actionPrefix = '';
            this.triggerPrefix = 'wpzoom-demo-trigger';
            this.wxrURL = '';
            this.wpformsURL = '';
            this.actionType = 'prepare-xml';
            this.backupTaken = false;
            this.isModalOpen = false;
            this.stylesOnlyMode = false;
            this.demoImportStatus = false;
            this.importContent = true;
            this.stylesOnlyMode = false;
            this.deleteContent = false;
            this.targetEl = undefined;
            this.widgetsData = '';
            this.customizerData = '';
            this.templateOptionsData = '';
            this.attachments = [];
            this.featured_images = [];
            this.processed_attachments = {};
            this.processed_elementor_pages = [];
            this.xhrPool = []; // a list (pool) of request.

            this.reset_remaining_posts = 0;
            this.reset_remaining_wp_forms = 0;
            this.reset_remaining_terms = 0;
            this.reset_processed_posts = 0;
            this.reset_processed_wp_forms = 0;
            this.reset_processed_terms = 0;
            this.imported_data = null;
        }

        init() {
            this._bind();
        }

        _abortAllRequests() {
            const self = this;
            $(self.xhrPool).each(function(i, jqXHR) {   // cycle through list of recorded connection.
                jqXHR.abort();  // aborts connection.
                self.xhrPool.splice(i, 1); // removes from list by index.
            });
            WPZOOM_Demo_Importer_Ajax_Queue.requests = [];
        }

        _bind() {
            // Prepare XML data.
            $(document).on(
                "click",
                ".wpz-onboard_import-button",
                this._startPrepareXML
            );

            // Start import process.
            $(document).on(
                "click",
                ".wpz-onboard_demo-import-start",
                this._startDemoImport
            );

            // Start styles-only import process.
            $(document).on(
                "click",
                ".wpz-onboard_import-styles-only-button",
                this._startStylesOnlyImport
            );

            // Start delete imported demo content process.
            $(document).on(
                "click",
                ".wpz-onboard_demo-import-delete",
                this._startDeleteImportedDemoContent
            );

            $(document).on('click', '.delete-imported-demo-content', this._startPrepareDeleteDemoContent);

            // Close modal.
            $(document).on(
                "click",
                ".wpz-onboard_demo-import-cancel, .wpz-onboard_demo-import-close, .wpz-onboard_demo-import-close-modal",
                this.closeModal
            );
            $(document).on("click", ".wpz-onboard_demo-import-modal", (e) => {
                if (!$(e.target).closest(".inner-demo-import-modal").length) {
                    this.closeModal(e);
                }
            });
            $(document).keydown((e) => {
                // ESCAPE key pressed
                if (e.keyCode == 27) {
                    this.closeModal(e);
                }
            });

            // Toggle advanced settings.
            $(document).on(
                "click",
                ".demo-import-advanced-settings-item",
                this.toggleAdvancedSettings
            );

            // Tooltip.
            $(document).on('mouseover mouseout', 'span[data-toggle-tooltip]', this.toggleTooltip);

            // Run events one by one.
            $(document).on(`${this.triggerPrefix}-reset-data`, this._backupBeforeRestOptions);
			$(document).on(`${this.triggerPrefix}-backup-settings-before-reset-done`, this._reset_customizer_data);
			$(document).on(`${this.triggerPrefix}-reset-customizer-data-done`, this._reset_template_options);
			$(document).on(`${this.triggerPrefix}-reset-template-options-done`, this._reset_widgets_data);
			$(document).on(`${this.triggerPrefix}-reset-widgets-data-done`, this._reset_terms);
			$(document).on(`${this.triggerPrefix}-delete-terms-done`, this._reset_wp_forms);
			$(document).on(`${this.triggerPrefix}-delete-wp-forms-done`, this._reset_posts);

            $(document).on(`${this.triggerPrefix}-before-import-xml-done`, this.importXML);
			$(document).on(`${this.triggerPrefix}-reset-data-done`, this._recheckBackupOptions);
			$(document).on(`${this.triggerPrefix}-backup-settings-done`, this._startPrepareTemplateOptions);
			$(document).on(`${this.triggerPrefix}-prepare-template-options-done`, this.importWPForms);
			$(document).on(`${this.triggerPrefix}-import-wpforms-done`, this.importCustomizerSettings);
			$(document).on(`${this.triggerPrefix}-import-customizer-settings-done`, this.importStart);
			$(document).on(`${this.triggerPrefix}-import-xml-done`, this.importTemplateOptions);
			$(document).on(`${this.triggerPrefix}-import-options-done`, this.importWidgets);
            $(document).on(`${this.triggerPrefix}-import-widgets-done`, this.deleteWPDefaultPosts);
            $(document).on(`${this.triggerPrefix}-delete-wp-default-posts-done`, this._beforeElementorBatchProcess);
            $(document).on(`${this.triggerPrefix}-before-elementor-batch-process-done`, this.elementorBatchProcess);
			$(document).on(`${this.triggerPrefix}-elementor-batch-process-done`, this.regenerateAttachments);
            $(document).on(`${this.triggerPrefix}-regenerate-attachments-done`, this._importEnd);
			$(document).on(`${this.triggerPrefix}-import-done`, this.installChildTheme);
			$(document).on(`${this.triggerPrefix}-install-child-theme-done`, this._demoImportSuccessfully);
        }

        _is_reset_data() {
			// Dedicated delete flow: user clicked the X icon on a design card,
			// not the "Delete previously imported demo" checkbox during import.
			// Intent is unambiguous, so always run the deletion chain.
			if ('delete-imported-demo-content' === this.actionType) {
				return true;
			}
			if ($(document).find('#wpzoom-demo-importer_delete-imported-demo input[type="checkbox"]').is(':checked')) {
				return true;
			}
			return false;
		}

		_is_process_customizer() {
			if ($(document).find('#wpzoom-demo-importer_import-customizer-settings input[type="checkbox"]').is(':checked')) {
				return true;
			}
			return false;
		}

		_is_process_template_options() {
			if ($(document).find('#wpzoom-demo-importer_import-template-options input[type="checkbox"]').is(':checked')) {
				return true;
			}
			return false;
		}

		_is_process_widgets() {
			if ($(document).find('#wpzoom-demo-importer_import-widgets input[type="checkbox"]').is(':checked')) {
				return true;
			}
			return false;
		}

		_is_process_wp_defaults() {
			if ($(document).find('#wpzoom-demo-importer_delete-wp-defaults input[type="checkbox"]').is(':checked')) {
				return true;
			}
			return false;
		}

		_is_process_elementor_pages() {
			if ($(document).find('#wpzoom-demo-importer_elementor-batch-process input[type="checkbox"]').is(':checked')) {
				return true;
			}
			return false;
		}

		_is_process_regenerate_attachments() {
			if ($(document).find('#wpzoom-demo-importer_regenerate-thumbnails input[type="checkbox"]').is(':checked')) {
				return true;
			}
			return false;
		}

		_is_process_regenerate_featured_images() {
			if ($(document).find('#wpzoom-demo-importer_regenerate-featured input[type="checkbox"]').is(':checked')) {
				return true;
			}
			return false;
		}

		_is_process_install_child_theme() {
			if ($(document).find('#wpzoom-demo-importer_install-child-theme input[type="checkbox"]').is(':checked')) {
				return true;
			}
			return false;
		}

		_is_process_activate_child_theme() {
			if ($(document).find('#wpzoom-demo-importer_activate-child-theme input[type="checkbox"]').is(':checked')) {
				return true;
			}
			return false;
		}

        /**
		 * Debugging.
		 *
		 * @param  {mixed} data Mixed data.
		 */
		_log = (data, level) => {
			var date = new Date();
			var time = date.toLocaleTimeString();

			switch (level) {
				case 'emergency':
				case 'critical':
				case 'alert':
				case 'error':
					if (typeof data == 'object') {
						console.error(data);
					} else {
						console.error(data + ' ' + time);
					}
					break;
				case 'warning':
				case 'notice':
					if (typeof data == 'object') {
						console.warn(data);
					} else {
						console.warn(data + ' ' + time);
					}
					break;
				default:
					if (typeof data == 'object') {
						console.log(data);
					} else {
						console.log(data + ' ' + time);
					}
					break;
			}
		}

        _log_title = (data, append, tag = '') => {
            let markup = data;
            if (typeof data == "object") {
                markup = JSON.stringify(data);
            }

            // Wrap in provided tag.
            if ( tag !== '' ) {
                markup = `<${tag}>${markup}</${tag}>`;
            }

            let selector = $(".current-importing-status-wrap");
            if ($(".current-importing-status-title").length) {
                selector = $(".current-importing-status-title");
            }

            if (append) {
                selector.append(markup);
            } else {
                selector.html(markup);
            }
        }

        _failed = ( errMessage, titleMessage ) => {

			var link = wpzoomDemoImporterVars.labels.process_failed_secondary;
				link = link.replace( '#DEMO_URL#', this.templateData['demo-url'] );
				link = link.replace( '#SUBJECT#', encodeURI('AJAX failed: ' + errMessage ) );

			this._importFailMessage( errMessage, titleMessage, '', wpzoomDemoImporterVars.labels.process_failed_primary, link);

		}

		_importFailMessage = (message, heading, jqXHR, topContent, bottomContent) => {

			heading = heading || 'The import process interrupted';

			var status_code = '';
			if (jqXHR) {
				status_code = jqXHR.status ? parseInt(jqXHR.status) : '';
			}

			if (200 == status_code && wpzoomDemoImporterVars.debug) {
				var output = wpzoomDemoImporterVars.labels.import_failed_message_due_to_debug;

			} else {
				var output = topContent || wpzoomDemoImporterVars.labels.import_failed_message;

				if (message) {
					output += '<div class="current-importing-status">Error: ' + message + '</div>';
				}

				output += bottomContent || '';
			}

			$('.current-importing-status-wrap').html(output);

            if ( $('.wpz-onboard_demo-import-percent').length ) {
                $('.wpz-onboard_demo-import-percent').html(heading);
            } else {
                $('.current-importing-status-wrap').prepend(`<h3>${heading}</h3>`)
            }

			$('.wpz-onboard_demo-import-start').removeClass('button-primary').addClass('disabled').text(wpzoomDemoImporterVars.labels.import_failed);
		}

		_importInterruptedMessage = () => {
			const heading = wpzoomDemoImporterVars.labels.import_interrupted;
			const message = wpzoomDemoImporterVars.labels.import_interrupted_message;
			const retryButton = `<button type="button" class="button button-primary wpz-onboard_demo-import-retry" style="margin-top: 15px;">${wpzoomDemoImporterVars.labels.import_retry_button}</button>`;
			
			const output = message + retryButton;
			
			$('.current-importing-status-wrap').html(output);
			
			if ( $('.wpz-onboard_demo-import-percent').length ) {
				$('.wpz-onboard_demo-import-percent').html(heading);
			} else {
				$('.current-importing-status-wrap').prepend(`<h3>${heading}</h3>`)
			}

			// Add click handler for retry button
			$('.wpz-onboard_demo-import-retry').on('click', (e) => {
				e.preventDefault();
				// Close the current modal and reopen the initial import modal
				$(document).trigger(`${this.triggerPrefix}-close-modal`);
				// Trigger the original import button to reopen the modal with all settings
				$('.wpz-onboard_import-button').trigger('click');
			});
		}

		_resetImportState = () => {
			$('.wpz-onboard_demo-import-start').removeClass('disabled').addClass('button-primary').text(wpzoomDemoImporterVars.labels.start_importing);
			$('.current-importing-status-wrap').empty();
			if ( $('.wpz-onboard_demo-import-percent').length ) {
				$('.wpz-onboard_demo-import-percent').html('0%');
			}
		}

        _backupBeforeRestOptions = () => {
			this._backupOptions(`${this.triggerPrefix}-backup-settings-before-reset-done`);
			this.backupTaken = true;
		}

		_recheckBackupOptions = () => {
			this._backupOptions(`${this.triggerPrefix}-backup-settings-done`);
			this.backupTaken = true;
		}

		_backupOptions = (triggerName) => {
            const self = this;

			// Customizer backup is already taken then return.
			if (self.backupTaken) {
				$(document).trigger(triggerName);
			} else {

				$.ajax({
					url: ajaxurl,
					type: 'POST',
					data: {
						action: `${self.actionPrefix}-backup-settings`,
						_ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
					},
					beforeSend: function (jqXHR) {
						console.groupCollapsed('Processing Customizer Settings Backup');
						self._log_title('Processing Customizer Settings Backup..');
                        self.xhrPool.push(jqXHR); // add connection to list.
					},
				})
					.fail(function (jqXHR) {
						self._log(jqXHR);
						self._importFailMessage(jqXHR.status + ' ' + jqXHR.statusText, 'Backup Customizer Settings Failed!', jqXHR);
						console.groupEnd();
					})
                    .complete(function(jqXHR){
                        const connectionIndex = self.xhrPool.indexOf(jqXHR); // get index for current connection completed.
                        if ( connectionIndex > -1) {
                            self.xhrPool.splice(connectionIndex, 1); // removes from list by index.
                        }
                    })
					.done(function (data) {
						self._log(data);

						// 1. Pass - Import Customizer Options.
						self._log_title('Customizer Settings Backup Done..');

						console.groupEnd();
						// Custom trigger.
						$(document).trigger(triggerName);
					});
			}

		}

        _startPrepareXML = (event) => {
            event.preventDefault();
            this.targetEl = event.target;
            this._beforePrepareXML();
        }

        _startPrepareDeleteDemoContent = (event) => {
            event.preventDefault();

            this.targetEl = '.wpz-onboard_import-button';
            this.importContent = false; // We don't need to import content but only delete the imported previously one.
            this.deleteContent = true; // Flag that we're deleting content.
            this.actionType = 'delete-imported-demo-content';

            const $element = $(event.target);
            const wxrURL = $element.attr('data-wxr-url');
            const wxrType = $element.attr('data-wxr-type');
            const design = $element.attr('data-design');

            this.processTemplateOptions({
                'wxr_url': wxrURL,
                'wxr_type': wxrType,
                'design': design,
            });
            
            $(document).trigger(`${this.triggerPrefix}-before-import-xml-done`);
        }

        _beforePrepareXML = () => {
            const selectedDesign = this.wrapper
                .find('input[name="wpzoom-selected-design"]')
                .val();
            const wxrURL = this.wrapper
                .find('input[name="wpzoom-wxr-url"]')
                .val();
            const wxrType = this.wrapper
                .find('input[name="wpzoom-wxr-type"]')
                .val();

            this.processTemplateOptions({
                'wxr_url': wxrURL,
                'wxr_type': wxrType,
                'design': selectedDesign,
            });

            $(document).trigger(`${this.triggerPrefix}-before-import-xml-done`);
        }

        _beforeUnloadCallback = (e) => {
            e.preventDefault();
            e.returnValue = wpzoomDemoImporterVars.labels.on_leave_alert;
            return false;
        }

        _beforeCloseModalCallback = (e) => {
            if ( ! this.demoImportStatus && (this.importContent || this.deleteContent) && this.isModalOpen ) {
                if ( confirm( wpzoomDemoImporterVars.labels.on_leave_alert ) ) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return true;
            }
        }

        _startPrepareTemplateOptions = () => {
            const self = this;

            if ( self._is_process_widgets() || self._is_process_template_options() || self._is_process_customizer() || self.stylesOnlyMode ) {
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: `${self.actionPrefix}-prepare-template-options`,
                        _ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
                        design: self.templateData.name,
                        widgets: self._is_process_widgets(),
						customizer_settings: self.stylesOnlyMode || self._is_process_customizer(),
                        template_options: self._is_process_template_options(),
                    },
                    beforeSend: function (jqXHR) {
                        console.groupCollapsed('Preparing Template Options');
                        self.wrapper.find('.current-importing-status-description').html("");
                        self._log_title('Preparing Template Options..');
                        self.xhrPool.push(jqXHR); // add connection to list.
                    }
                })
                .fail(function (jqXHR) {
                    self._log(jqXHR);
                    self._importFailMessage( jqXHR.status + ' ' + jqXHR.statusText, '', jqXHR, wpzoomDemoImporterVars.labels.ajax_request_failed_primary, wpzoomDemoImporterVars.labels.ajax_request_failed_secondary );
                    console.groupEnd();
                })
                .complete(function(jqXHR){
                    const connectionIndex = self.xhrPool.indexOf(jqXHR); // get index for current connection completed.
                    if ( connectionIndex > -1) {
                        self.xhrPool.splice(connectionIndex, 1); // removes from list by index.
                    }
                })
                .done(function (response) {
                    console.log('Template Response:');
                    self._log(response);
                    console.groupEnd();
                    if (response.success) {
                        self.templateData = $.extend(self.templateData, response.data);
    
                        self.processTemplateOptions(self.templateData);

                        $(document).trigger(`${self.triggerPrefix}-prepare-template-options-done`);
                    } else {
                        self._importFailMessage( response.data, '', '', '<p>Failed to prepare template options and widgets data!</p>' );
                    }
                });
            } else {
                $(document).trigger(`${self.triggerPrefix}-prepare-template-options-done`);
            }
        }

        _startStylesOnlyImport = (event) => {
            event.preventDefault();

            // Respect disabled state (the button is an <a> tag, so check class/prop both).
            if ( $(event.currentTarget).hasClass('disabled') || $(event.currentTarget).prop('disabled') ) {
                return;
            }

            this.stylesOnlyMode = true;
            this.actionType = 'styles-only';

            // Populate template data from the card's hidden inputs (same as _beforePrepareXML).
            const selectedDesign = this.wrapper.find('input[name="wpzoom-selected-design"]').val();
            const wxrURL = this.wrapper.find('input[name="wpzoom-wxr-url"]').val();
            const wxrType = this.wrapper.find('input[name="wpzoom-wxr-type"]').val();
            this.processTemplateOptions({ wxr_url: wxrURL, wxr_type: wxrType, design: selectedDesign });

            this.openStylesOnlyModal();
        }

        openStylesOnlyModal = () => {
            const closeURL    = wpzoomDemoImporterVars.close_modal_url;
            const title       = wpzoomDemoImporterVars.labels.styles_only_modal_title || 'Import Styles Only';
            const cancelLabel = wpzoomDemoImporterVars.labels.cancel_importing         || 'Cancel';
            const startLabel  = wpzoomDemoImporterVars.labels.start_importing          || 'Start importing';
            const demoName    = this.wrapper.find('.wpz-onboard_selected-template strong').text() || this.templateData.name || '';

            const modal = `
                <div class="wpz-onboard_demo-import-modal wpz-styles-only-modal" data-xml-processing="no">
                    <div class="inner-demo-import-modal">
                        <div class="wpz-onboard_demo-import-modal-header">
                            <h3>${title}</h3>
                            <a href="${closeURL}" class="wpz-onboard_demo-import-close"></a>
                        </div>
                        <div class="wpz-onboard_demo-import-modal-content" style="min-width: 520px;">
                            <div class="wpz-onboard_demo-import-steps">
                                <p class="wpz-styles-only-intro">You&#8217;re about to import the styles from the <strong>${demoName}</strong> demo.</p>
                                <p class="wpz-styles-only-list-label">This will import:</p>
                                <ul class="wpz-styles-only-list">
                                    <li>Color palette &amp; background settings</li>
                                    <li>Typography &amp; font choices</li>
                                    <li>Layout &amp; spacing settings</li>
                                    <li>Custom CSS</li>
                                </ul>
                                <p class="wpz-styles-only-notice">Your existing posts, pages, and media will not be affected.</p>
                            </div>
                            <div class="wpz-onboard_demo-import-main-content">
                                <div class="current-importing-status-wrap">
                                    <div class="current-importing-status">
                                        <h3 class="current-importing-status-title"></h3>
                                        <p class="current-importing-status-description"></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="wpz-onboard_demo-import-modal-footer">
                            <button type="button" class="wpz-onboard_demo-import-cancel button button-secondary">${cancelLabel}</button>
                            <button type="submit" class="wpz-onboard_demo-import-start button button-primary">${startLabel}</button>
                        </div>
                    </div>
                </div>`;

            this.openModal(modal);
        }


        _startDemoImport = (event) => {
            event.preventDefault();
            const self = this;

            self.targetEl = event.target;
            const $element = $(self.targetEl);
            let xmlProcessing = self.wrapper.find('.wpz-onboard_demo-import-modal').attr('data-xml-processing');

            if ( 'yes' === xmlProcessing || ! self.importContent ) {
                return;
            }

            self.wrapper.find('.wpz-onboard_demo-import-modal').attr('data-xml-processing', 'yes');

            $element
                .attr("disabled", true)
                .text(`${wpzoomDemoImporterVars.labels.importing}...`);

			if (self._is_reset_data() && !self.stylesOnlyMode) {
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: `${self.actionPrefix}-set-reset-data`,
                        _ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
                    },
                    beforeSend: function () {
                        console.groupCollapsed('Site Reset Data');
                        self._log_title('Preparing data for deleting..');
                    },
                })
                    .done(function (response) {
                        console.log('List of Reset Items:');
                        self._log(response);
                        console.groupEnd();
                        if (response.success) {
                            self.imported_data = response.data;
                        }
                        $(document).trigger(`${self.triggerPrefix}-reset-data`);
                    });
			} else {
				$(document).trigger(`${self.triggerPrefix}-reset-data-done`);
			}
		}

        _startDeleteImportedDemoContent = (event) => {
            event.preventDefault();
            const self = this;

            self.targetEl = event.target;
            const $element = $(self.targetEl);
            let xmlProcessing = self.wrapper.find('.wpz-onboard_demo-import-modal').attr('data-xml-processing');

            if ( 'yes' === xmlProcessing || self.importContent ) {
                return;
            }

            self.wrapper.find('.wpz-onboard_demo-import-modal').attr('data-xml-processing', 'yes');

            $element
                .attr("disabled", true)
                .text(`${wpzoomDemoImporterVars.labels.deleting}...`);

			if (self._is_reset_data()) {
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: `${self.actionPrefix}-set-reset-data`,
                        _ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
                    },
                    beforeSend: function () {
                        console.groupCollapsed('Site Reset Data');
                        self._log_title('Preparing data for deleting..');
                    },
                })
                    .done(function (response) {
                        console.log('List of Reset Items:');
                        self._log(response);
                        console.groupEnd();
                        if (response.success) {
                            self.imported_data = response.data;
                        }
                        $(document).trigger(`${self.triggerPrefix}-reset-data`);
                    });
			} else {
				$(document).trigger(`${self.triggerPrefix}-reset-data-done`);
			}
		}

        _importEnd = () => {
            const self = this;

            if ( self.importContent ) {
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        action: `${self.actionPrefix}-import-end`,
                        _ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
                    },
                    beforeSend: function (jqXHR) {
                        console.groupCollapsed('Import Complete!');
                        const progressDone = self.wrapper.find('.wpz-onboard_demo-import-percent').attr('data-progress-loading');
                        if ( 100 === parseInt(progressDone) ) {
                            self._log_title(wpzoomDemoImporterVars.labels.all_done);
                        } else {
                            self._log_title('Import Complete, but with some problems!');
                        }
                        self.xhrPool.push(jqXHR); // add connection to list.
                    }
                })
                    .fail(function (jqXHR) {
                        self._log(jqXHR);
                        self._importFailMessage(jqXHR.status + ' ' + jqXHR.statusText, 'Import Complete Failed!', jqXHR);
                        console.groupEnd();
                    })
                    .complete(function(jqXHR){
                        const connectionIndex = self.xhrPool.indexOf(jqXHR); // get index for current connection completed.
                        if ( connectionIndex > -1) {
                            self.xhrPool.splice(connectionIndex, 1); // removes from list by index.
                        }
                    })
                    .done(function (response) {
                        self._log(response);
                        console.groupEnd();
    
                        // 5. Fail - Import Complete.
                        if (false === response.success) {
                            self._importFailMessage(response.data, 'Import Complete Failed!');
                        } else {
                            self.demoImportStatus = true;
                            $(document).trigger(`${self.triggerPrefix}-import-done`);
                        }
                    });

            } else {

                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        action: `${self.actionPrefix}-delete-end`,
                        _ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
                        data: self.templateData
                    },
                    beforeSend: function (jqXHR) {
                        console.groupCollapsed('Deleting completed!');
                        self._log_title('Deleting imported demo content completed!');
                        self.xhrPool.push(jqXHR); // add connection to list.
                    }
                })
                    .fail(function (jqXHR) {
                        self._log(jqXHR);
                        self._importFailMessage(jqXHR.status + ' ' + jqXHR.statusText, 'Delete Failed!', jqXHR);
                        console.groupEnd();
                    })
                    .complete(function(jqXHR){
                        const connectionIndex = self.xhrPool.indexOf(jqXHR); // get index for current connection completed.
                        if ( connectionIndex > -1) {
                            self.xhrPool.splice(connectionIndex, 1); // removes from list by index.
                        }
                    })
                    .done(function (response) {
                        self._log(response);
                        console.groupEnd();
    
                        // 5. Fail - Delete Complete.
                        if (false === response.success) {
                            self._importFailMessage(response.data, 'Delete Failed!');
                        } else {
                            self.demoImportStatus = true;
                            $(document).trigger(`${self.triggerPrefix}-import-done`);
                        }
                    });
            }
		}

        _demoImportSuccessfully = () => {
            const self = this;

            $(window).off('beforeunload', this._beforeUnloadCallback);
            this.deleteContent = false;
            this.stylesOnlyMode = false;
            
            self.wrapper.find('.wpz-onboard_demo-import-steps ol > li.active-step').addClass('process-status_active');
            self.wrapper.find('.wpz-onboard_demo-import-modal-footer, .wpz-onboard_demo-import-main-content').html('');
            self.wrapper.find('.wpz-onboard_demo-import-steps, .wpz-onboard_demo-import-advanced-settings').remove();
            this.wrapper.find('.wpz-onboard_demo-import-modal').attr('data-xml-processing', 'done');
            
            if ( 'prepare-xml' === self.actionType ) {

                self.wrapper.find('.wpz-onboard_demo-import-modal-header > h3').html(wpzoomDemoImporterVars.labels.successfully_configured);
                self.wrapper.find('.wpz-onboard_demo-import-modal-footer').append(wpzoomDemoImporterVars.finish_setup_button);
                self.wrapper.find('.wpz-onboard_demo-import-modal-footer').append('<div class="wpz-onboard_demo-import-buttons-group"></div>');
                self.wrapper.find('.wpz-onboard_demo-import-modal-footer .wpz-onboard_demo-import-buttons-group').append(wpzoomDemoImporterVars.customize_theme_button);
                self.wrapper.find('.wpz-onboard_demo-import-modal-footer .wpz-onboard_demo-import-buttons-group').append(wpzoomDemoImporterVars.view_site_button);
                self.wrapper.find('.wpz-onboard_demo-import-main-content').append(wpzoomDemoImporterVars.demo_import_successfully);

            } else if ( 'delete-imported-demo-content' === self.actionType ) {
                
                self.wrapper.find('.wpz-onboard_demo-import-modal-header > h3').html(wpzoomDemoImporterVars.labels.successfully_deleted);
                self.wrapper.find('.wpz-onboard_demo-import-modal-footer').append(wpzoomDemoImporterVars.close_button);
                self.wrapper.find('.wpz-onboard_demo-import-main-content').append(wpzoomDemoImporterVars.deleted_successfully);

            } else if ( 'styles-only' === self.actionType ) {

                self.wrapper.find('.wpz-onboard_demo-import-modal-header > h3').html(wpzoomDemoImporterVars.labels.styles_only_successfully);
                self.wrapper.find('.wpz-onboard_demo-import-modal-footer').append('<div class="wpz-onboard_demo-import-buttons-group"></div>');
                self.wrapper.find('.wpz-onboard_demo-import-modal-footer .wpz-onboard_demo-import-buttons-group').append(wpzoomDemoImporterVars.customize_theme_button);
                self.wrapper.find('.wpz-onboard_demo-import-modal-footer .wpz-onboard_demo-import-buttons-group').append(wpzoomDemoImporterVars.view_site_button);
                self.wrapper.find('.wpz-onboard_demo-import-main-content').append(wpzoomDemoImporterVars.styles_only_successfully_content);
            }
        }

        _reset_customizer_data = () => {
            const self = this;
            // Customizer data.
			$.ajax({
				url: ajaxurl,
				type: 'POST',
				data: {
					action: `${self.actionPrefix}-reset-customizer-data`,
					_ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
				},
				beforeSend: function () {
					console.groupCollapsed('Reseting Customizer Data');
					self._log_title('Reseting Customizer Data..');
				},
			})
				.fail(function (jqXHR) {
					self._log(jqXHR);
					self._importFailMessage(jqXHR.status + ' ' + jqXHR.statusText, 'Reset Customizer Settings Failed!', jqXHR);
					console.groupEnd();
				})
				.done(function (data) {
					self._log(data);
					self._log_title('Complete Resetting Customizer Data..');
					self._log('Complete Resetting Customizer Data..');
					console.groupEnd();
					$(document).trigger(`${self.triggerPrefix}-reset-customizer-data-done`);
				});
		}

		_reset_template_options = () => {
            const self = this;
			// Template Options.
			$.ajax({
				url: ajaxurl,
				type: 'POST',
				data: {
					action: `${self.actionPrefix}-reset-template-options`,
					_ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
				},
				beforeSend: function () {
					console.groupCollapsed('Reseting Template Options');
					self._log_title('Reseting Template Options..');
				},
			})
				.fail(function (jqXHR) {
					self._log(jqXHR);
					self._importFailMessage(jqXHR.status + ' ' + jqXHR.statusText, 'Reset Template Options Failed!', jqXHR);
					console.groupEnd();
				})
				.done(function (data) {
					self._log(data);
					self._log_title('Complete Reseting Template Options..');
					console.groupEnd();
					$(document).trigger(`${self.triggerPrefix}-reset-template-options-done`);
				});
		}

		_reset_widgets_data = () => {
            const self = this;
			// Widgets.
			$.ajax({
				url: ajaxurl,
				type: 'POST',
				data: {
					action: `${self.actionPrefix}-reset-widgets-data`,
					_ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
				},
				beforeSend: function () {
					console.groupCollapsed('Reseting Widgets');
					self._log_title('Reseting Widgets..');
				},
			})
				.fail(function (jqXHR) {
					self._log(jqXHR);
					self._importFailMessage(jqXHR.status + ' ' + jqXHR.statusText, 'Reset Widgets Data Failed!', jqXHR);
					console.groupEnd();
				})
				.done(function (data) {
					self._log(data);
					self._log_title('Complete Reseting Widgets..');
					console.groupEnd();
					$(document).trigger(`${self.triggerPrefix}-reset-widgets-data-done`);
				});
		}

		_reset_posts = () => {
            const self = this;

			if (self.imported_data['reset_posts'].length) {

				self.reset_remaining_posts = self.imported_data['reset_posts'].length;

				console.groupCollapsed('Deleting Posts');
				self._log_title('Deleting Posts..');

				$.each(self.imported_data['reset_posts'], function (index, post_id) {

					WPZOOM_Demo_Importer_Ajax_Queue.add({
						url: ajaxurl,
						type: 'POST',
						data: {
							action: `${self.actionPrefix}-delete-posts`,
							post_id: post_id,
							_ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
						},
						success: function (result) {

							if (self.reset_processed_posts < self.imported_data['reset_posts'].length) {
								self.reset_processed_posts += 1;
							}

							self._log_title('Deleting Post ' + self.reset_processed_posts + ' of ' + self.imported_data['reset_posts'].length);
							self._log('Deleting Post ' + self.reset_processed_posts + ' of ' + self.imported_data['reset_posts'].length + '<br/>' + result.data);
                            self.wrapper.find('.current-importing-status-description').html(result.data);

							self.reset_remaining_posts -= 1;
							if (0 == self.reset_remaining_posts) {
								console.groupEnd();
								$(document).trigger(`${self.triggerPrefix}-delete-posts-done`);
								$(document).trigger(`${self.triggerPrefix}-reset-data-done`);
							}
						}
					});
				});
				WPZOOM_Demo_Importer_Ajax_Queue.run();

			} else {
				$(document).trigger(`${self.triggerPrefix}-delete-posts-done`);
				$(document).trigger(`${self.triggerPrefix}-reset-data-done`);
			}
		}

		_reset_wp_forms = () => {
            const self = this;

			if (self.imported_data['reset_wp_forms'].length) {
				self.reset_remaining_wp_forms = self.imported_data['reset_wp_forms'].length;

				console.groupCollapsed('Deleting WP Forms');
				self._log_title('Deleting WP Forms..');

				$.each(self.imported_data['reset_wp_forms'], function (index, post_id) {
					WPZOOM_Demo_Importer_Ajax_Queue.add({
						url: ajaxurl,
						type: 'POST',
						data: {
							action: `${self.actionPrefix}-delete-wp-forms`,
							post_id: post_id,
							_ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
						},
						success: function (result) {

							if (self.reset_processed_wp_forms < self.imported_data['reset_wp_forms'].length) {
								self.reset_processed_wp_forms += 1;
							}

							self._log_title('Deleting Form ' + self.reset_processed_wp_forms + ' of ' + self.imported_data['reset_wp_forms'].length);
							self._log('Deleting Form ' + self.reset_processed_wp_forms + ' of ' + self.imported_data['reset_wp_forms'].length + '<br/>' + result.data);
							self.wrapper.find(".current-importing-status-description").html(result.data);

							self.reset_remaining_wp_forms -= 1;
							if (0 == self.reset_remaining_wp_forms) {
								console.groupEnd();
								$(document).trigger(`${self.triggerPrefix}-delete-wp-forms-done`);
							}
						}
					});
				});
				WPZOOM_Demo_Importer_Ajax_Queue.run();

			} else {
				$(document).trigger(`${self.triggerPrefix}-delete-wp-forms-done`);
			}
		}

		_reset_terms = () => {
            const self = this;

			if (self.imported_data['reset_terms'].length) {
				self.reset_remaining_terms = self.imported_data['reset_terms'].length;

				console.groupCollapsed('Deleting Terms');
				self._log_title('Deleting Terms..');

				$.each(self.imported_data['reset_terms'], function (index, term_id) {
					WPZOOM_Demo_Importer_Ajax_Queue.add({
						url: ajaxurl,
						type: 'POST',
						data: {
							action: `${self.actionPrefix}-delete-terms`,
							term_id: term_id,
							_ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
						},
						success: function (result) {
							if (self.reset_processed_terms < self.imported_data['reset_terms'].length) {
								self.reset_processed_terms += 1;
							}

							self._log_title('Deleting Term ' + self.reset_processed_terms + ' of ' + self.imported_data['reset_terms'].length);
							self._log('Deleting Term ' + self.reset_processed_terms + ' of ' + self.imported_data['reset_terms'].length + '<br/>' + result.data);
							self.wrapper.find(".current-importing-status-description").html(result.data);

							self.reset_remaining_terms -= 1;
							if (0 == self.reset_remaining_terms) {
								console.groupEnd();
								$(document).trigger(`${self.triggerPrefix}-delete-terms-done`);
							}
						}
					});
				});
				WPZOOM_Demo_Importer_Ajax_Queue.run();
			} else {
				$(document).trigger(`${self.triggerPrefix}-delete-terms-done`);
			}

		}

        processTemplateOptions = (data) => {
            this.actionPrefix = 'wpzoom-demo-importer';
            this.wxrURL = encodeURI(data['wxr_url']) || '';
            this.wpformsURL = encodeURI(data['wpforms_path']) || '';
            this.templateOptionsData = JSON.stringify(data['options_data']) || '';
            this.widgetsData = JSON.stringify(data['widgets_data']) || '';
			this.customizerData = encodeURI(data['customizer_data']) || '';

            if ( data['design'] ) {
                this.templateData = $.extend(this.templateData, {
                    name: data['design'],
                    wxr_url: this.wxrURL,
                    wxr_type: data['wxr_type']
                });
            }
        }

        processTemplateData = (design = "eccentric") => {
            const dfd = $.Deferred();
            const self = this;

            $.ajax({
                type: "POST",
                url: ajaxurl,
                data: {
                    action: 'wpzoom-demo-importer-process-template-data',
                    _ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
                    design,
                },
                beforeSend: function(jqXHR) {
                    self.xhrPool.push(jqXHR); // add connection to list.
                }
            })
            .complete(function(jqXHR){
                const connectionIndex = self.xhrPool.indexOf(jqXHR); // get index for current connection completed.
                if ( connectionIndex > -1) {
                    self.xhrPool.splice(connectionIndex, 1); // removes from list by index.
                }
            })
            .done((response) => {
                if (response.success) {
                    const data = response.data || {};

                    self.templateData = $.extend(self.templateData, data);

                    self.wrapper
                        .find('input[name="wpzoom-selected-design"]')
                        .val(self.templateData.name).trigger('change');
                    self.wrapper
                        .find('input[name="wpzoom-wxr-url"]')
                        .val(self.templateData.wxr_url).trigger('change');
                    self.wrapper
                        .find('input[name="wpzoom-wxr-type"]')
                        .val(self.templateData.wxr_type).trigger('change');

                    if ( '' === self.templateData.wxr_url && 'invalid' === self.templateData.wxr_type ) {
                        self.wrapper.find('.wpz-onboard_import-button').text(wpzoomDemoImporterVars.labels.invalid_xml_url).prop('disabled', true);
                    } else {
                        self.wrapper.find('.wpz-onboard_import-button').text(wpzoomDemoImporterVars.labels.import_demo_content).prop('disabled', false);
                    }
                    // Styles-only button depends on .dat file availability, not XML.
                    if ( data.has_dat_file ) {
                        self.wrapper.find('.wpz-onboard_import-styles-only-button').removeClass('disabled').prop('disabled', false);
                    } else {
                        self.wrapper.find('.wpz-onboard_import-styles-only-button').addClass('disabled').prop('disabled', true);
                    }

                    /**
                     * Open next pointer if they not dismissed.
                     */
                    if ( window.hasOwnProperty('wpzoomOnboardingTour') && wpzoomOnboardingTour.currentTarget ) {
                        const nextData = wpzoomOnboardingTour.getPointerBySelector('#step-import-demo #wpz-onboard-skip-notice');
                        const currentData = wpzoomOnboardingTour.getCurrentData();
                        wpzoomOnboardingTour.openNextPointer(currentData, nextData);
                    }
                }

                dfd.resolve(response);
            });

            return dfd.promise();
        }

        importXML = () => {
            const $element = $(this.targetEl);
            const self = this;

            $.ajax({
                type: "POST",
                url: ajaxurl,
                data: {
                    action: `${self.actionPrefix}-import-prepare-xml`,
                    _ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
                    wxr_url: self.wxrURL,
                    action_type: self.actionType,
                },
                beforeSend: function(jqXHR) {
                    console.groupCollapsed('Preparing content');
                    self._log_title('Preparing content...');
                    self._log(self.wxrURL);
                    $element
                        .attr("disabled", true)
                        .text(
                            wpzoomDemoImporterVars.labels.preparing_demo_content
                        );
                    $('#step-choose-design .imported-demo-content .button-select-template').text(wpzoomDemoImporterVars.labels.preparing_demo_content);
                        
                    self.xhrPool.push(jqXHR); // add connection to list.
                },
            })
            .fail(function (jqXHR) {
                self._log(jqXHR);
                self._importFailMessage(jqXHR.status + ' ' + jqXHR.statusText, wpzoomDemoImporterVars.labels.xml_prepare_import_failed, jqXHR);
                console.groupEnd();
                $element
                        .attr("disabled", false)
                        .text(wpzoomDemoImporterVars.labels.xml_prepare_import_failed);
                $('#step-choose-design .imported-demo-content .button-select-template').text(wpzoomDemoImporterVars.labels.xml_prepare_import_failed);
            })
            .complete(function(jqXHR){
                const connectionIndex = self.xhrPool.indexOf(jqXHR); // get index for current connection completed.
                if ( connectionIndex > -1) {
                    self.xhrPool.splice(connectionIndex, 1); // removes from list by index.
                }
            })
            .done((response) => {
                const data = response.data;
                const modal = data.modal || null;

                self._log(response);

                if (modal) {
                    $element
                        .attr("disabled", false)
                        .text(wpzoomDemoImporterVars.labels.load_demo_content);
                    $('#step-choose-design .imported-demo-content .button-select-template').text(wpzoomDemoImporterVars.labels.progress_imported);

                    $(document).trigger(`${self.triggerPrefix}-before-open-modal`);

                    self.openModal(modal);
                }

                // Fail - Prepare XML Data.
                if (false === response.success) {
                    self._importFailMessage(wpzoomDemoImporterVars.labels.xml_required_files_missing);
                    console.groupEnd();
                    $element
                        .attr("disabled", false)
                        .text(wpzoomDemoImporterVars.labels.xml_prepare_import_failed);

                    $element.after(`<p class="update-nag notice notice-error" style="display: block; margin-left: 0;">${data}</p>`);
                } else {
                    WPZOOM_SSE_Import.data = data;
                    $(document).trigger(`${self.triggerPrefix}-after-import-xml`);
                    console.groupEnd();
                }
            });
        };

        importStart = () => {
            const self = this;
            const $element = $(self.targetEl);

            if ( ! self.importContent || self.stylesOnlyMode ) {
                $(document).trigger(`${self.triggerPrefix}-import-xml-done`);
                return;
            }

            if (!WPZOOM_SSE_Import.data) {
                $element
                    .attr("disabled", true)
                    .text(wpzoomDemoImporterVars.labels.import_failed);
                return;
            }

            console.groupCollapsed('Start Import Process');

            // Import XML though Event Source.
            WPZOOM_SSE_Import.render();

            self.wrapper
                .find(".current-importing-status-description")
                .html("")
                .show();

            var evtSource = new EventSource(WPZOOM_SSE_Import.data.url);
            evtSource.onmessage = function (message) {
                var data = JSON.parse(message.data);
                switch (data.action) {
                    case "updateDelta":
                        WPZOOM_SSE_Import.updateDelta(data.type, data.delta);
                        break;

                    case "trackAttachments":
                        if ( "attachment" === data.type ) {
                            self.attachments.push(data.delta);
                        } else if ( "featured_image" === data.type ) {
                            self.featured_images.push(data.delta);
                        }
                        if ( data.processed_attachment ) {
                            self.processed_attachments[data.delta] = data.processed_attachment;
                        }

                        break;

                    case "complete":
                        if (false == data.error) {
                            evtSource.close();

                            $(".current-importing-status-description").hide();
                            $(".wpzoom-demo-import-process-wrap").attr('data-import-type-complete', 'true');

                            self.wrapper
                                .find('.wpzoom-demo-import-process-wrap[data-import-type-complete="true"]').each(function(){
                                    $(this).hide(300);
                                });

                            self.wrapper.find('.current-importing-status-wrap')
                                .append(`<div class="wpzoom-demo-import-process-wrap process-status_active"><progress-ring class="wpzoom-demo-import-process" stroke="4" radius="18" progress="100"></progress-ring><div class="wpzoom-demo-import-process-type-count"><h3>100% ${wpzoomDemoImporterVars.labels.import_content_done}</h3></div></div>`);

                            console.groupEnd();

                            $(document).trigger(`${self.triggerPrefix}-import-xml-done`);
                        } else {
                            evtSource.close();

                            $element.text(
                                wpzoomDemoImporterVars.labels.import_failed
                            );
                            self._importInterruptedMessage();
                        }

                        break;
                }
            };
            evtSource.onerror = function (error) {
                evtSource.close();
                console.log(error);
                $element.text(
                    wpzoomDemoImporterVars.labels.import_failed
                );
                self._importInterruptedMessage();
            };
            evtSource.onopen = function () {
                $(document).trigger(`${self.triggerPrefix}-before-import-xml`);
            };
            evtSource.addEventListener("log", function (message) {
                var data = JSON.parse(message.data);
                var message = data.message || "";
                if (message && ( "info" === data.level || "notice" === data.level || "warning" === data.level ) ) {
                    message = message.replace(/"/g, function (letter) {
                        return "";
                    });
                    $(".current-importing-status-description").attr('data-level', data.level).html(message);
                }
                self._log(message, data.level);
            });

            // Stop EventSource when modal is close.
            $(document).on(`${self.triggerPrefix}-close-modal`, () => {
                evtSource.close();
                self._abortAllRequests();
            });
        };

        importWPForms = () => {
            const self = this;

            if ( self.stylesOnlyMode ) {
                $(document).trigger(`${self.triggerPrefix}-import-wpforms-done`);
                return;
            }

			if ('' !== self.wpformsURL && 'undefined' !== self.wpformsURL) {

				$.ajax({
					url: ajaxurl,
					type: 'POST',
					dataType: 'json',
					data: {
						action: `${self.actionPrefix}-import-wpforms`,
						wpforms_url: self.wpformsURL,
						_ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
					},
					beforeSend: function(jqXHR) {
						console.groupCollapsed('Importing WP Forms');
						self._log_title('Importing WP Forms..');
						self._log(self.wpformsURL);
                        self.xhrPool.push(jqXHR); // add connection to list.
					},
				})
					.fail(function (jqXHR) {
						self._log(jqXHR);
						self._failed( jqXHR.status + ' ' + jqXHR.statusText, 'Import WP Forms Failed' );
						console.groupEnd();
					})
                    .complete(function(jqXHR){
                        const connectionIndex = self.xhrPool.indexOf(jqXHR); // get index for current connection completed.
                        if ( connectionIndex > -1) {
                            self.xhrPool.splice(connectionIndex, 1); // removes from list by index.
                        }
                    })
					.done(function (response) {
						self._log(response);

						// 1. Fail - Import WPForms Options.
						if (false === response.success) {
							self._failed( response.data, 'Import WP Forms Failed' );
							console.groupEnd();
						} else {
							console.groupEnd();
							// 1. Pass - Import Customizer Options.
							$(document).trigger( `${self.triggerPrefix}-import-wpforms-done`);
						}
					});

			} else {
				$(document).trigger( `${self.triggerPrefix}-import-wpforms-done`);
			}

		}

		importTemplateOptions = () => {
            const self = this;

			if (self._is_process_template_options()) {
				$.ajax({
					url: ajaxurl,
					type: 'POST',
					data: {
						action: `${self.actionPrefix}-import-options`,
						_ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
                        options_data: self.templateOptionsData
					},
					beforeSend: function (jqXHR) {
						console.groupCollapsed('Importing Options');
						self._log_title('Importing Options..');
                        self.xhrPool.push(jqXHR); // add connection to list.
					},
				})
					.fail(function (jqXHR) {
						self._log(jqXHR);
						self._failed( jqXHR.status + ' ' + jqXHR.statusText, 'Import Template Options Failed!' );
						console.groupEnd();
					})
                    .complete(function(jqXHR){
                        const connectionIndex = self.xhrPool.indexOf(jqXHR); // get index for current connection completed.
                        if ( connectionIndex > -1) {
                            self.xhrPool.splice(connectionIndex, 1); // removes from list by index.
                        }
                    })
					.done(function (response) {
						self._log(response);
						// 3. Fail - Import Template Options.
						if (false === response.success) {
							self._failed( response.data, 'Import Template Options Failed!' );
							console.groupEnd();
						} else {
							console.groupEnd();

							// 3. Pass - Import Template Options.
							$(document).trigger(`${self.triggerPrefix}-import-options-done`);
						}
					});
			} else {
				$(document).trigger(`${self.triggerPrefix}-import-options-done`);
			}
		}

		importCustomizerSettings = () => {
            const self = this;

            if (self._is_process_customizer() || self.stylesOnlyMode) {
                $.ajax({
                    type: 'POST',
                    url: ajaxurl,
                    data: {
                        action: `${self.actionPrefix}-import-customizer-settings`,
                        _ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
                        customizer_data: self.customizerData,
                        action_type: self.actionType
                    },
                    beforeSend: function (jqXHR) {
						//console.log( jqXHR );
                        console.groupCollapsed('Importing Customizer Settings');
                        self._log_title('Importing Customizer Settings..');
                        self._log(self.customizerData);
                        self.xhrPool.push(jqXHR); // add connection to list.
                    },
                })
                    .fail(function (jqXHR) {
                        self._failed( jqXHR.status + ' ' + jqXHR.statusText, 'Import Customizer Settings Failed!' );
                        self._log(jqXHR);
                        console.groupEnd();
                    })
                    .complete(function(jqXHR){
                        const connectionIndex = self.xhrPool.indexOf(jqXHR); // get index for current connection completed.
                        if ( connectionIndex > -1) {
                            self.xhrPool.splice(connectionIndex, 1); // removes from list by index.
                        }
                    })
                    .done(function (response) {
						//console.log( response );
                        self._log(response);
    
                        // 1. Fail - Import Customizer Options.
                        if (false === response.success) {
                            self._failed( response.data, 'Import Customizer Settings Failed!' );
                            console.groupEnd();
                        } else {
                            console.groupEnd();
                            // 1. Pass - Import Customizer Options.
                            $(document).trigger(`${self.triggerPrefix}-import-customizer-settings-done`);
                        }
                    });
            } else {
                $(document).trigger(`${self.triggerPrefix}-import-customizer-settings-done`);
            }
		}

        importWidgets = () => {
            const self = this;

            if (self._is_process_widgets()) {
				$.ajax({
					url: ajaxurl,
					type: 'POST',
					data: {
						action: `${self.actionPrefix}-import-widgets`,
						widgets_data: self.widgetsData,
						_ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
					},
					beforeSend: function (jqXHR) {
						console.groupCollapsed('Importing Widgets');
						self._log_title('Importing Widgets..');
                        self.xhrPool.push(jqXHR); // add connection to list.
					},
				})
					.fail(function (jqXHR) {
						self._log(jqXHR);
						self._failed( jqXHR.status + ' ' + jqXHR.statusText, 'Import Widgets Failed!' );
						console.groupEnd();
					})
                    .complete(function(jqXHR){
                        const connectionIndex = self.xhrPool.indexOf(jqXHR); // get index for current connection completed.
                        if ( connectionIndex > -1) {
                            self.xhrPool.splice(connectionIndex, 1); // removes from list by index.
                        }
                    })
					.done(function (response) {
						self._log(response);
						console.groupEnd();

						// 4. Fail - Import Widgets.
						if (false === response.success) {
							self._failed( response.data, 'Import Widgets Failed!' );
						} else {

							// 4. Pass - Import Widgets.
							$(document).trigger(`${self.triggerPrefix}-import-widgets-done`);
						}
					});
			} else {
                $(document).trigger(`${self.triggerPrefix}-import-widgets-done`);
			}
        }

        deleteWPDefaultPosts = () => {
            const self = this;

            if ( self.stylesOnlyMode ) {
                $(document).trigger(`${self.triggerPrefix}-delete-wp-default-posts-done`);
                return;
            }

            if ( self._is_process_wp_defaults() ) {
                $.ajax({
					url: ajaxurl,
					type: 'POST',
					data: {
						action: `${self.actionPrefix}-delete-wp-default-posts`,
						_ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
					},
					beforeSend: function (jqXHR) {
						console.groupCollapsed('Delete WP Default Posts');
						self._log_title('Delete WP Default Posts..');
                        self.xhrPool.push(jqXHR); // add connection to list.
					},
				})
					.fail(function (jqXHR) {
						self._log(jqXHR);
						self._failed( jqXHR.status + ' ' + jqXHR.statusText, 'Delete WP Default Posts Failed!' );
						console.groupEnd();
					})
                    .complete(function(jqXHR){
                        const connectionIndex = self.xhrPool.indexOf(jqXHR); // get index for current connection completed.
                        if ( connectionIndex > -1) {
                            self.xhrPool.splice(connectionIndex, 1); // removes from list by index.
                        }
                    })
					.done(function (response) {
						self._log(response);
						console.groupEnd();

						if (false === response.success) {
							self._failed( response.data, 'Delete WP Default Posts Failed!' );
						} else {
                            self._log_title(response.data);
							$(document).trigger(`${self.triggerPrefix}-delete-wp-default-posts-done`);
						}
					});
            } else {
                $(document).trigger(`${self.triggerPrefix}-delete-wp-default-posts-done`);
            }
        }

        _beforeElementorBatchProcess = () => {
            const self = this;

            if ( self._is_process_elementor_pages() ) {
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: `${self.actionPrefix}-before-elementor-batch-process`,
                        _ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
                    },
                    beforeSend: function (jqXHR) {
                        self.xhrPool.push(jqXHR); // add connection to list.
                        self._log_title('Preparing Elementor Pages for process..');
                    },
                })
                    .fail(function (jqXHR) {
                        self._log(jqXHR);
                    })
                    .complete(function(jqXHR){
                        const connectionIndex = self.xhrPool.indexOf(jqXHR); // get index for current connection completed.
                        if ( connectionIndex > -1) {
                            self.xhrPool.splice(connectionIndex, 1); // removes from list by index.
                        }
                    })
                    .done(function (response) {
                        if ( response.success ) {
                            self.processed_elementor_pages = response.data;
    
                            $(document).trigger(`${self.triggerPrefix}-before-elementor-batch-process-done`);
                        } else {
                            // Skip Elementor Batch Process id data are empty.
                            $(document).trigger(`${self.triggerPrefix}-elementor-batch-process-done`);
                        }
                    });
            } else {
                $(document).trigger(`${self.triggerPrefix}-before-elementor-batch-process-done`);
            }
        }

        elementorBatchProcess = () => {
            const self = this;

            if ( self.stylesOnlyMode ) {
                $(document).trigger(`${self.triggerPrefix}-elementor-batch-process-done`);
                return;
            }

            const runBatchProcess = (pages) => {
                const pageId = _.first(pages);

                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: `${self.actionPrefix}-elementor-batch-process`,
                        post_id: pageId,
                        _ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
                    },
                    beforeSend: function (jqXHR) {
                        self.xhrPool.push(jqXHR); // add connection to list.
                        self._log_title('Processing Elementor Pages');
                    },
                })
                    .retry({
                        times: 5,
                        statusCodes: [503, 504, 500, 502]
                    })
                    .fail(function (jqXHR) {
                        self._log(jqXHR);
                        self._failed( jqXHR.status + ' ' + jqXHR.statusText, 'Processing Elementor Pages Failed!' );
                        console.groupEnd();
                    })
                    .done(function(jqXHR){
                        const connectionIndex = self.xhrPool.indexOf(jqXHR); // get index for current connection completed.
                        if ( connectionIndex > -1) {
                            self.xhrPool.splice(connectionIndex, 1); // removes from list by index.
                        }
                    })
                    .always(function (response) {
                        const data = response.data;

                        // Request canceled.
                        if ( ! data ) {
                            return;
                        }
                        
                        self._log(response);

                        self.wrapper
                            .find(".current-importing-status-description")
                            .html("")
                            .removeAttr('data-level')
                            .show();
    
                        const pageTitle = data.post_title;
                        if (false === response.success) {
                            self.wrapper.find(".current-importing-status-description").html(`Elementor Page: ${pageTitle} (ID ${pageId}) failed. ${data.message}`);
                        } else {
                            self.wrapper.find(".current-importing-status-description").html(`Processed Elementor Page: ${pageTitle} (ID ${pageId})`);
                        }

                        if ( pages.length > 1 ) {
                            runBatchProcess(_.rest(pages));
                        } else {
                            console.groupEnd();
                            self.wrapper.find(".current-importing-status-description").hide();
                            $(document).trigger(`${self.triggerPrefix}-elementor-batch-process-done`);
                        }
                    });
            }

            if ( self._is_process_elementor_pages() ) {
                console.groupCollapsed('Elementor Batch Process');
                self._log_title('Processing Elementor Pages..');
                self.wrapper.find('.wpz-onboard_demo-import-percent').remove();
                $(".wpz-onboard_demo-import-start").before( '<p class="wpz-onboard_demo-import-percent" data-progress-loading="0%"><span class="wpz-onboard_dot-elastic"></span></p>' );

                runBatchProcess(self.processed_elementor_pages);
            } else {
                $(document).trigger(`${self.triggerPrefix}-elementor-batch-process-done`);
            }
        }

        regenerateAttachments = () => {
            const self = this;
            let complete = 0;
            let total = 0;

            const runRegenerate = (thumbs, type = 'regenerate_attachments') => {
                if ( 'regenerate_attachments' === type ) {
                    total = self.attachments.length;
                } else if ( 'regenerate_featured_images' === type ) {
                    total = self.featured_images.length;
                }

                const first = _.first(thumbs);
                let file = false;
                if ( self.processed_attachments[ first ] ) {
                    file = self.processed_attachments[ first ].file;
                }
    
                $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'zoom_regenerate_thumbnails',
                            'thumb_id': first,
                            'file': file,
                            'nonce_regenerate_thumbnail': wpzoomDemoImporterVars._regenerate_thumbnails_nonce
                        },
                        beforeSend: function(jqXHR) {
                            self.xhrPool.push(jqXHR); // add connection to list.
                        }
                    }
                )
                .retry({
                    times: 5,
                    statusCodes: [503, 504, 500, 502]
                })
                .done(function (jqXHR) {
                    self._log(jqXHR);
                    const connectionIndex = self.xhrPool.indexOf(jqXHR); // get index for current connection completed.
                    if ( connectionIndex > -1) {
                        self.xhrPool.splice(connectionIndex, 1); // removes from list by index.
                    }
                })
                .fail(function (jqXHR) {
                    self._log(jqXHR);
                    self._failed( jqXHR.status + ' ' + jqXHR.statusText, 'Regenerate Attachments Failed!' );
                })
                .always(function (response, statusText, jqXHR) {
                    const data = response.data;

                    // Request canceled.
                    if ( ! data ) {
                        return;
                    }
    
                    if ( data.halt ) {
                        self._importFailMessage(data.message, '', jqXHR);
                        return;
                    }

                    self.wrapper.find(".current-importing-status-description").attr('data-attachment-id', data.thumb_id).html(data.message);

                    // Increase complete.
                    complete += 1;

                    WPZOOM_SSE_Import.renderRegenerateAttachments(type, complete, total);
    
                    if (thumbs.length > 1) {
                        runRegenerate(_.rest(thumbs), type);
                    } else {
                        console.groupEnd();
                        self.wrapper.find(`.current-importing-status-wrap .process-status_active[data-import-type="${type}"] .wpzoom-demo-import-process-type-count`).html(`<h3>100% ${wpzoomDemoImporterVars.labels.regenerated_attachments_done}</h3>`);
                        self.wrapper.find(".current-importing-status-description").hide();
                        $(document).trigger(`${self.triggerPrefix}-regenerate-attachments-done`);
                    }
                })
            }

            // Regenerate all imported attachments.
            if ( self._is_process_regenerate_attachments() || self._is_process_regenerate_featured_images() ) {
                self._log_title('Regenerating attachments:');
                self.wrapper.find('.wpz-onboard_demo-import-percent').remove();

                const type = self._is_process_regenerate_attachments() ? 'regenerate_attachments' : 'regenerate_featured_images';
                const thumbs = self._is_process_regenerate_attachments() ? self.attachments : self.featured_images;

                if ( thumbs ) {
                    console.groupCollapsed('Regenerate attachments');

                    self.wrapper
                        .find(".current-importing-status-description")
                        .html("")
                        .show();
                    
                    runRegenerate(thumbs, type);
                } else {
                    self._log_title('No attachments for regenerating was found!');
                    $(document).trigger(`${self.triggerPrefix}-regenerate-attachments-done`);
                }
            } else {
                $(document).trigger(`${self.triggerPrefix}-regenerate-attachments-done`);
            }
        }

        installChildTheme = () => {
            const self = this;

            if ( self._is_process_install_child_theme() || self._is_process_activate_child_theme() ) {
                const autoActivate = $(document).find('#wpzoom-demo-importer_activate-child-theme input[type="checkbox"]').is(':checked');
                const keepParentSettings = $(document).find('#wpzoom-demo-importer_copy-data-to-child-theme input[type="checkbox"]').is(':checked');

                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'zoom_install_child_theme',
                        _ajax_nonce: wpzoomDemoImporterVars._ajax_nonce,
                        location: 'zoomForm-theme-setup',
                        advanced_settings: {
                            child_theme_auto_activate: autoActivate,
                            child_theme_keep_parent_settings: keepParentSettings
                        }
                    },
                    beforeSend: function (jqXHR) {
                        self.xhrPool.push(jqXHR); // add connection to list.
                        self._log_title('Installing Child Theme..');

                        self.wrapper.find('.wpz-onboard_demo-import-modal-footer .wpz-onboard_demo-import-percent').remove();
                        self.wrapper.find(".wpz-onboard_demo-import-start").before( '<p class="wpz-onboard_demo-import-percent" data-progress-loading="0%"><span class="wpz-onboard_dot-elastic"></span></p>' );
                    },
                })
                    .fail(function (jqXHR) {
                        self._log(jqXHR);
                    })
                    .complete(function(jqXHR){
                        const connectionIndex = self.xhrPool.indexOf(jqXHR); // get index for current connection completed.
                        if ( connectionIndex > -1) {
                            self.xhrPool.splice(connectionIndex, 1); // removes from list by index.
                        }
                    })
                    .done(function (response) {
                        var data = response.data || {};

                        self._log( response );
    
                        self.wrapper.find('.current-importing-status-description').text( data.message ).append(` <strong>Debug: ${ data.debug }</strong>`);

                        setTimeout(() => {
                            $(document).trigger(`${self.triggerPrefix}-install-child-theme-done`);
                        }, 500);
                    });
            } else {
                $(document).trigger(`${self.triggerPrefix}-install-child-theme-done`);
            }
        }

        closeModal = (event) => {
            event.preventDefault();

            if ( ! this._beforeCloseModalCallback(event) ) {
                return;
            }

            if (
                !this.wrapper
                    .find(".wpz-onboard_demo-import-modal")
                    .hasClass("is-import-modal-open")
            ) {
                return;
            }

            this.isModalOpen = false;
            this.wrapper
                .find(".wpz-onboard_demo-import-modal")
                .removeClass("is-import-modal-open");
            $("body").css({
                overflow: "auto",
            });

            if ( this.demoImportStatus ) {
				if ( wpzoomDemoImporterVars.close_modal_url === window.location.href ) {
					location.reload();
				} else {
					location.href = wpzoomDemoImporterVars.close_modal_url;
					this.scrollToTop();
				}
            }

            $(window).off('beforeunload', this._beforeUnloadCallback);
            $(document).trigger(`${this.triggerPrefix}-close-modal`);
        };

        scrollToTop = () => {
            window.scrollTo(0, 0);
        }

        openModal = (modal) => {
            /**
             * Destroy all pointers.
             */
            if ( window.hasOwnProperty('wpzoomOnboardingTour') && wpzoomOnboardingTour.currentTarget ) {
                wpzoomOnboardingTour.destroyPointers();
                wpzoomOnboardingTour.dismissPointer();
            }

            if ( 'prepare-xml' === this.actionType || 'delete-imported-demo-content' === this.actionType ) {
                $(window).on('beforeunload', this._beforeUnloadCallback);
            }

            this.wrapper.find(".wpz-onboard_demo-import-modal").remove();
            this.wrapper.append(modal);
            this.isModalOpen = true;
            
            setTimeout(() => {
                this.wrapper
                    .find(".wpz-onboard_demo-import-modal")
                    .addClass("is-import-modal-open");
                $("body").css({
                    overflow: "hidden",
                });
            }, 200);
        };

        toggleAdvancedSettings = (event) => {
            this.targetEl = event.target;

            // Prevent click inside the item content.
            if (
                event.target.className.indexOf(
                    "demo-import-advanced-settings-item"
                ) > -1
            ) {
                const $toggleItem = $(this.targetEl);
                const $advancedSettingsItems = this.wrapper.find(
                    ".wpz-onboard_demo-import-advanced-settings > ul > li"
                );
                $toggleItem.toggleClass("toggle-open");
                $advancedSettingsItems.not($toggleItem).removeClass("toggle-open");
            }
        };

        toggleTooltip = (event) => {
            const tooltipId = $(event.target).attr('data-toggle-tooltip');
            const position = $(event.target).position();
            const parentPosition = $(event.target).closest(`li[id="${tooltipId}"]`).position();
            const parentToggleItemHeight = $(event.target).closest('li.demo-import-advanced-settings-item.toggle-open').outerHeight();
            const tooltipHeight = this.wrapper.find(`p[data-tooltip-id="${tooltipId}"]`).outerHeight();
            
            // Calculate tooltip top position
            let topTooltipPosition = 40;
            if ( parentToggleItemHeight - parentPosition.top <= tooltipHeight ) {
                topTooltipPosition = -(parentToggleItemHeight - parentPosition.top + 40);
            }

            if ( 'mouseover' === event.type ) {
                this.wrapper.find(`p[data-tooltip-id="${tooltipId}"]`).addClass('wpzoom-show-tooltip').css({left: position.left, top: topTooltipPosition, right: 'auto'});
            } else if('mouseout' === event.type) {
                this.wrapper.find(`p[data-tooltip-id="${tooltipId}"]`).removeClass('wpzoom-show-tooltip');
            }
        }
    }

    /**
     * Initialize WPZOOM_Demo_Importer
     */
    $(function ($) {
        const demoImporter = new WPZOOM_Demo_Importer();

        demoImporter.init();

        // Store demoImporter to window vars.
        window.demoImporter = demoImporter;

        // Define custom element "prgoress-ring".
        window.customElements.define("progress-ring", WPZOOM_Progress_Ring);
    });
})(jQuery, _);
