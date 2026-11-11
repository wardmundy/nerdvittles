(function ($) {
	class WPZOOM_Onboarding_Tour {
		constructor() {
            this.init = this.init.bind(this);
			this.currentIndex = 0;
			this.currentTarget = '';
			this.pointers = {};
			this.hiddenPointers = []; // Only pointers id's.
		}

		init() {
			this.setupPointers();
		}

		updatePointersOnTabChange( tabId = '' ) {
			const currentData = this.getCurrentData();
			if ( `#${currentData.options.tab_id}` === tabId ) {
				this.openPointer(currentData);
			} else {
				this.destroyPointers();
			}
		}

		updateCurrentTarget(target) {
			this.currentTarget = target;
		}

		updateHiddenPointer(index) {
			this.hiddenPointers.push(index);
		}

		executeFunction(obj){
			const func = new Function('$', `"use strict";return ${obj}`);
			func($);
		}

		scrollToTarget(target) {
			if ( $(document).find(target).length ) {
				$("html, body").animate({
					scrollTop: $(target).offset().top
				}, 800, function(){
					window.location.hash = target;
				});
			}
		}

		getPointer(data, getIndex = false) {
			for (let index = 0; index < wpzoomOnboardingTourVars.pointers.length; index++) {
				const pointer = this.pointers[index];
				if ( pointer && pointer.data === data ) {
					if ( getIndex ) {
						return index;
					}
					return $(pointer.data.selector).pointer(pointer.options);
				}
			}
			return false;
		}

		getPointerOptions(data) {
			for (let index = 0; index < wpzoomOnboardingTourVars.pointers.length; index++) {
				const pointer = this.pointers[index];
				if ( pointer && pointer.data === data ) {
					return pointer.options;
				}
			}
			return false;
		}

		getPageSlug(pointer) {
			const page = Object.keys(pointer).length && Object.keys(pointer)[0];
			const whitelistPages = wpzoomOnboardingTourVars.whitelist_pages;
			if ( whitelistPages.indexOf(page) !== -1 ) {
				return page;
			}
			return false;
		}

		getPointerByPage(_page) {
			const self = this;
			const pointers = wpzoomOnboardingTourVars.pointers;
			for (let index = 0; index < pointers.length; index++) {
				const pointer = pointers[index];
				const page = self.getPageSlug(pointer);
				if ( _page === page ) {
					return pointer[page];
				}
			}
			return false;
		}

		getPointerBySelector(_selector) {
			const self = this;
			const pointers = wpzoomOnboardingTourVars.pointers;
			for (let index = 0; index < pointers.length; index++) {
				const pointer = pointers[index];
				const page = self.getPageSlug(pointer);
				if ( page && _selector === pointer[page].selector ) {
					return pointer[page];
				}
			}
			return false;
		}

		setupPointers() {
			const pointers = wpzoomOnboardingTourVars.pointers;
			const self = this;

			pointers.map(function(pointer, index) {
				const page = self.getPageSlug(pointer);

				if ( page ) {
					let nextData = {};
					const data = pointer[page];

					const setup = function () {
						// Return early if accidentaly we have deferred pointer here.
						if ( data.options.position.defer_loading ) {
							return;
						}
						self.createPointer(data, index);
						nextData = self.getNextData(index);

						// Handlers.
						self.nextClickHandler(index, data, nextData);
						self.closeClickHandler(index, data);

						// Initial pointer open.
						if ( data.options.initial_open ) {
							self.openPointer(data);
						}
					};

					const openDeffered = function (_, nextIndex) {
						// Return early if accidentaly we have non deferred pointer here.
						if ( ! data.options.position.defer_loading ) {
							return;
						}
						if ( index === nextIndex ) {
							nextData = self.getNextData(index);
							const prevData = self.getPrevData(index); // Receives data from previous pointer.

							// Handlers.
							self.nextClickHandler(index, data, nextData);
							self.closeClickHandler(index, data);
							
							self.openNextPointer(prevData, data);
							self.gotoNextSelector(data);
						}
					};
		
					if (data.options.position && data.options.position.defer_loading) {
						// Setup & open deffered pointers.
						$(window).on('wpzoom-onboarding-pointer.defer_loading', openDeffered);
					} else {
						$(document).ready(setup);
					}
				}
			});
		}

		destroyPointers() {
			const self = this;
			const pointers = wpzoomOnboardingTourVars.pointers;
			for (let index = 0; index < pointers.length; index++) {
				const pointer = pointers[index];
				const page = self.getPageSlug(pointer);
				if ( self.getPointer(pointer[page]) ) {
					self.getPointer(pointer[page]).pointer('destroy');
				}
			}
			return false;
		}

		addPointerButtons(data, index) {
			if ( data.options.position.defer_loading ) {
				setTimeout(() => {
					if ( ! data.function1 ) {
						$(document).find(`#pointer-close-${index}`).after(`<a id="pointer-primary-${index}" class="button-primary">${data.button2}</a>`);
					}
					if ( data.button2 ) {
						$(document).find(`#pointer-secondary-${index}`).after(`<a id="pointer-primary-${index}" class="button-primary">${data.button2}</a>`);
					}
				}, 200);
			} else {
				if ( ! data.function1 ) {
					$(document).find(`#pointer-close-${index}`).after(`<a id="pointer-primary-${index}" class="button-primary">${data.button2}</a>`);
				}
				if ( data.button2 ) {
					$(document).find(`#pointer-secondary-${index}`).after(`<a id="pointer-primary-${index}" class="button-primary">${data.button2}</a>`);
				}
			}
		}

		gotoNextSelector(data) {
			if ( data.selector ) {
				const regex = /(?:\#)[\w\S-]+/g;
				let selectorId;
				let m;

				while ((m = regex.exec(data.selector)) !== null) {
					// This is necessary to avoid infinite loops with zero-width matches
					if (m.index === regex.lastIndex) {
						regex.lastIndex++;
					}
					selectorId = m[0] && `${m[0]}`; // Extract id from selector string.
				}
				
				$("html, body").animate({
					scrollTop: $(selectorId || data.selector).offset().top
				}, 800, function(){
					if ( selectorId ) {
						window.location.hash = selectorId;
					}
				});
			}
		}

		getCurrentData() {
			const self = this;
			const pointers = wpzoomOnboardingTourVars.pointers;
			for (let index = 0; index < pointers.length; index++) {
				if ( self.currentIndex === index ) {
					const pointer = pointers[index];
					const page = self.getPageSlug(pointer);
					if (pointer[page]) {
						return pointer[page];
					}
				}
			}
			return false;
		}

		getPrevData(_index) {
			const self = this;
			const pointers = wpzoomOnboardingTourVars.pointers;
			for (let index = 0; index < pointers.length; index++) {
				if ( _index - 1 === index ) {
					const pointer = pointers[index];
					const page = self.getPageSlug(pointer);
					if (pointer[page]) {
						return pointer[page];
					}
				}
			}
			return false;
		}

		getNextData(_index) {
			const self = this;
			const pointers = wpzoomOnboardingTourVars.pointers;
			for (let index = 0; index < pointers.length; index++) {
				if ( _index + 1 === index ) {
					const pointer = pointers[index];
					const page = self.getPageSlug(pointer);
					if (pointer[page]) {
						return pointer[page];
					}
				}
			}
			return false;
		}

		hasSelectorInDOM(selector) {
			return $(document).find(selector).length > 0;
		}

		checkNextPointerSelector(index, data, nextData) {
			const self = this;

			if ( nextData && self.hasSelectorInDOM(nextData.selector) ) {
				self.createPointer(nextData, index + 1);
				if ( ! nextData.options.position.defer_loading ) {
					// Open pointer later after event trigger 'wpzoom-onboarding-pointer.defer_loading'.
					self.openNextPointer(data, nextData);
				}
			} else {
				// Go to next pointer if selector was not found in DOM.
				nextData = self.getNextData(index + 1);

				if ( false === nextData ) {
					return;
				}

				// Maybe we need to check if next pointer selector?
				if ( nextData && self.hasSelectorInDOM(nextData.selector) ) {
					self.createPointer(nextData, index + 1, true);
					self.openNextPointer(data, nextData);
					self.gotoNextSelector(nextData);
				} else {
					const currentData = self.getCurrentData();
					self.createPointer(nextData, index + 1);
					self.checkNextPointerSelector(index + 1, currentData, nextData);
				}

				const nextIndex = self.getPointer(nextData, true);

				// Maybe trigger 'wpzoom-onboarding-pointer.defer_loading'.
				$(window).trigger('wpzoom-onboarding-pointer.defer_loading', nextIndex );
			}
		}

		nextClickHandler(index, data, nextData) {
			const self = this;
			$(document).on('click', `#pointer-primary-${index}`, function(event) {
				event.preventDefault();
				event.stopPropagation();

				self.updateCurrentTarget($(this));
				if ( data.options.scroll_to ) {
					self.scrollToTarget(data.options.scroll_to);
				}
				if ( data.function2 ) {
					self.executeFunction(data.function2);
				}

				self.checkNextPointerSelector(index, data, nextData);
			});
		}

		closeClickHandler(index) {
			const self = this;
			$(document).on('click', `#pointer-close-${index}`, function() {
				const $pointer = $(this).closest('.wp-pointer');
				self.updateCurrentTarget($(this));
				$pointer.pointer('close');
				self.dismissPointer();
				self.updateHiddenPointer(index);
			});
		}

		createPointer(data, index, createNext = false) {
			if ( createNext ) {
				index += 1;
			}

			const self = this;
			this.pointers[index] = {};

			const options = $.extend(data.options, {
				buttons: function (event, t) {
					let button;

					if ( ! data.function1 ) {
						button = $(`<a id="pointer-close-${index}" style="margin-left:5px" class="button-secondary">${data.button1}</a>`);
						button.on('click.pointer', function () {
							self.updateCurrentTarget($(this));
							t.element.pointer('close');
						});
					} else {
						button = $(`<a id="pointer-secondary-${index}" style="margin-left:5px" class="button-secondary">${data.button1}</a>`);
						button.on('click.pointer', function () {
							self.updateCurrentTarget($(this));
							self.executeFunction(data.function1);
						});
					}

					return button;
				},
				open: function() {
					self.addPointerButtons(data, index);
				},
				pointerIndex: index
			});
			this.pointers[index]['data'] = data;
			this.pointers[index]['options'] = options;

			return options;
		}

		openPointer(data) {
			const options = this.getPointerOptions(data);
			if ( this.getPointer(data) ) {
				this.getPointer(data).pointer(options).pointer('open');	
			}
		}

		hidePointer(data) {
			if ( this.getPointer(data) ) {
				this.getPointer(data).pointer('close');	
			}
		}

		openNextPointer(data, nextData) {
			if ( data ) {
				this.hidePointer(data);
			}
			if ( nextData ) {
				this.currentIndex = nextData.options.pointerIndex;
				this.openPointer(nextData);
			}
		}

		dismissPointer() {
			$.post(ajaxurl, {
				pointer: wpzoomOnboardingTourVars.pointer_close_id,
				action: 'dismiss-wp-pointer',
				_ajax_nonce: wpzoomOnboardingTourVars.nonce
			});
		}
	}

	/**
     * Initialize WPZOOM_Onboarding_Tour
     */
	 $(function ($) {
        const wpzoomOnboardingTour = new WPZOOM_Onboarding_Tour();

        wpzoomOnboardingTour.init();

        // Store wpzoomOnboardingTour to window vars.
        window.wpzoomOnboardingTour = wpzoomOnboardingTour;

		// Run trigger after init all pointers.
		$(window).trigger( 'wpzoom-onboarding-pointers-init' );
    });
})(jQuery);