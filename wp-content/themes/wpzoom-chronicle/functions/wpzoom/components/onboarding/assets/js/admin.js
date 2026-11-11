( function( $ ) {
	const $wrapper = $('.wpz-onboard_wrapper');
	const activePlugins = [];
	const requiredPlugins = [];
	const recommendedPlugins = [];
	let finishSetupState = wpzoomOnboarding.finishSetup || {};
	const DEMO_FULLSCREEN_STORAGE_KEY = 'wpzOnboardDemoImporterFullscreen';
	let demoImporterFullscreen = null;

	/**
	 * Hook up functionality when the document loads.
	 */
	$( function( $ ) {
		if ( window.location.hash ) {
			var hash = window.location.hash;

			if ( hash.indexOf('#step-') === 0 ) {
				// Step hashes belong to the demo-importer tab; stepperInit() opens the right step.
				setTab( '#demo-importer' );
			} else {
				setTab( hash );
			}
		}

		$(window).on('wpzoom-onboarding-pointers-init', function() {
			patchTourForStepper();
			if ( window.location.hash ) {
				var hash = window.location.hash;
				// If it's a step hash, use demo-importer tab for tour pointers
				if ( hash.indexOf('#step-') === 0 ) {
					hash = '#demo-importer';
				}
				setTimeout(() => {
					wpzoomOnboardingTour.updatePointersOnTabChange( hash );
				});
			}
		});

		$(document).on("click", "body", (event) => {
			// Hide dropdown actions when click outside the box.
			if ( !$(event.target).hasClass('button-toggle-dropdown-actions') && !$(event.target).closest('.wpz-onboard_snapshot-dropdown-actions.shown').length) {
				$wrapper.find('.wpz-onboard_snapshot-dropdown-actions.shown').removeClass('shown');
			}
		});

		$wrapper.find( '#wpz-onboard_tabs a, .wpz-onboard_notice a#license-tab-link, .quick-action-section a#license-tab-link, .wpz-onboard_imported-demo-finish' ).on( 'click', function() {
			const hash = $( this ).attr( 'href' );
			const id = $(this).attr('id');

			setTab( hash );
			
			if ( 'license-tab-link' === id ) {
				if ( $(`[data-id="${hash}"]`).length ) {
					$('html, body').animate({
						scrollTop: $(`[data-id="${hash}"]`).closest('.wpz-onboard_wrapper').offset().top
					}, 800);	
				}
			}
		} );
		$wrapper.find( '.wpz-onboard_snapshots-table a.button-toggle-dropdown-actions' ).on( 'click', function( event ) { 
			event.preventDefault();
			const toggleId = $(this).attr('data-toggle');
			$(document).find(`#${toggleId}`).toggleClass('shown');
		} );
		$wrapper.find('.wpz-onboard_notice li[data-notice="third-party-required"] .go-up-link').on('click', function( event ){
			event.preventDefault();
			gotoNextStep('#step-install-plugins');
		});
		$wrapper.find('.wpz-onboard_notice a#wpz-onboard-skip-notice').on('click', function(event){
			event.preventDefault();
			toggleNotice();
			$(this).remove();
		});

		// Fullscreen close button (exits fullscreen, stays on the Demo Importer tab)
		$wrapper.find( '.wpz-onboard_fullscreen-close' ).on( 'click', function( event ) {
			event.preventDefault();
			exitFullscreen();
		} );

		// Inline "Expand" button opens the Demo Importer in fullscreen
		$wrapper.find( '.wpz-onboard_fullscreen-toggle' ).on( 'click', function( event ) {
			event.preventDefault();
			enterFullscreen();
		} );

		// Escape key exits fullscreen
		$( document ).on( 'keydown', function( event ) {
			if ( event.key === 'Escape' && $('body').hasClass('wpz-onboard-fullscreen') ) {
				exitFullscreen();
			}
		} );

		initConstants();
		pluginInstallStep();
		themeDesignStep();
		demoContentStep();
		activateLicenseKey();
		demoPluginsSortable();
		pluginsButtonState();
		builderSelectionStep();
		finishSetupStep();
		stepperInit();

	} );

	/**
	 * Whether the Demo Importer tab should open in fullscreen.
	 *
	 * The default comes from the server (data-fullscreen="1" when the theme ships many demos,
	 * see the `wpz_onboarding_demo_importer_fullscreen` filter). A user's explicit Expand / Close
	 * choice is remembered in localStorage and wins over the default.
	 *
	 * @return {boolean}
	 */
	function isDemoImporterFullscreen() {
		if ( demoImporterFullscreen !== null ) {
			return demoImporterFullscreen;
		}

		let stored = null;
		try {
			stored = window.localStorage.getItem( DEMO_FULLSCREEN_STORAGE_KEY );
		} catch ( e ) {}

		if ( stored === '1' || stored === '0' ) {
			demoImporterFullscreen = stored === '1';
		} else {
			demoImporterFullscreen = String( $wrapper.find( '[data-id="#demo-importer"]' ).data( 'fullscreen' ) ) === '1';
		}

		return demoImporterFullscreen;
	}

	/**
	 * Stores the user's fullscreen preference for the Demo Importer.
	 *
	 * @param {boolean} enabled
	 */
	function setDemoImporterFullscreen( enabled ) {
		demoImporterFullscreen = !! enabled;
		try {
			window.localStorage.setItem( DEMO_FULLSCREEN_STORAGE_KEY, enabled ? '1' : '0' );
		} catch ( e ) {}
	}

	/**
	 * Opens the Demo Importer tab in fullscreen mode.
	 */
	function enterFullscreen() {
		setDemoImporterFullscreen( true );
		$('body').addClass( 'wpz-onboard-fullscreen' );
		$wrapper.scrollTop( 0 );
		$( document ).trigger( 'wpzoom-demo-importer-fullscreen-change', [ true ] );
	}

	/**
	 * Exits fullscreen mode. The Demo Importer tab stays active, rendered inline
	 * like the other tabs (with the WP admin menu and the WPZOOM sidebar visible).
	 */
	function exitFullscreen() {
		setDemoImporterFullscreen( false );
		$('body').removeClass( 'wpz-onboard-fullscreen' );
		$wrapper.scrollTop( 0 );

		const $demoTab = $wrapper.find( '[data-id="#demo-importer"]' );
		if ( $demoTab.length && $demoTab.hasClass( 'active' ) ) {
			$( 'html, body' ).scrollTop( Math.max( 0, $demoTab.offset().top - 60 ) );
		}
		$( document ).trigger( 'wpzoom-demo-importer-fullscreen-change', [ false ] );
	}

	/* ==========================================================================
	   Demo Importer stepper: one step visible at a time.
	   ========================================================================== */
	const STEP_ORDER = [ '#step-choose-design', '#step-choose-builder', '#step-install-plugins', '#step-import-demo' ];
	let currentStep = '#step-choose-design';

	function getStepsList() {
		return $wrapper.find( '.wpz-onboard_content-main-steps' );
	}

	function getStep( id ) {
		return $wrapper.find( id );
	}

	function hasSelectedDemo() {
		return getSelectedDemoItem().length > 0;
	}

	function isBuilderStepAvailable() {
		const $step = getStep( '#step-choose-builder' );
		return $step.length > 0 && ! $step.hasClass( 'is-unavailable' ) && $step.find( 'input:radio[name=builder]' ).length > 1;
	}

	function isStepAvailable( id ) {
		if ( id === '#step-choose-builder' ) {
			return isBuilderStepAvailable();
		}
		return getStep( id ).length > 0;
	}

	function isStepReachable( id ) {
		return id === '#step-choose-design' || hasSelectedDemo();
	}

	/**
	 * Returns the previous (direction -1) or next (direction 1) available step id.
	 */
	function getAdjacentStep( id, direction ) {
		let index = STEP_ORDER.indexOf( id );
		if ( index === -1 ) {
			return null;
		}
		while ( true ) {
			index += direction;
			if ( index < 0 || index >= STEP_ORDER.length ) {
				return null;
			}
			if ( isStepAvailable( STEP_ORDER[ index ] ) ) {
				return STEP_ORDER[ index ];
			}
		}
	}

	/**
	 * Plugin rows that apply to the selected demo/builder (rows hidden inline by
	 * demoPluginsSortableByBuilder() are excluded). Does not rely on :visible so it
	 * also works while the plugins step is not the current one.
	 */
	function getShownPluginRows() {
		return $wrapper.find( '#plugins-list tbody tr' ).not( '.no-required-plugins' ).filter( function() {
			return $( this ).css( 'display' ) !== 'none';
		} );
	}

	function getPendingPluginRows() {
		return getShownPluginRows().not( '.plugin-status_active' );
	}

	function escapeHtml( text ) {
		return $( '<div>' ).text( text == null ? '' : String( text ) ).html();
	}

	function formatCount( template, count ) {
		return String( template ).replace( '%d', count );
	}

	function scrollToStepsTop() {
		const $anchor = $wrapper.find( '.wpz-onboard_stepper' );
		if ( ! $anchor.length ) {
			return;
		}

		if ( $( 'body' ).hasClass( 'wpz-onboard-fullscreen' ) ) {
			const $topbar = $wrapper.find( '.wpz-onboard_fullscreen-topbar:visible' );
			const offset = ( $topbar.length ? $topbar.outerHeight() : 0 ) + ( parseInt( $wrapper.css( 'padding-top' ), 10 ) || 0 ) + 20;
			const target = Math.max( 0, $wrapper.scrollTop() + $anchor.offset().top - $wrapper.offset().top - offset );
			$wrapper.stop().animate( { scrollTop: target }, 400 );
		} else {
			const top = Math.max( 0, $anchor.offset().top - ( $( '#wpadminbar' ).outerHeight() || 0 ) - 20 );
			if ( $( window ).scrollTop() > top ) {
				$( 'html, body' ).stop().animate( { scrollTop: top }, 400 );
			}
		}
	}

	function updateStepperNav() {
		const $nav = $wrapper.find( '.wpz-onboard_stepper' );
		if ( ! $nav.length ) {
			return;
		}

		const currentIndex = STEP_ORDER.indexOf( currentStep );
		let number = 0;

		$nav.find( '.wpz-onboard_stepper-item' ).each( function() {
			const $item = $( this );
			const id = $item.attr( 'data-step' );
			const index = STEP_ORDER.indexOf( id );
			const available = isStepAvailable( id );

			$item.toggleClass( 'is-hidden', ! available );
			if ( ! available ) {
				return;
			}

			number++;
			$item.find( '.wpz-onboard_stepper-number' ).text( number );
			$item.toggleClass( 'is-active', id === currentStep )
				.toggleClass( 'is-done', index < currentIndex )
				.toggleClass( 'is-disabled', ! isStepReachable( id ) );
			$item.attr( 'aria-current', id === currentStep ? 'step' : null );
		} );
	}

	/**
	 * Renders the summary card on the Import step (demo, builder, plugin status).
	 */
	function renderImportSummary() {
		const $summary = $wrapper.find( '.wpz-onboard_import-summary' );
		if ( ! $summary.length ) {
			return;
		}

		const $demo = getSelectedDemoItem();
		if ( ! $demo.length ) {
			$summary.empty().hide();
			return;
		}

		const labels = wpzoomOnboarding.labels || {};
		const row = ( label, value, editStep, cls ) => {
			return '<li class="' + ( cls || '' ) + '">' +
				'<span class="wpz-onboard_import-summary-label">' + escapeHtml( label ) + '</span>' +
				'<span class="wpz-onboard_import-summary-value">' + escapeHtml( value ) + '</span>' +
				( editStep ? '<a href="#" class="wpz-onboard_import-summary-edit" data-step="' + editStep + '">' + escapeHtml( labels.summary_edit || 'Change' ) + '</a>' : '' ) +
				'</li>';
		};

		const demoName = $demo.find( 'figcaption h5' ).first().text().trim();
		const $thumb = $demo.find( '.preview-thumbnail' ).first();
		let thumbUrl = $thumb.attr( 'data-bg' ) || '';
		if ( ! thumbUrl ) {
			const match = ( $thumb.css( 'background-image' ) || '' ).match( /url\(["']?(.*?)["']?\)/ );
			if ( match ) {
				thumbUrl = match[1];
			}
		}

		let items = row( labels.summary_demo || 'Demo', demoName, '#step-choose-design' );

		if ( isBuilderStepAvailable() ) {
			const $checked = getStep( '#step-choose-builder' ).find( 'input:radio[name=builder]:checked' );
			const builderLabel = $checked.length ? $checked.next( 'label' ).text().trim() : '';
			if ( builderLabel ) {
				items += row( labels.summary_builder || 'Page builder', builderLabel, '#step-choose-builder' );
			}
		}

		const $pending = getPendingPluginRows();
		const requiredPending = $pending.filter( '.plugin-level_required' ).length;
		const recommendedPending = $pending.length - requiredPending;
		let pluginsText = '';
		let pluginsClass = 'is-ok';

		if ( ! getShownPluginRows().length ) {
			pluginsText = labels.summary_plugins_none || 'No plugins needed';
		} else if ( ! $pending.length ) {
			pluginsText = labels.summary_plugins_ok || 'All plugins are active';
		} else {
			const parts = [];
			if ( requiredPending ) {
				parts.push( formatCount( labels.summary_plugins_required || '%d required plugin(s) not active yet', requiredPending ) );
				pluginsClass = 'is-warning';
			}
			if ( recommendedPending ) {
				parts.push( formatCount( labels.summary_plugins_recommended || '%d recommended plugin(s) not active', recommendedPending ) );
			}
			pluginsText = parts.join( ', ' );
		}
		items += row( labels.summary_plugins || 'Plugins', pluginsText, '#step-install-plugins', pluginsClass );

		$summary.html(
			'<div class="wpz-onboard_import-summary-thumb"' + ( thumbUrl ? ' style="background-image:url(\'' + escapeHtml( thumbUrl ) + '\')"' : '' ) + '></div>' +
			'<ul class="wpz-onboard_import-summary-list">' + items + '</ul>'
		).show();
	}

	/**
	 * Shows one step of the Demo Importer and hides the others.
	 *
	 * @param {string} id      Step id, e.g. '#step-install-plugins'.
	 * @param {Object} options { scroll: bool, updateHash: bool }
	 */
	function showStep( id, options = {} ) {
		const settings = $.extend( { scroll: true, updateHash: true }, options );
		const $stepsList = getStepsList();

		if ( ! $stepsList.length || STEP_ORDER.indexOf( id ) === -1 ) {
			return;
		}
		if ( ! isStepAvailable( id ) ) {
			id = getAdjacentStep( id, 1 ) || getAdjacentStep( id, -1 ) || '#step-choose-design';
		}
		if ( ! isStepReachable( id ) ) {
			id = '#step-choose-design';
		}

		currentStep = id;
		$stepsList.attr( 'data-current-step', id );
		$stepsList.find( '.wpz-onboard_content-main-step' ).removeClass( 'is-current' );
		getStep( id ).addClass( 'is-current' );

		if ( id === '#step-import-demo' ) {
			renderImportSummary();
		}

		updateStepperNav();
		updateChooseDesignNav();

		if ( settings.updateHash && window.history && window.history.replaceState ) {
			try {
				window.history.replaceState( null, '', window.location.pathname + window.location.search + id );
			} catch ( e ) {}
		}
		if ( settings.scroll ) {
			scrollToStepsTop();
		}

		$( document ).trigger( 'wpzoom-demo-importer-step-change', [ id ] );
	}

	/**
	 * Makes sure the step that contains the given selector is the visible one
	 * (used for tour pointers and deep links).
	 */
	function revealStepForSelector( selector ) {
		if ( ! selector || typeof selector !== 'string' ) {
			return;
		}
		let $target;
		try {
			$target = $( selector ).first();
		} catch ( e ) {
			return;
		}
		if ( ! $target.length ) {
			return;
		}
		const $step = $target.closest( '.wpz-onboard_content-main-step' );
		if ( ! $step.length || ! $step.attr( 'id' ) ) {
			return;
		}
		const id = '#' + $step.attr( 'id' );
		if ( id !== currentStep ) {
			showStep( id, { scroll: false } );
		}
	}

	/**
	 * The onboarding tour points at elements inside the steps; reveal the right
	 * step before a pointer opens or scrolls to its target.
	 */
	function patchTourForStepper() {
		const tour = window.wpzoomOnboardingTour;
		if ( ! tour || tour._wpzStepperPatched ) {
			return;
		}
		tour._wpzStepperPatched = true;

		[ 'openPointer', 'scrollToTarget', 'gotoNextSelector' ].forEach( function( method ) {
			if ( typeof tour[ method ] !== 'function' ) {
				return;
			}
			const original = tour[ method ];
			tour[ method ] = function( arg ) {
				revealStepForSelector( arg && typeof arg === 'object' ? arg.selector : arg );
				return original.apply( tour, arguments );
			};
		} );
	}

	function stepperInit() {
		const $stepsList = getStepsList();
		if ( ! $stepsList.length ) {
			return;
		}
		$stepsList.addClass( 'is-stepper' );

		$wrapper.on( 'click', '.wpz-onboard_stepper-item a', function( event ) {
			event.preventDefault();
			const $item = $( this ).closest( '.wpz-onboard_stepper-item' );
			if ( $item.hasClass( 'is-disabled' ) || $item.hasClass( 'is-hidden' ) ) {
				return;
			}
			showStep( $item.attr( 'data-step' ) );
		} );

		$wrapper.on( 'click', '.wpz-onboard_step-next', function( event ) {
			event.preventDefault();
			const next = getAdjacentStep( currentStep, 1 );
			if ( next ) {
				showStep( next );
			}
		} );

		$wrapper.on( 'click', '.wpz-onboard_step-prev', function( event ) {
			event.preventDefault();
			const prev = getAdjacentStep( currentStep, -1 );
			if ( prev ) {
				showStep( prev );
			}
		} );

		$wrapper.on( 'click', '.wpz-onboard_import-summary-edit', function( event ) {
			event.preventDefault();
			showStep( $( this ).attr( 'data-step' ) );
		} );

		$( window ).on( 'hashchange', function() {
			const hash = window.location.hash;
			if ( hash.indexOf( '#step-' ) === 0 && hash !== currentStep && STEP_ORDER.indexOf( hash ) !== -1 ) {
				showStep( hash, { updateHash: false } );
			}
		} );

		let initial = '#step-choose-design';
		if ( window.location.hash.indexOf( '#step-' ) === 0 && STEP_ORDER.indexOf( window.location.hash ) !== -1 ) {
			initial = window.location.hash;
		}
		showStep( initial, { scroll: false, updateHash: false } );
	}

	function initConstants() {
		$wrapper.find('#step-install-plugins .plugins-list > tbody > tr').each(function(){
			const slug = $(this).find('input[name="required_plugins[]"]').val();
			if ( $(this).hasClass('plugin-level_required') ) {
				requiredPlugins.push(slug);
			} else if ( $(this).hasClass('plugin-level_recommended') ) {
				recommendedPlugins.push(slug);
			}
			if ( $(this).hasClass('plugin-status_active') ) {
				activePlugins.push(slug);
			}
		})
	}

	/**
	 * Sets the selected tab to the tab with the given ID.
	 *
	 * @param {string} id The ID of the tab to set as selected.
	 */
	function setTab( id, updateHash = false ) {
		if ( id ) {
			const $target = $wrapper.find( '#wpz-onboard_tabs .wpz-onboard_tab a[href="' + id + '"]' ),
			      $tabs   = $target.closest( '.wpz-onboard_wrapper' ).find( '.wpz-onboard_content .wpz-onboard_content-main .wpz-onboard_content-main-tab' );

			$target.closest( '#wpz-onboard_tabs' ).find( '.wpz-onboard_tab' ).removeClass( 'active' );
			$target.closest( '.wpz-onboard_tab' ).addClass( 'active' );

			$tabs.removeClass( 'active' );
			$tabs.filter( '[data-id="' + id + '"]' ).addClass( 'active' );

			// Fullscreen mode for the demo-importer tab (only when the theme/user wants it)
			if ( id === '#demo-importer' && isDemoImporterFullscreen() ) {
				$('body').addClass( 'wpz-onboard-fullscreen' );
			} else {
				$('body').removeClass( 'wpz-onboard-fullscreen' );
			}

			if ( window.hasOwnProperty('wpzoomOnboardingTour') ) {
				wpzoomOnboardingTour.updatePointersOnTabChange( id );
			}

			// Add hash (#) to URL when set new tab active.
			if ( updateHash ) {
				window.location.hash = id;
			}
		}
	}

	/**
	 * Handles the required plugin install step.
	 */
	function pluginInstallStep() {
		const $stepWrap          = $( '.step-install-plugins', $wrapper ),
		      $form              = $( '.wpz-onboard_content-main-step-content form', $stepWrap ),
		      $pluginsCheckboxes = $( '> fieldset input[name="required_plugins[]"]', $form ),
		      $submitButton      = $( 'input[type="submit"]', $stepWrap ),
		      $checkButton       = $( 'input[type="button"][name="button_checkall"]', $stepWrap );

		$pluginsCheckboxes.on( 'change', onPluginInstallCheckboxChange );
		$submitButton.on( 'click', onPluginInstallSubmitClick );
		$checkButton.on( 'click', onPluginInstallCheckboxesToggleClick );

		updatePluginInstallButtons( $form );
	}

	/**
	 * Handles builder selection step.
	*/
	function builderSelectionStep() {
		const $stepWrap = $( '.step-choose-builder', $wrapper ),
			$form = $('form', $stepWrap),
			$designItems = $('.wpz-onboard_content-main-step-content form > fieldset > ul > li', $stepWrap);
			$builder = $stepWrap.find( 'input:radio[name=builder]' ); 
			if ( $builder.length ) {
				demoPluginsSortableByBuilder();
				$builder.on( 'change', function() {
					const $item = $(this);
					var val = $(this).val();
					var design_name = $(this).data('design-name');
					var theme_design = $(this).data('theme-design');
					$(this).append('<div class="wpz-onboard_dot-elastic"></div>');

					onThemeDesignChange( $item, theme_design, $form, $designItems );

					if( design_name )  {
						const $importSection = $wrapper.find( '.step-import-demo .wpz-onboard_selected-template' );
						// Restore original format: "Selected demo: [Name]"
						$importSection.html((wpzoomOnboarding.labels.label_template || 'Selected demo:') + ' <strong>' + design_name + '</strong>');
						
						// Re-evaluate the plugin gate for the selected demo: the button is enabled only
						// when no required-plugin notice is pending (toggleSortablePluginsNotice() handles
						// that), instead of being force-enabled regardless of the notices.
						$('.step-import-demo .wpz-onboard_import-button').prop('disabled', false);
						toggleSortablePluginsNotice();
					}

				} );
			};
	}

	/**
	 * Handles the theme design selection step.
	 */
	function themeDesignStep() {
		const $stepWrap = $( '.step-choose-design', $wrapper ),
			$form = $('form', $stepWrap),
			$designItems = $('.wpz-onboard_content-main-step-content form > fieldset > ul > li', $stepWrap);

		$designItems.each( function(){
			const $item = $(this);
			const $previewThumbnail = $item.find('figure .preview-thumbnail');
			const $viewPagesLink = $item.find('a.view-pages-open');
			const design = $item.find( 'figure input[name="theme_designs"]' ).val();
			
			$previewThumbnail.on('click', function(event) {
				event.preventDefault();
				
				const isSelected = $item.hasClass('selected-template');
				const isChecked = $item.find('input[name="theme_designs"]').is(':checked');
				const hasDeleteButton = $item.find('.delete-imported-demo-content').length > 0;
				
				// Already selected regular demo (e.g. after a page reload): just move on to the next step.
				// Imported demos stay re-selectable below.
				if ( isSelected && isChecked && !hasDeleteButton ) {
					const nextStep = getAdjacentStep( '#step-choose-design', 1 );
					if ( nextStep ) {
						showStep( nextStep );
					}
					return;
				}
				
				// Process the selection (for both imported and regular demos)
				$item.addClass('preparing-view-template');
				$item.find('.button-select-template').text( wpzoomOnboarding.labels.processing_template_data );
				$(this).append('<div class="wpz-onboard_dot-elastic"></div>');
				
				// Always call onThemeDesignChange to save the selection properly
				onThemeDesignChange( $item, design, $form, $designItems );
			})

			$viewPagesLink.on('click', function(event) {
				event.preventDefault();
				event.stopPropagation();

				const isPreparingPreview = $item.hasClass('preparing-view-template');

				if ( window.hasOwnProperty('wpzoomOnboardingTour') && wpzoomOnboardingTour.currentTarget ) {
					welcomePointer = wpzoomOnboardingTour.getPointerByPage('wpzoom_license');
					currentPointerData = wpzoomOnboardingTour.getCurrentData();
					wpzoomOnboardingTour.openNextPointer( welcomePointer, currentPointerData );
				}

				if ( ! isPreparingPreview ) {
					$item.addClass('preparing-view-template');
					$item.find('.button-select-template').text( wpzoomOnboarding.labels.preparing_preview );
					$previewThumbnail.append('<div class="wpz-onboard_dot-elastic"></div>');

					onPreparingTemplatePreview( design, $form );
				}
			})
		})
	}

	/**
	 * Handles the demo content import step.
	 */
	function demoContentStep() {
		const $stepWrap     = $( '.step-import-demo', $wrapper ),
		      $importButton = $( '.wpz-onboard_import-button', $stepWrap );

		// $importButton.on( 'click', onDemoImportLoadClick );
	}

	function renderFinishSetupState( state ) {
		finishSetupState = state || {};

		const $tab = $wrapper.find( '.wpz-onboard_tab-finish-setup' );
		const $panel = $wrapper.find( '[data-id="#finish-setup"]' );
		const $badge = $tab.find( '.wpz-onboard_tab-count' );

		if ( ! finishSetupState.has_imported_demo || finishSetupState.dismissed ) {
			$tab.hide();
			$panel.hide();
			$tab.removeClass( 'is-complete' );

			if ( $tab.hasClass( 'active' ) ) {
				setTab( '#dashboard', true );
			}
			return;
		}

		$tab.show();
		$panel.show();
		$tab.toggleClass( 'is-complete', !! finishSetupState.is_complete );
		$badge
			.text( finishSetupState.is_complete ? wpzoomOnboarding.labels.finish_setup_done : ( finishSetupState.remaining_count || 0 ) )
			.attr( 'data-remaining-count', finishSetupState.remaining_count || 0 )
			.toggleClass( 'is-complete', !! finishSetupState.is_complete );

		(finishSetupState.sections || []).forEach(function( section ) {
			const $section = $panel.find( `.wpz-onboard_finish-setup-group[data-section-id="${section.id}"]` );
			$section.find( '.wpz-onboard_finish-setup-group-count' ).text( `${section.completed_count}/${section.total_count}` );

			(section.tasks || []).forEach(function( task ) {
				const $task = $section.find( `.wpz-onboard_finish-setup-task[data-task-id="${task.id}"]` );
				$task.toggleClass( 'is-complete', !! task.completed );
				$task.find( 'input[type="checkbox"]' ).prop( 'checked', !! task.completed );
			});
		});
	}

	function refreshFinishSetupState( callback ) {
		$.ajax( {
			type: 'POST',
			url: ajaxurl,
			data: {
				action: 'wpzoom_get_finish_setup_state',
				nonce: wpzoomOnboarding.finishSetupNonce
			}
		} ).done( function( response ) {
			if ( response && response.success && response.data ) {
				renderFinishSetupState( response.data );
				if ( typeof callback === 'function' ) {
					callback( response.data );
				}
			}
		} );
	}

	function finishSetupStep() {
		renderFinishSetupState( finishSetupState );

		$( document ).on( 'click', '.wpz-onboard_finish-setup-group-toggle', function() {
			const $group = $( this ).closest( '.wpz-onboard_finish-setup-group' );
			const isOpen = $group.hasClass( 'is-open' );

			$group.toggleClass( 'is-open', ! isOpen );
			$( this ).attr( 'aria-expanded', ! isOpen ? 'true' : 'false' );
		} );

		$( document ).on( 'change', '.wpz-onboard_finish-setup-task-check input[type="checkbox"]', function() {
			const $task = $( this ).closest( '.wpz-onboard_finish-setup-task' );
			const completed = $( this ).is( ':checked' ) ? '1' : '0';

			$.ajax( {
				type: 'POST',
				url: ajaxurl,
				data: {
					action: 'wpzoom_update_finish_setup_task',
					nonce: wpzoomOnboarding.finishSetupNonce,
					task_id: $task.attr( 'data-task-id' ),
					completed: completed
				}
			} ).done( function( response ) {
				if ( response && response.success && response.data ) {
					renderFinishSetupState( response.data );
				}
			} );
		} );

		$( document ).on( 'click', '.wpz-onboard_finish-setup-dismiss', function() {
			$.ajax( {
				type: 'POST',
				url: ajaxurl,
				data: {
					action: 'wpzoom_dismiss_finish_setup',
					nonce: wpzoomOnboarding.finishSetupNonce
				}
			} ).done( function( response ) {
				if ( response && response.success && response.data ) {
					renderFinishSetupState( response.data );
				}
			} );
		} );

		$( document ).on( 'wpzoom-demo-importer-import-done', function() {
			refreshFinishSetupState();
		} );

		$( 'body' ).on( 'wpzoom:load_demo_content:done', function() {
			refreshFinishSetupState();
		} );

		$( 'body' ).on( 'wpzoom:delete_demo_content:done', function() {
			refreshFinishSetupState();
		} );

		// After an import or a delete the page state (current demo card, "Imported" badges,
		// Finish Setup tab) is stale. The importer's close button only changes the URL hash,
		// which does not reload, so reload explicitly once the modal is closed.
		let demoContentChanged = false;
		$( 'body' ).on( 'wpzoom:load_demo_content:done wpzoom:delete_demo_content:done', function() {
			demoContentChanged = true;
		} );
		$( document ).on( 'wpzoom-demo-trigger-close-modal', function() {
			if ( demoContentChanged ) {
				demoContentChanged = false;
				window.location.reload();
			}
		} );
	}

	function getSelectedDemoItem() {
		return $wrapper.find( '.step-choose-design li.selected-template' ).first();
	}

	/**
	 * Step 1's Continue button is only shown while a demo is selected.
	 * Selecting a demo advances automatically, so this matters when the user
	 * comes back to step 1 (Back button, stepper header, reload).
	 */
	function updateChooseDesignNav() {
		$wrapper.find( '.step-choose-design .wpz-onboard_step-nav' ).prop( 'hidden', ! getSelectedDemoItem().length );
	}

	/**
	 * Handles the demo required only plugins.
	 * 	
	 * @param {string} builder The builder to process data for.
	 * 	
	 */
	 
	function demoPluginsSortableByBuilder() {

		const $stepWrap   = $( '.step-choose-design', $wrapper ),
		$stepWrapBuilders = $( '.step-choose-builder', $wrapper ),
		$builder          = $stepWrapBuilders.find( 'input:radio[name=builder]' ),
		pluginsWrapper    = $( '.step-install-plugins', $wrapper );
		pluginsForm       = $( '.wpz-onboard_content-main-step-content form', pluginsWrapper );

		if ( $builder.length > 1 ) {

			$selectedBuilder = $builder.filter(':checked');
			$( '.wpz-onboard_import-button' ).addClass( 'disabled' );

			pluginsWrapper.find( '[data-plugin-sortable=true]' ).hide();
			pluginsWrapper.find( '[data-plugin-sortable=true] input').prop('disabled', true );
			
			var design_id = $selectedBuilder.data('design-id');
			pluginClassname = '.required-demo-' + design_id;	

			pluginsWrapper.find( pluginClassname ).show();
			pluginsWrapper.find( pluginClassname + ' input').prop('disabled', false );

			updatePluginInstallButtons( pluginsForm );
			toggleSortablePluginsNotice();
			pluginsButtonState();

			$builder.on( 'change', function() {

				$( '.wpz-onboard_import-button' ).addClass( 'disabled' );

				pluginsWrapper.find( '[data-plugin-sortable=true]' ).hide();
				pluginsWrapper.find( '[data-plugin-sortable=true] input').prop('disabled', true );
				
				design_id = $(this).data('design-id');
				pluginClassname = '.required-demo-' + design_id;

				pluginsWrapper.find( pluginClassname ).show();
				pluginsWrapper.find( pluginClassname + ' input').prop('disabled', false );

				updatePluginInstallButtons( pluginsForm );
				toggleSortablePluginsNotice();
				pluginsButtonState();
				
			} );
		}

	}

	/**
	 * Handles the demo required only plugins.
	 */
	function demoPluginsSortable() {
		
		const $stepWrap   = $( '.step-choose-design', $wrapper ),
		$designItems      = $( '.wpz-onboard_content-main-step-content form > fieldset > ul > li', $stepWrap );
		pluginsWrapper    = $( '.step-install-plugins', $wrapper );
		pluginsForm       = $( '.wpz-onboard_content-main-step-content form', pluginsWrapper ), 

		//Hide required plugins if demo doesn't need them
		pluginsWrapper.find( '[data-plugin-sortable=true]' ).hide();
		pluginsWrapper.find( '[data-plugin-sortable=true] input' ).prop( 'disabled', true );
		toggleSortablePluginsNotice();

		$designItems.each( function() {

			const $item = $( this );
			const $previewThumbnail = $item.find( 'figure .preview-thumbnail' );
			const design_id         = $item.data( 'design-id' );
			const isSelected = $item.hasClass( 'selected-template' );

			if( isSelected ) {

				pluginClassname = '.required-demo-' + design_id;
				pluginsWrapper.find( pluginClassname ).show();
				pluginsWrapper.find( pluginClassname + ' input' ).prop( 'disabled', false );

				updatePluginInstallButtons( pluginsForm );
				toggleSortablePluginsNotice();
				pluginsButtonState();

			}

			$previewThumbnail.on('click', function( event ) {

				pluginsWrapper.find( '[data-plugin-sortable=true]' ).hide();
				pluginsWrapper.find( '[data-plugin-sortable=true] input').prop('disabled', true );
				event.preventDefault();

				pluginClassname = '.required-demo-' + design_id;
				pluginsWrapper.find( pluginClassname ).show();
				pluginsWrapper.find( pluginClassname + ' input').prop('disabled', false );

				updatePluginInstallButtons( pluginsForm );
				toggleSortablePluginsNotice();
				pluginsButtonState();

			})

		});
	}

	function toggleSortablePluginsNotice() {
		// The import step may be hidden by the stepper, so ":visible" cannot be used here.
		const shown = function() {
			return $( this ).css( 'display' ) !== 'none';
		};
		noticeWrapper = $( '.wpz-onboard_notice' );
		noticeWrapper.show();
		noticeWrapperPlugins = noticeWrapper.find('[data-plugin-slug]');
		noticeWrapperPlugins.each( function() {
			const $plugin = $(this);
			$plugin.show();
			const $pluginListed = $('#plugins-list').find( '.plugin_' + $plugin.data('plugin-slug') );
			if( $pluginListed.find( 'input' ).is(':disabled') ) {
				$plugin.hide();
			}
		})
		
		$('.wpz-onboard_import-button').addClass( 'disabled' );

		noticePluginReqInstall  = $( '.plugin-level_required[data-notice="notice_can_install_required"] ul' );
		noticePluginReq         = $( '.plugin-level_required[data-notice="notice_can_activate_required"] ul' );
		noticePluginsUp         = $( '.plugin-level_recommended[data-notice="notice_ask_to_update_maybe"] ul' );
		noticePluginsRec        = $( '.plugin-level_recommended[data-notice="notice_can_activate_recommended"] ul' );
		noticePluginsRecInstall = $( '.plugin-level_recommended[data-notice="notice_can_install_recommended"] ul' );

		noticePluginReqInstall.parent().show();
		noticePluginReq.parent().show();
		noticePluginsUp.parent().show();
		noticePluginsRec.parent().show();
		noticePluginsRecInstall.parent().show();

		if( noticePluginReqInstall.children().filter( shown ).length == 0 ) {
			noticePluginReqInstall.parent().hide();
		}
		if( noticePluginReq.children().filter( shown ).length == 0 ) {
			noticePluginReq.parent().hide();
		}
		if( noticePluginsUp.children().filter( shown ).length == 0 ) {
			noticePluginsUp.parent().hide();
		}
		if( noticePluginsRecInstall.children().filter( shown ).length == 0 ) {
			noticePluginsRecInstall.parent().hide();
		}
		if( noticePluginsRec.children().filter( shown ).length == 0 ) {
			noticePluginsRec.parent().hide();
		}

		if( noticeWrapper.find('> ul').children().filter( shown ).length == 0 && 
			noticePluginReq.children().filter( shown ).length == 0 && 
			noticePluginsRec.children().filter( shown ).length == 0 
		) {
			noticeWrapper.hide();
			$('.wpz-onboard_import-button').removeClass( 'disabled' );
		}
		
		// The "Skip recommended notices" link is handled once, at init (it calls toggleNotice()).

		updateChooseDesignNav();

		// Plugin deactivation handler
		$(document).on('click', '.wpzoom-deactivate-plugin', function(e) {
			e.preventDefault();
			
			const $button = $(this);
			const plugin = $button.data('plugin');
			const nonce = $button.data('nonce');
			
			if (!plugin || !nonce) {
				console.error('Plugin path or nonce missing');
				return;
			}
			
			$button.prop('disabled', true).text('Deactivating...');
			
			$.ajax({
				type: 'POST',
				url: ajaxurl,
				data: {
					action: 'wpzoom_deactivate_plugin',
					plugin: plugin,
					nonce: nonce
				},
				success: function(response) {
					if (response.success) {
						$button.removeClass('wpzoom-deactivate-plugin')
							   .addClass('button-disabled')
							   .text('Deactivated')
							   .prop('disabled', true);
						
						// Hide only the specific Query Monitor warning
						const $warningItem = $button.closest('li[data-notice="query-monitor-active"]');
						if ($warningItem.length) {
							$warningItem.fadeOut();
						}
						
						// Optionally reload compatibility warnings
						if (typeof window.wpzoomCheckCompatibility === 'function') {
							window.wpzoomCheckCompatibility();
						}
					} else {
						$button.prop('disabled', false).text('Deactivate Query Monitor');
						alert(response.data.message || 'Failed to deactivate plugin');
					}
				},
				error: function() {
					$button.prop('disabled', false).text('Deactivate Query Monitor');
					alert('AJAX request failed');
				}
			});
		});

	}

	/**
	 * Callback that is triggered when any of the checkboxes in the plugin install step have their value changed.
	 *
	 * @param {JQuery.ChangeEvent} event The Event object.
	 */
	function onPluginInstallCheckboxChange( event ) {
		event.preventDefault();

		if ( $( this ).is( ':not(:disabled)' ) ) {
			updatePluginInstallButtons( $( this ).closest( 'form' ) );
		}
	}

	/**
	 * Callback that is triggered when the submit button in the plugin install step is clicked.
	 *
	 * @param {JQuery.ClickEvent} event The Event object.
	 */
	function onPluginInstallSubmitClick( event ) {
		event.preventDefault();

		if ( $( this ).is( ':not(:disabled)' ) ) {
			const plugins = [];
			const $form            = $( this ).closest( 'form' ),
			      $fieldset        = $( '> fieldset', $form ),
			      $nonce           = $( 'input[name="wpzoom_required_plugins_nonce"]', $form ),
			      $checkboxes      = $( 'input[name="required_plugins[]"]:not(:disabled):checked', $form ),
			      checkboxesAmount = $checkboxes.length;

			if ( checkboxesAmount > 0 ) {
				$fieldset.attr( 'disabled', true );
				$checkboxes.each( function( index ) {
					const $checkbox = $( this );
					const slug = $checkbox.val();
					plugins.push(slug);
				} );

				if ( plugins.length ) {
					$.ajax( {
						type: 'POST',
						url: ajaxurl,
						data: {
							action: 'wpzoom_required_plugins',
							nonce: $nonce.val(),
							plugins
						},
						beforeSend: () => {
							$.each(plugins, (_, plugin) => {
								const $li = $form.find(`.plugins-list > tbody > tr.plugin_${plugin}`);
								$li.addClass('plugin-is-installing');
							});
						}
					} ).done((response) => {
						if ( response.success ) {
							const data = response.data || false;
							const error = data && data.error;
							const success = data && data.success;

							if ( ! data ) {
								alert( wpzoomOnboarding.labels.something_wrong );
								return;
							}

							const processItem = (slug, time) => {
								var dfd = $.Deferred();

								setTimeout(() => {
									const $li = $form.find(`.plugins-list > tbody > tr.plugin_${slug}`);
									const $checkbox = $li.find(`input[type="checkbox"]`);

									// Unconscious mistake.
									if ( typeof $li[0] === 'undefined' ) {
										return;
									}

									$li.removeClass( 'plugin-is-installing' );
									$li[0].className = $li[0].className.replace( /plugin-status_\S+/ig, '' );
									// Only remove status badge, keep requirement badge
									$li.find('.plugin-status .plugin-badge').remove();
									$checkbox.prop( 'disabled', true );

									if ( typeof error[slug] !== 'undefined' ) {
										$li.addClass( 'plugin-status_inactive' );
										$li.find('.plugin-status').html('<span class="plugin-badge">' + error[slug].message + '</span>');
									} else if ( typeof success[slug] !== 'undefined' ) {
										$li.addClass( 'plugin-status_active' );
										$li.find('.plugin-status').html('<span class="plugin-badge">' + wpzoomOnboarding.labels.active + '</span>');

										// Store active plugins.
										activePlugins.push(slug);
									}

									dfd.resolve(slug);
								}, time);

								return dfd.promise();
							}

							const everythingDone = () => {
								$fieldset.attr( 'disabled', false );
		
								/**
								 * Open next pointer.
								 */
								if ( window.hasOwnProperty('wpzoomOnboardingTour') && wpzoomOnboardingTour.currentTarget ) {
									$(window).trigger('wpzoom-onboarding-pointer.defer_loading', wpzoomOnboardingTour.currentIndex + 1);
								}
								
								updatePluginInstallButtons( $form );
								toggleSortablePluginsNotice();
								toggleNotice( data );
								gotoNextStep('#step-import-demo');
							}

							let time = 500;
							const promises = [];
							$.each(plugins, (_, slug) => {
								promises.push(processItem(slug, time));
								time += 500;
							})

							$.when.apply($, promises).then(everythingDone);
						} else {
							const data = response.data || false;
							const msg = data || '[NONE]';
							
							$.when(
								$.each(plugins, (_, slug) => {
									const $li = $form.find(`.plugins-list > tbody > tr.plugin_${slug}`);
									const $checkbox = $li.find(`input[type="checkbox"]`);

									// Unconscious mistake.
									if ( typeof $li[0] === 'undefined' ) {
										return;
									}

									$li.removeClass( 'plugin-is-installing' );
									$checkbox.prop( 'disabled', false );
								})
							).then(() => {
								setTimeout(() => {
									alert( wpzoomOnboarding.labels.install_failed + msg );
								}, 200)
							})
						}
					})
					.fail(function (jqXHR) {
						$.each(plugins, (_, plugin) => {
							const $li = $form.find(`.plugins-list > tbody > tr.plugin_${plugin}`);
							$li.removeClass('plugin-is-installing');
						});
						$form.find('.plugins-list').after(`<p class="update-nag notice notice-error" style="display: block; margin-left: 0;">The server responded with a status of ${jqXHR.status} (${jqXHR.statusText}). Reload the page and try again.</p>`);
					})
				}
			}
		}
	}

	function pluginsButtonState() {

		const $step = $wrapper.find( '.step-install-plugins' );
		const $form = $( 'form', $step );
	
		// Disable the buttons when every listed plugin (for the selected builder) is already active.
		const $rows = getShownPluginRows();
		if ( $rows.length > 0 && $rows.length === $rows.filter( '.plugin-status_active' ).length ) {
			$( 'input[name="button_submit"]', $form ).attr( 'disabled', true );
			$( 'input[name="button_checkall"]', $form ).attr( 'disabled', true );
		} 
	}
	
	/**
	 * Callback that is triggered when the button to toggle all checkboxes in the plugin install step is clicked.
	 *
	 * @param {JQuery.ClickEvent} event The Event object.
	 */
	function onPluginInstallCheckboxesToggleClick( event ) {
		event.preventDefault();

		const $form = $( this ).closest( 'form' );

		$( 'input[name="required_plugins[]"]:not(:disabled)', $form ).prop( 'checked', !( $( this ).val() == wpzoomOnboarding.labels.check_label_none ) );

		updatePluginInstallButtons( $form );
	}

	/**
	 * Updates the state of the main buttons in the plugin install step.
	 *
	 * @param {JQuery} $form The form where the buttons are located.
	 */
	function updatePluginInstallButtons( $form ) {
		const $checkboxes   = $( 'input[name="required_plugins[]"]:not(:disabled)', $form ),
		      totalAmount   = $checkboxes.length,
		      noCheckboxes  = totalAmount <= 0,
		      checkedAmount = $checkboxes.filter( ':checked' ).length,
		      allChecked    = checkedAmount == totalAmount,
		      someChecked   = checkedAmount > 0,
		      noneChecked   = checkedAmount == 0,
		      checkLabel    = allChecked ? wpzoomOnboarding.labels.check_label_none : wpzoomOnboarding.labels.check_label_all;

		$( 'input[name="button_submit"]', $form ).attr( 'disabled', ( noCheckboxes || noneChecked ) );
		$( 'input[name="button_checkall"]', $form ).val( checkLabel ).attr( 'disabled', noCheckboxes );
	}

	/**
	 * Callback that is triggered when the theme design is changed in the theme design step.
	 *
	 * @param {jQuery} $item The design item which was clicked.
	 * @param {string} design Design to process data for. Meant to be value of selected design.
	 * @param {jQuery} $form Form where the designs are located.
	 * @param {jQuery} $designItems All available design items.
	 */
	function onThemeDesignChange( $item, design, $form, $designItems ) {
		const processTemplateDataDone = (status) => {
			if ( status.success ) {
				const selectedTemplate = $item.find('h5').html();
				$form.closest( '.wpz-onboard_content-main-steps' ).find( '.step-choose-builder' ).removeClass( 'is-unavailable' );

				let builderSupport = $item.data('builders-support');

				if( ! builderSupport ) {
					$form.closest( '.wpz-onboard_content-main-steps' ).find( '.step-choose-builder' ).addClass( 'is-unavailable' );
				}

				if( builderSupport ) {
					let radiosHtml = '';
					Object.keys( builderSupport ).forEach( key => {

						console.log( builderSupport[ key ] );

						let label = key === 'elementor' ? 'Elementor' : 'Block Editor';
						let value = `https://www.wpzoom.com/downloads/xml/inspiro-${builderSupport[key]}.xml`;
						let design_name = builderSupport[ key ].name;

						radiosHtml += `
							<radio class="${key}-builder">
								<input type="radio" data-design-name="${design_name}" data-theme-design="${ builderSupport[key].id }" data-design-id="${ builderSupport[key].design_id }" id="${key}" name="builder" value="${value}" ${key === 'elementor' ? 'checked' : ''}>
								<label for="${key}">${label}</label>
							</radio>
						`;
					});

					$form.closest( '.wpz-onboard_content-main-steps' ).find( '.step-choose-builder .wpz-onboard_content-main-step-content' ).html(radiosHtml);

					builderSelectionStep();
					demoPluginsSortableByBuilder();

				}

				// Update the selected template.

				$item.removeClass('preparing-view-template').addClass('selected-template');
				$item.find('.wpz-onboard_dot-elastic').remove();
				$item.find('input[name="theme_designs"]').prop('checked', true);

				if ( status.data.imported ) {
					$item.addClass('imported-demo-content');
					$item.find('.button-select-template').text( wpzoomOnboarding.labels.imported );
				} else {
					$item.find('.button-select-template').text( wpzoomOnboarding.labels.selected );
				}

				// Remove selected state from other items, but preserve imported-demo-content class 
				// for items that actually have imported content (have delete button)
				$designItems.not($item).removeClass('selected-template');
				$designItems.not($item).each(function() {
					var $otherItem = $(this);
					// Only remove imported-demo-content class if this item doesn't have a delete button
					// (meaning it wasn't originally imported)
					if ($otherItem.find('.delete-imported-demo-content').length === 0) {
						$otherItem.removeClass('imported-demo-content');
					}
				});
				$designItems.not($item).find('input[name="theme_designs"]').prop('checked', false);
				$designItems.not($item).find('.button-select-template').text( wpzoomOnboarding.labels.select_template );

				// Update import section with selected demo
				const $importSection = $form.closest( '.wpz-onboard_content-main-steps' ).find( '.step-import-demo .wpz-onboard_selected-template' );
				// Restore original format: "Selected demo: [Name]"
				$importSection.html((wpzoomOnboarding.labels.label_template || 'Selected demo:') + ' <strong>' + selectedTemplate + '</strong>');
				
				// Re-evaluate the plugin gate for the selected demo: the button is enabled only
				// when no required-plugin notice is pending (toggleSortablePluginsNotice() handles
				// that), instead of being force-enabled regardless of the notices.
				$('.step-import-demo .wpz-onboard_import-button').prop('disabled', false);
				toggleSortablePluginsNotice();
				updateChooseDesignNav();
				updateStepperNav();

				// Selecting a demo on the first step moves the user straight to the next step.
				if ( currentStep === '#step-choose-design' ) {
					const nextStep = getAdjacentStep( '#step-choose-design', 1 );
					if ( nextStep ) {
						showStep( nextStep );
					}
				}

			} else {
				// TODO: add code here when processing template data has error.
			}
		}

		$.when(window.demoImporter.processTemplateData(design)).then(processTemplateDataDone);
	}

	/**
	 * Callback that is triggered when any of the view pages links in the theme design step are clicked.
	 *
	 * @param {string} design Design slug to prepare preview for.
	 * @param {jQuery} $form Form.
	 */
	function onPreparingTemplatePreview( design, $form ) {
		const $nonce = $( 'input[name="wpzoom_theme_design_nonce"]', $form );

		$.ajax( {
			type: 'POST',
			url: ajaxurl,
			data: {
				action: 'wpzoom_get_theme_design',
				nonce: $nonce.val(),
				design: design
			}
		} ).done( function( msg ) {
			if ( msg.success && msg.data ) {
				const $contentWrapper = $form.closest( '.wpz-onboard_content-wrapper' ),
					  $contentOverlay = $contentWrapper.find( '.wpz-onboard_content-overlay' ),
					  data            = msg.data;

				const noticeIsShown = () => $('.wpz-onboard_notice', $contentWrapper).filter(function(){ return $(this).css('display') !== 'none'; }).length > 0;
				let hasNotices = noticeIsShown();
				const canSkipNotice = $('#wpz-onboard-skip-notice', $contentWrapper).length > 0;
				let currentPointerData, overlayPointer;

				/**
				 * Open content overlay pointer.
				 */
				if ( window.hasOwnProperty('wpzoomOnboardingTour') && wpzoomOnboardingTour.currentTarget ) {
					overlayPointer = wpzoomOnboardingTour.getPointerByPage('content-overlay');
					currentPointerData = wpzoomOnboardingTour.getCurrentData();
					wpzoomOnboardingTour.openNextPointer( currentPointerData, overlayPointer );
				}

				$form.find(`li.design_${design}`).removeClass('preparing-view-template');
				$form.find(`li.design_${design} .wpz-onboard_dot-elastic`).remove();
				if ( $form.find(`li.design_${design}`).hasClass('selected-template') ) {
					$form.find(`li.design_${design} .button-select-template`).text( wpzoomOnboarding.labels.selected );
				} else {
					$form.find(`li.design_${design} .button-select-template`).text( wpzoomOnboarding.labels.select_template );
				}
				
				$( '.wpz-onboard_content-overlay-design-pages-title', $contentOverlay ).text( data.name );
				$( '.wpz-onboard_content-overlay-design-pages-preview-link', $contentOverlay ).attr( 'href', data.preview_url );
				$( '.wpz-onboard_content-overlay-design-import-demo-content', $contentOverlay ).attr( 'data-design-id', design );

				$.each( data.preview_pages, function( index, value ) {
					$( '<li' + ( index == 0 ? ' class="selected"' : '' ) + '><strong>' + value.name + '</strong></li>' )
						.appendTo( '.wpz-onboard_content-overlay-design-pages-thumbs' )
						.css( 'background-image', 'url("' + value.thumbnail + '")' )
						.on( 'click', function( e ) {
							e.preventDefault();

							if ( ! $( this ).hasClass( 'selected' ) ) {
								$( this ).closest( '.wpz-onboard_content-overlay-design-pages-thumbs' ).find( 'li' ).removeClass( 'selected' );
								$( '.wpz-onboard_content-overlay-design-pages-right-pane', $contentOverlay ).html( value.preview_img );
								$( this ).addClass( 'selected' );
							}
						} );
				} );

				$( '.wpz-onboard_content-overlay-design-pages-right-pane', $contentOverlay ).html( data.preview_pages[0].preview_img );

				$( '.go-back-link', $contentOverlay ).on( 'click', function( e ) {
					e.preventDefault();

					$( '.wpz-onboard_content-overlay-design-pages-thumbs', $contentOverlay ).html( '' );
					$( '.wpz-onboard_content-overlay-design-pages-right-pane', $contentOverlay ).html( '' );

					$contentOverlay.removeClass( 'active' );
					$contentWrapper.find( '.wpz-onboard_content' ).addClass( 'active' );

					// Removed auto-scroll - stay on current view
					// gotoNextStep('#step-choose-design');

					/**
					 * Open previous pointer.
					 */
					if ( currentPointerData && overlayPointer ) {
						wpzoomOnboardingTour.openNextPointer(overlayPointer, currentPointerData);
					}
				} );

				$('.wpz-onboard_content-overlay-design-import-demo-content', $contentOverlay).on('click', function(e) {
					e.preventDefault();
					e.stopPropagation();

					const designId = $(this).attr('data-design-id');
					const triggerImportContent = () => {
						if ( canSkipNotice ) {
							// Skip recommended notice.
							$('#wpz-onboard-skip-notice', $contentWrapper).trigger('click');
						} else {
							$(document).trigger( 'wpzoom-onboard-skip-notice' );
						}
					}

					$('.wpz-onboard_import-button', $contentWrapper).attr('data-processing-design', designId);
					$( '.wpz-onboard_content-overlay-design-pages-thumbs', $contentOverlay ).html( '' );
					$( '.wpz-onboard_content-overlay-design-pages-right-pane > img', $contentOverlay ).attr( 'src', '' );

					$contentOverlay.removeClass( 'active' );
					$contentWrapper.find( '.wpz-onboard_content' ).addClass( 'active' );

					// Removed auto-scroll - stay on current view after demo selection  
					// gotoNextStep('#step-import-demo');

					// Check to select design and prepare template data.
					if ( ! $form.find(`li.design_${designId}`).hasClass('selected-template') ) {
						$form.find(`li.design_${designId} figure .preview-thumbnail`).trigger('click');
					} else {
						triggerImportContent();
					}

					$('input[name="wpzoom-wxr-url"]', $contentWrapper).bind('change', function(){
						triggerImportContent();
					});
				});

				$(document).on('wpzoom-onboard-skip-notice', () => {
					const isDesignProcess = $('.wpz-onboard_import-button', $contentWrapper).attr('data-processing-design');
					hasNotices = noticeIsShown();

					// Remove events listener.
					$(document).off('wpzoom-onboard-skip-notice');
					$('.wpz-onboard_content-overlay-design-import-demo-content', $contentOverlay).off('click');
					$('#wpz-onboard-skip-notice', $contentWrapper).off('click');
					$('.wpz-onboard_import-button', $contentWrapper).off('click');
					$('input[name="wpzoom-wxr-url"]', $contentWrapper).off('change');

					// Trigger Import demo content button.
					if ( isDesignProcess && ! hasNotices ) {
						$('.wpz-onboard_import-button', $contentWrapper).removeAttr('data-processing-design');
						$('.wpz-onboard_import-button', $contentWrapper).trigger('click');

						if ( window.hasOwnProperty('wpzoomOnboardingTour') ) {
							wpzoomOnboardingTour.destroyPointers();
							wpzoomOnboardingTour.dismissPointer();
						}
					}

					gotoNextStep('#step-install-plugins');
				});

				$contentWrapper.find( '.wpz-onboard_content' ).removeClass( 'active' );
				$contentOverlay.addClass( 'active' );

				$( 'html, body' ).animate( { scrollTop: 0 }, 'slow' );
			}
		} );
	}

	/**
	 * Callback that is triggered when the load button in the demo content import step is clicked.
	 *
	 * @param {JQuery.ClickEvent} event The Event object.
	 */
	function onDemoImportLoadClick( event ) {
		event.preventDefault();

		if ( ! $( this ).hasClass( 'disabled' ) ) {
			window.demoImporter.openSelectDemoModal();
		}
	}

	/**
	 * Scroll animation after step is done.
	 * 
	 * @param {string} hash The hash id of section to scroll for.
	 */
	function gotoNextStep( hash ) {
		if ( STEP_ORDER.indexOf( hash ) === -1 ) {
			return;
		}

		const $activeTab = $( '#wpz-onboard_tabs .wpz-onboard_tab.active a' );
		if ( $activeTab.attr( 'href' ) !== '#demo-importer' ) {
			setTab( '#demo-importer' );
		}

		showStep( hash );
	}

	/**
	 * Toggle notice if all required plugins are active.
	 * 
	 * @param {bool|object} data AJAX response data or custom data value.
	 * @param {string} elementId DOM element id. Default: 'step-import-demo'.
	 */
	function toggleNotice( data = false, elementId = 'step-import-demo' ) {
		const compatibilities = wpzoomOnboarding.compatibilities;
		const $el = $(document).find(`#${elementId}`);
		
		if ( ! $el.length ) {
			return;
		}

		const $noticeWrapper = $el.find('.wpz-onboard_notice');

		// Entries that don't apply to the selected demo are hidden (display: none) by
		// toggleSortablePluginsNotice(), not removed, so ":empty" must not be used here.
		const isShown = function() {
			return $( this ).css( 'display' ) !== 'none';
		};
		const removeNoticeBox = ($wrapper = '') => {
			$wrapper = $wrapper || $noticeWrapper;

			if ( $wrapper.find('> ul > li').filter( isShown ).length === 0 ) {
				$wrapper.hide();
			}

			if ( $noticeWrapper.find('> ul > li').filter( isShown ).length === 0 ) {
				// Hide rather than remove: selecting another demo later re-evaluates the
				// hidden required-plugin entries and shows the box again if needed.
				$noticeWrapper.hide();
				$el.find('.wpz-onboard_import-button').removeClass('disabled');
				$(document).trigger('wpzoom-onboard-remove-notice');
			}
		}

		const rebuildNoticeBox = ( notice, noticeData ) => {
			if ( ! noticeData.title || ! noticeData.description ) {
				return;
			}
			if ( $noticeWrapper.length ) {
				$el.find(`li[data-notice="${notice}"]`).remove();
				$el.find('.wpz-onboard_notice > ul').prepend(`<li class="plugin-level_required" data-notice="${notice}"><h3>${noticeData.title}<span class="plugin-badge">Required</span></h3>${noticeData.description}</li>`);
			} else {
				$el.find('.wpz-onboard_content-main-step-content').prepend('<div class="wpz-onboard_notice"><ul></ul></div>');
				$el.find('.wpz-onboard_notice > ul').prepend(`<li class="plugin-level_required" data-notice="${notice}"><h3>${noticeData.title}<span class="plugin-badge">Required</span></h3>${noticeData.description}</li>`);
			}
		}

		const updateCompatibilities = ( notice, type = 'errors' ) => {
			if ( wpzoomOnboarding.compatibilities[ type ] && wpzoomOnboarding.compatibilities[ type ][ notice ] ) {
				delete wpzoomOnboarding.compatibilities[ type ][ notice ];
			}
		}

		// Loop errors.
		for (const notice in compatibilities.errors) {
			const $noticeItem = $noticeWrapper.find(`ul li[data-notice="${notice}"]`);
			const plugins = $noticeItem.find('li[data-plugin-slug]');

			if ( notice === 'notice_can_activate_required' || notice === 'notice_can_install_required' ) {
				for (const plugin of plugins) {
					const slug = plugin.getAttribute('data-plugin-slug');

					// Check plugin is activated to remove from notice warning.
					if ( activePlugins.length && activePlugins.includes(slug) ) {
						const $pluginElement = $noticeItem.find(`li[data-plugin-slug="${slug}"]`);
						if ($pluginElement.length) {
							$pluginElement.fadeOut('100', function(){
								$pluginElement.remove();
								removeNoticeBox( $noticeItem );
								updateCompatibilities( notice );
							});
						}
					}
				}
			}

			if( notice === 'woocomerce-enabled' ) {
				$el.find('.wpz-onboard_import-button').addClass('disabled');
				updateCompatibilities( notice );
			}

			if ( notice === 'empty_license_key' || notice === 'inactive_license_key' || notice === 'expired_license_key' ) {
				if ( typeof data === 'object' && data.licenseStatus ) {
					const noticeData = ( data.notice && data.notice[ notice ] ) || compatibilities.errors[ notice ];
					const licenseStatus = data.licenseStatus;
					
					if ( 'valid' === licenseStatus ) {
						$noticeItem.remove();
						removeNoticeBox();
						updateCompatibilities( notice );
					} else {
						$el.find('.wpz-onboard_import-button').addClass('disabled');
						rebuildNoticeBox( notice, noticeData );
						updateCompatibilities( notice );
					}
				}
			}
		}

		// Loop warnings.
		for (const notice in compatibilities.warnings) {
			const $noticeItem = $noticeWrapper.find(`ul li[data-notice="${notice}"]`);
			const plugins = $noticeItem.find('li[data-plugin-slug]');

			if ( notice === 'notice_can_activate_recommended' || notice === 'notice_can_install_recommended' ) {
				for (const plugin of plugins) {
					const slug = plugin.getAttribute('data-plugin-slug');

					// Check plugin is activated to remove from notice warning.
					if ( activePlugins.length && activePlugins.includes(slug) ) {
						const $pluginElement = $noticeItem.find(`li[data-plugin-slug="${slug}"]`);
						if ($pluginElement.length) {
							$pluginElement.fadeOut('100', function(){
								$pluginElement.remove();
								removeNoticeBox( $noticeItem );
								updateCompatibilities( notice, 'warnings' );
							});	
						}
					}
				}
			}
		}

		// Skip recommended notice.
		if ( ! data ) {
			const $recommended = $noticeWrapper.find('ul li.plugin-level_recommended');
			$recommended.fadeOut('100', function(){
				$recommended.remove();
				removeNoticeBox();
				$(document).trigger('wpzoom-onboard-skip-notice');

				/**
				 * Open next pointer.
				 */
				if ( window.hasOwnProperty('wpzoomOnboardingTour') && wpzoomOnboardingTour.currentTarget ) {
					const currentData = wpzoomOnboardingTour.getNextData(wpzoomOnboardingTour.currentIndex);
					let index = wpzoomOnboardingTour.currentIndex + 1;

					wpzoomOnboardingTour.createPointer(currentData, index);

					if ( ! wpzoomOnboardingTour.hasSelectorInDOM(currentData.selector) ) {
						// Go to next pointer if selector was not found in DOM.
						const nextData = wpzoomOnboardingTour.getNextData(index);
						wpzoomOnboardingTour.createPointer(nextData, index, true);
						index = wpzoomOnboardingTour.getPointer(nextData, true);
					}

					$(window).trigger('wpzoom-onboarding-pointer.defer_loading', index );
				}
			});
		}
	}

	function activateLicenseKey() {
		const $licenseTabPanel = $wrapper.find('.wpz-onboard_content-main .wpz-onboard_content-main-license');
		const $form = $licenseTabPanel.find('form');
		const $licenseInput = $form.find('input[name="license_key"]');
		const $licenseLabel = $form.find('label[for="wpzoom_license_key"]');
		const prevLicenseKey = $licenseInput.val();

		$form.on('click', '.wpz-onboard_content-main-license-submit', function(event){
			event.preventDefault();
			const $saveActivateButton = $(this).parent().find('input.button-primary');
			const $licenseNote = $saveActivateButton.closest('fieldset').find('.wpz-onboard_content-main-license-note');
			const $licenseTabItem = $wrapper.find('#wpz-onboard_tabs .wpz-onboard_tab-license');
			const nonce = $form.find('input[name="wpzoom_set_license_nonce"]').val();
			const licenseKey = $licenseInput.val();
			const prevLicenseNote = $licenseNote.html();
			let actionName = $form.find('input[name="action"]').val();

			if (typeof $(this).attr('data-deactivate-action') !== 'undefined') {
				actionName = $(this).attr('data-deactivate-action');
			}

			$.ajax( {
				type: 'POST',
				url: ajaxurl,
				data: {
					action: actionName,
					license: licenseKey,
					prev_license_key: prevLicenseKey,
					nonce,
				},
				beforeSend: () => {
					$(this).attr('disabled', true);
					if ( actionName === 'wpzoom_set_license' ) {
						$licenseNote.text(wpzoomOnboarding.labels.saving_license);
					} else if ( actionName === 'wpzoom_deactivate_license' ) {
						$licenseNote.text(wpzoomOnboarding.labels.deactivating_license);
					}
				}
			} ).done((response) => {
				const data = response.data;
				const message = data.message || wpzoomOnboarding.labels.something_wrong_license;
				const licenseStatus = data.status || 'invalid';
				const deactivateBtn = `<input type="submit" value="${wpzoomOnboarding.labels.deactivate_license}" class="wpz-onboard_content-main-license-submit button button-secondary" data-deactivate-action="wpzoom_deactivate_license">`;
				const $deactivateButton = $form.find('input[data-deactivate-action="wpzoom_deactivate_license"]');

				// Merge global variable 'wpzoomOnboarding.compatibilities' with received notice object from AJAX response.
				if ( data.notice && typeof data.notice === 'object' ) {
					wpzoomOnboarding.compatibilities.errors = { ...data.notice, ...wpzoomOnboarding.compatibilities.errors };
				}

				$(this).attr('disabled', false);
				$licenseInput.attr('data-license-status', licenseStatus);

				if ( ! $licenseLabel.find('.label-badge').length > 0 ) {
					$licenseLabel.append('<span class="label-badge"></span>');
				}
				if ( data.label ) {
					$licenseLabel.find('.label-badge').attr('data-license-status', licenseStatus).text(data.label).show();
				} else {
					$licenseLabel.find('.label-badge').attr('data-license-status', licenseStatus).hide();
				}

				if ( response.success ) {
					if ( actionName === 'wpzoom_set_license' ) {
						if ( ! $deactivateButton.length ) {
							$saveActivateButton.attr('disabled', true).after(deactivateBtn);
						}
						$licenseTabItem.find('span[class^="license-status"]').remove();
					} else if ( actionName === 'wpzoom_deactivate_license' ) {
						$saveActivateButton.attr('disabled', false);
						$deactivateButton.remove();
						$licenseTabItem.find('> a').append(`<span class="license-status-${licenseStatus}-badge"></span>`);
					}
					$licenseNote.html(message);
				} else {
					if ( actionName === 'wpzoom_deactivate_license' && prevLicenseKey !== licenseKey ) {
						$licenseInput.val(prevLicenseKey);
						$licenseNote.html(prevLicenseNote);
						$saveActivateButton.attr('disabled', true);
					} else {
						$saveActivateButton.attr('disabled', false);
						$deactivateButton.remove();
						$licenseNote.html(message);
					}
					$licenseTabItem.find('> a').append(`<span class="license-status-${licenseStatus}-badge"></span>`);
				}

				// Display quick start tab if license was activated successfully.
				// if ( 'valid' === licenseStatus ) {
				// 	setTimeout( () => {
				// 		setTab( '#quick-start', true );
				// 	}, 500 );
				// }

				toggleNotice( {
					licenseStatus,
					licenseKey,
					notice: data.notice
				} );
			});
		});

		// Watch for input value changes to enable "Save & Activate" button.
		$form.on('input', 'input[name="license_key"]', function() {
			const $input = $(this);
			const $saveActivateButton = $input.parent().find('input.button-primary');
			const $deactivateButton = $input.parent().find('input[data-deactivate-action="wpzoom_deactivate_license"]');
			const licenseStatus = $input.attr('data-license-status');
			const inputValue = $input.val();

			if ( $saveActivateButton.prop('disabled') ) {
				$saveActivateButton.attr('disabled', false);
			} else if ( prevLicenseKey === inputValue && $deactivateButton.length && licenseStatus === 'valid' ) {
				$saveActivateButton.attr('disabled', true);
			}
		});
	}

	// Track current filter states
	let currentBuilderFilter = 'all';
	let currentCategoryFilter = 'all';
	let currentSearchTerm = '';
	let categoryOverflowResizeTimer = null;
	const categoryFiltersConfig = [
		{ filter: 'all', selector: '.show-all-categories', label: 'All Categories' },
		{ filter: 'business', selector: '.show-business', label: 'Business' },
		{ filter: 'woocommerce', selector: '.show-woocommerce', label: 'WooCommerce' },
		{ filter: 'portfolio', selector: '.show-portfolio', label: 'Portfolio' },
		{ filter: 'creative', selector: '.show-creative', label: 'Creative' },
		{ filter: 'video', selector: '.show-video', label: 'Video' },
		{ filter: 'photography', selector: '.show-photography', label: 'Photography' },
		{ filter: 'food', selector: '.show-food', label: 'Food & Restaurant' },
		{ filter: 'health', selector: '.show-health', label: 'Health' },
		{ filter: 'sport', selector: '.show-sport', label: 'Sport' },
		{ filter: 'nonprofit', selector: '.show-nonprofit', label: 'Non-profit' },
		{ filter: 'education', selector: '.show-education', label: 'Education' },
		{ filter: 'construction', selector: '.show-construction', label: 'Construction' },
		{ filter: 'realestate', selector: '.show-realestate', label: 'Real Estate & Architecture' },
		{ filter: 'magazine', selector: '.show-magazine', label: 'Magazine' },
		{ filter: 'auto', selector: '.show-auto', label: 'Automotive' }
	];

	function closeCategoryOverflowMenu() {
		const $overflow = $('.category-filters__overflow');
		$overflow.removeClass('is-open');
		$overflow.find('.category-filters__overflow-toggle').attr('aria-expanded', 'false');
	}

	function syncCategoryOverflow() {
		$('.category-filters').each(function() {
			const $filters = $(this);
			const $list = $filters.find('.category-filters__list');
			const $overflow = $filters.find('.category-filters__overflow');
			const $toggle = $overflow.find('.category-filters__overflow-toggle');
			const $menu = $overflow.find('.category-filters__overflow-menu');
			const $allLinks = $filters.find('a[data-filter]');

			$allLinks.each(function() {
				$list.append(this);
			});

			$menu.empty();
			$overflow.prop('hidden', true).removeClass('is-open').css({ display: '', visibility: '' });
			$toggle.attr('aria-expanded', 'false');

			const $visibleLinks = $allLinks.filter(function() {
				return this.style.display !== 'none';
			});

			if (!$visibleLinks.length || $list[0].scrollWidth <= $filters.innerWidth()) {
				return;
			}

			$overflow.prop('hidden', false).css({
				display: 'flex',
				visibility: 'hidden'
			});

			const availableWidth = $filters.innerWidth() - $overflow.outerWidth(true);

			while ($visibleLinks.length && $list[0].scrollWidth > availableWidth) {
				const $candidate = $list.children('a[data-filter]').filter(function() {
					const $link = $(this);
					const isHidden = this.style.display === 'none';
					const isActive = $link.hasClass('active');
					const isActiveAll = $link.hasClass('show-all-categories') && isActive;

					return !isHidden && !isActive && !isActiveAll;
				}).last();

				if (!$candidate.length) {
					break;
				}

				$menu.prepend($candidate);
			}

			if ($menu.children().length) {
				$overflow.css({ display: '', visibility: '' }).prop('hidden', false);
			} else {
				$overflow.prop('hidden', true).css({ display: '', visibility: '' });
			}
		});
	}

	function applyFilters() {
		var $allDemos = $(".wpz-onboard_content-main-step-content ul li[data-design-id]");
		var blockDemos = $(".wpz-onboard_content-main-step-content ul li[data-design-id].is-block-design");
		
		// Reset selected state for all demos when filtering (unless showing all)
		if (currentBuilderFilter !== 'all' || currentCategoryFilter !== 'all' || currentSearchTerm !== '') {
			$allDemos.removeClass('selected-template');
			$allDemos.find('.button-select-template').text(wpzoomOnboarding.labels.select_template || 'Select');
			$allDemos.find('input[name="theme_designs"]').prop('checked', false);
			
			// Update import demo section to show no demo selected
			const $importTemplate = $('.step-import-demo .wpz-onboard_selected-template');
			$importTemplate.html('<span class="no-selection">No demo selected. Please select a demo above to continue.</span>');
			
			// Disable import button when no demo is selected
			$('.step-import-demo .wpz-onboard_import-button').addClass('disabled').prop('disabled', true);
			updateChooseDesignNav();
		} else {
			// When showing all, check if there's a currently selected demo and restore proper display
			const $selectedDemo = $allDemos.filter('.selected-template').first();
			if ($selectedDemo.length > 0) {
				const selectedName = $selectedDemo.find('figcaption h5').text();
				if (selectedName) {
					const $importSection = $('.step-import-demo .wpz-onboard_selected-template');
					$importSection.html((wpzoomOnboarding.labels.label_template || 'Selected demo:') + ' <strong>' + selectedName + '</strong>');
				}
			}

			updateChooseDesignNav();
		}
		
		// Start with all demos
		let $filteredDemos = $allDemos;
		
		// Apply builder filter first
		if (currentBuilderFilter === 'elementor') {
			$filteredDemos = $allDemos.not('.is-block-design');
			$allDemos.find('.supported-by img.wpzoom-icon-gutenberg').hide();
			$allDemos.find('.supported-by img.wpzoom-icon-elementor').show();
		} else if (currentBuilderFilter === 'block') {
			$filteredDemos = blockDemos;
			$filteredDemos.find('.supported-by img.wpzoom-icon-gutenberg').show();
			$filteredDemos.find('.supported-by img.wpzoom-icon-elementor').hide();
		} else {
			$allDemos.find('.supported-by img').show();
		}
		
		// Apply category filter on top of builder filter
		if (currentCategoryFilter !== 'all') {
			$filteredDemos = $filteredDemos.filter(function() {
				var categories = $(this).attr('data-category') || '';
				// Split by space to handle multiple categories
				var categoryArray = categories.split(' ');
				return categoryArray.indexOf(currentCategoryFilter) !== -1;
			});
		}

		// Apply search filter on top of builder + category filters
		if (currentSearchTerm !== '') {
			var searchLower = currentSearchTerm.toLowerCase();
			$filteredDemos = $filteredDemos.filter(function() {
				var demoName = $(this).find('figcaption h5').text().toLowerCase();
				var categories = ($(this).attr('data-category') || '').toLowerCase();
				var keywords = ($(this).attr('data-keywords') || '').toLowerCase();
				return demoName.indexOf(searchLower) !== -1 ||
					categories.indexOf(searchLower) !== -1 ||
					keywords.indexOf(searchLower) !== -1;
			});
		}

		// Show/hide demos based on combined filters
		$allDemos.addClass('fade-out');
		$filteredDemos.removeClass('fade-out').addClass('fade-in');
		
		// Reset hidden demos if showing all
		if (currentBuilderFilter === 'all' && currentCategoryFilter === 'all' && currentSearchTerm === '') {
			$allDemos.not('.selected-template').filter('.hidden').removeClass('fade-in fade-out');
			$allDemos.not('.hidden').removeClass('fade-out').addClass('fade-in');
		}
		
		// Update category counts and visibility
		updateCategoryFilters();
		
		// Update filter count indicator (optional visual feedback)
		const visibleCount = $filteredDemos.filter('.fade-in').length;
		console.log(`Filtering: Builder=${currentBuilderFilter}, Category=${currentCategoryFilter}, Showing ${visibleCount} demos`);
	}
	
	function updateCategoryFilters() {
		const $allDemos = $(".wpz-onboard_content-main-step-content ul li[data-design-id]");
		
		// Get demos available for current builder filter
		let $availableDemos = $allDemos;
		if (currentBuilderFilter === 'elementor') {
			$availableDemos = $allDemos.not('.is-block-design');
		} else if (currentBuilderFilter === 'block') {
			$availableDemos = $allDemos.filter('.is-block-design');
		}
		
		// Count demos for each category
		const categoryCounts = {};
		// Count "All Categories"
		categoryCounts['all'] = $availableDemos.length;
		
		// Count each specific category
		categoryFiltersConfig.forEach(function(cat) {
			if (cat.filter === 'all') return;
			
			const count = $availableDemos.filter(function() {
				var categories = $(this).attr('data-category') || '';
				var categoryArray = categories.split(' ');
				return categoryArray.indexOf(cat.filter) !== -1;
			}).length;
			
			categoryCounts[cat.filter] = count;
		});
		
		// Update UI
		categoryFiltersConfig.forEach(function(cat) {
			const $button = $('.category-filters ' + cat.selector);
			const count = categoryCounts[cat.filter] || 0;
			
			// Update text with count
			$button.text(cat.label + ' (' + count + ')');
			
			// Hide/show buttons based on count (except "All Categories")
			if (cat.filter === 'all') {
				$button.show();
			} else if (count === 0) {
				$button.hide();
			} else {
				$button.show();
			}
		});

		syncCategoryOverflow();
	}

	$( document ).on( 'click', '.wpz-onboard_filter-designs a[data-filter]', function( event ) {
		event.preventDefault();

		const $this = $( this );
		var filter = $(this).data('filter');
		
		// Determine filter type based on class or position
		var isBuilderFilter = $this.hasClass('show-all') || $this.hasClass('show-elementor') || $this.hasClass('show-blocks');
		var isCategoryFilter = $this.closest('.category-filters').length > 0;
		
		if (isBuilderFilter) {
			// Remove active class from builder filters only
			$('.wpz-onboard_filter-designs a.show-all, .wpz-onboard_filter-designs a.show-elementor, .wpz-onboard_filter-designs a.show-blocks').removeClass('active');
			$this.addClass('active');
			currentBuilderFilter = filter;
			
			// If "All Demos" is clicked, also reset category filter
			if (filter === 'all' && $this.hasClass('show-all')) {
				currentCategoryFilter = 'all';
				$('.wpz-onboard_filter-designs .category-filters a').removeClass('active');
				$('.wpz-onboard_filter-designs .category-filters a.show-all-categories').addClass('active');
			}
		} else if (isCategoryFilter) {
			// Remove active class from category filters only
			$('.wpz-onboard_filter-designs .category-filters a').removeClass('active');
			$this.addClass('active');
			currentCategoryFilter = filter;
			closeCategoryOverflowMenu();
		}
		
		applyFilters();
	} );

	$( document ).on( 'click', '.category-filters__overflow-toggle', function( event ) {
		event.preventDefault();
		event.stopPropagation();

		const $overflow = $(this).closest('.category-filters__overflow');
		const isOpen = $overflow.hasClass('is-open');

		closeCategoryOverflowMenu();

		if (!isOpen) {
			$overflow.addClass('is-open');
			$(this).attr('aria-expanded', 'true');
		}
	});

	// Search input handler
	$( '.demo-search-input' ).on( 'input', function() {
		currentSearchTerm = $(this).val().trim();

		// Reset category filter when searching so results aren't limited to one category
		if ( currentSearchTerm !== '' ) {
			currentCategoryFilter = 'all';
			$('.wpz-onboard_filter-designs .category-filters a').removeClass('active');
			$('.wpz-onboard_filter-designs .category-filters a.show-all-categories').addClass('active');
		}

		applyFilters();
	});

	$( document ).on( 'click', function( event ) {
		if (!$(event.target).closest('.category-filters__overflow').length) {
			closeCategoryOverflowMenu();
		}
	});

	$( window ).on( 'resize', function() {
		window.clearTimeout(categoryOverflowResizeTimer);
		categoryOverflowResizeTimer = window.setTimeout(syncCategoryOverflow, 100);
	});

	$( document ).on( 'keydown', function( event ) {
		if ( event.key === 'Escape' ) {
			closeCategoryOverflowMenu();
		}
	});

	// Initialize category filter counts on page load
	$(document).ready(function() {
		setTimeout(updateCategoryFilters, 100);
		updateChooseDesignNav();
	});

} )( jQuery );

document.addEventListener("DOMContentLoaded", function() {
    const lazyBackgrounds = document.querySelectorAll(".preview-thumbnail");

    const lazyLoad = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const bg = entry.target.getAttribute("data-bg");
                if (bg) {
                    entry.target.style.backgroundImage = `url('${bg}')`;
                    entry.target.removeAttribute("data-bg"); // Remove to prevent reloading
                }
                observer.unobserve(entry.target);
            }
        });
    };

    const observer = new IntersectionObserver(lazyLoad, {
        rootMargin: "100px",
        threshold: 0.1
    });

    lazyBackgrounds.forEach(bg => observer.observe(bg));
});
