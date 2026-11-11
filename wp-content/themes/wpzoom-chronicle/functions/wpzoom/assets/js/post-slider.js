jQuery(function($){

	'use strict';

	// Tracks unsaved changes made to the slider, so we can warn before leaving.
	// (The block editor does not flag classic metabox changes as unsaved.)
	var wpzSliderDirty = false;
	function wpzMarkSliderDirty() { wpzSliderDirty = true; }

	var frame = wp.media({
		title: zoomPostSlider.strings.pick_image,
		multiple: false,
		library: { type: 'image' },
		button: { text: zoomPostSlider.strings.btn_text }
	});

	frame.on('open', function(){
		var state = frame.state();
		if ( ! state || ! state.get('selection') ) return;

		var selection = state.get('selection');
		// Start each open with a clean selection so one slide's pick doesn't
		// bleed into the next (we no longer reset the frame on close).
		selection.reset( [] );

		if ( frame.currID && ! isNaN(frame.currID) && frame.currID > 0 ) {
			var attachment = wp.media.attachment(frame.currID);
			attachment.fetch();
			selection.add( [ attachment ] );
		}

		return;
	});

	// Apply the chosen image to the current slide. Runs on BOTH 'select' (so the
	// preview updates immediately in WP 7.0) and 'close' (the original, reliable
	// path that guarantees the hidden imageId is set before save). It's
	// idempotent, and bails when nothing is selected so cancelling the picker
	// never wipes an existing image.
	function wpzApplySlideImage() {
		if ( !('currSlide' in frame) ) return;

		var state = frame.state();
		if ( ! state || ! state.get('selection') ) return;

		var selected   = state.get('selection').first(),
		    attachment = selected ? selected.toJSON() : {},
		    id         = attachment.id && ! isNaN(attachment.id) && attachment.id > 0 ? attachment.id : '',
		    url        = '';

		if ( attachment.sizes && attachment.sizes.medium && attachment.sizes.medium.url ) {
			url = attachment.sizes.medium.url;
		} else if ( attachment.sizes && attachment.sizes.full && attachment.sizes.full.url ) {
			url = attachment.sizes.full.url;
		} else if ( attachment.url ) {
			url = attachment.url;
		}
		url = $.trim( url );

		// Nothing selected (e.g. the picker was cancelled) — leave the slide as-is.
		if ( id === '' && url === '' ) return;

		var $thisSlide = $('#' + frame.currSlide);
		$('.wpzoom_slide_upload_image', $thisSlide).val(id);
		$('.wpzoom_slide_preview_image', $thisSlide).attr('src', url != '' ? url : $('.wpzoom_slide_preview_image', $thisSlide).data('defaultimg'));

		var $clear = $('.wpzoom_slide_clear_image_button', $thisSlide);
		if ( id !== '' ) {
			$clear.removeClass('button-disabled');
		} else if ( ! $clear.hasClass('button-disabled') ) {
			$clear.addClass('button-disabled');
		}

		wpzMarkSliderDirty();
	}

	frame.on('select', wpzApplySlideImage);
	frame.on('close', wpzApplySlideImage);

	$('.wpzoom_slide_upload_image_button').on('click', function(e){
		e.preventDefault();

		var id = parseInt($(this).prev('.wpzoom_slide_upload_image').val());
		frame.currID = !isNaN(id) && id > 0 ? id : 0;
		frame.currSlide = $(this).closest('li').attr('id');

		frame.open();

		return;
	});

	$('.wpzoom_slide_clear_image_button').on('click', function(e){
		e.preventDefault();

		if ( $(this).hasClass('button-disabled') ) return;

		$('.wpzoom_slide_upload_image', $(this).closest('.wpzoom_slide_preview')).val('');
		$('.wpzoom_slide_preview_image', $(this).closest('.wpzoom_slide_preview')).attr('src', $('.wpzoom_slide_preview_image', $(this).closest('.wpzoom_slide_preview')).data('defaultimg'));

		if ( !$(this).hasClass('button-disabled') ) $(this).addClass('button-disabled');

		return;
	});
	
	var wpzSlideEmbedInputTimeout,
	    wpzValidIframeRegex = /<iframe[^>]* src="[^"]+"[^>]*><\/iframe>/i; // This isn't super strict... It just loosely checks to see if the string kinda looks like it contains an embed code.

	$('.wpzoom_slide_embed_code').on('input', function(){
		clearTimeout(wpzSlideEmbedInputTimeout);

		var thisVal = $(this).val(),
		    $thisParent = $(this).closest('.wpzoom_slide_preview');

		if ( $.trim(thisVal) != '' && wpzValidIframeRegex.test(thisVal) ) {

			wpzSlideEmbedInputTimeout = setTimeout(function(){
				$.ajax({
					url: ajaxurl,
					type: 'post',
					data: { action: 'wpzoom_sliderthumb_get', wpzoom_sliderthumb_embedcode: thisVal, wpzoom_sliderthumb_postid: $('#post_ID').val() },
					dataType: 'json',
					success: function(response) {
						if (response.success && response.data.thumb_url) {
							$thisParent.css('background-image', 'url(' + response.data.thumb_url + ')');
						} else {
							$thisParent.removeAttr('style');
						}
					},
					error: function() {
						$thisParent.removeAttr('style');
					}
				});

				return;
			}, 1000);

		} else {

			wpzSlideEmbedInputTimeout = setTimeout(function(){ $thisParent.removeAttr('style'); }, 1000);

		}
	});

	// Increment the trailing number in an id/name so a cloned slide is unique.
	function wpzIncrementName( index, name ) {
		return name.replace(/(\d+)/, function( fullMatch, n ) {
			return Number(n) + 1;
		});
	}

	// Clone the last slide into a fresh, empty image slide and return it.
	function wpzCreateSlide( $slider ) {
		var $last = $slider.find('li:last'),
		    $new  = $last.clone(true);

		$new.attr('id', wpzIncrementName).removeClass('image video').addClass('image');
		$('input, textarea', $new).val('').attr('name', wpzIncrementName);
		$('.wpzoom_slide_type_input', $new).val('image');

		$('.wpzoom_slide_preview', $new).removeAttr('style');
		$('.wpzoom_slide_preview_image', $new).attr('src', $('.wpzoom_slide_preview_image', $new).data('defaultimg'));
		$('.wpzoom_slide_clear_image_button', $new).addClass('button-disabled');

		$new.insertAfter($last);

		return $new;
	}

	// Apply an attachment (from .toJSON()) to a slide's image fields.
	function wpzSetSlideImage( $slide, att ) {
		var url = '';
		if ( att.sizes && att.sizes.medium && att.sizes.medium.url ) {
			url = att.sizes.medium.url;
		} else if ( att.sizes && att.sizes.full && att.sizes.full.url ) {
			url = att.sizes.full.url;
		} else if ( att.url ) {
			url = att.url;
		}

		$('.wpzoom_slide_upload_image', $slide).val( att.id );
		$('.wpzoom_slide_preview_image', $slide).attr('src', url || $('.wpzoom_slide_preview_image', $slide).data('defaultimg'));
		$('.wpzoom_slide_preview', $slide).removeAttr('style');
		$slide.removeClass('video').addClass('image');
		$('.wpzoom_slide_type_input', $slide).val('image');
		$('.wpzoom_slide_clear_image_button', $slide).removeClass('button-disabled');

		wpzMarkSliderDirty();
	}

	// "+ Add Slide" — adds a single blank slide (only shown when video slides
	// are enabled; image-only sliders use "+ Add Images" instead).
	$('.wpzoom_slide_add').on('click', function(e){
		e.preventDefault();

		wpzCreateSlide( $('.wpzoom_slider', $(this).closest('.inside')) );

		if ( $('.wpzoom_slider li').length > 1 ) $('.wpzoom_slider').removeClass('onlyone');

		return;
	});

	// "+ Add Images" — pick multiple images at once; one slide is created per image.
	var imagesFrame = wp.media({
		title: zoomPostSlider.strings.add_images,
		multiple: true,
		library: { type: 'image' },
		button: { text: zoomPostSlider.strings.add_images_btn }
	});

	imagesFrame.on('open', function(){
		// Start clean each time so a fresh batch is selected.
		imagesFrame.state().get('selection').reset( [] );
	});

	imagesFrame.on('select', function(){
		var atts = imagesFrame.state().get('selection').toJSON();
		if ( ! atts.length ) return;

		var $slider = $('.wpzoom_slider').first();

		$.each( atts, function( i, att ){
			var $slide;

			if ( i === 0 ) {
				// Reuse the auto-created blank slide for the first image — but only
				// when it's truly untouched, so we never overwrite an image the user
				// already chose or a title/description they typed. Note the default
				// blank slide stores its image id as "0" (not an empty string).
				var $last   = $slider.find('li:last'),
				    imgVal  = $.trim( $('.wpzoom_slide_upload_image', $last).val() ),
				    isEmpty = ( imgVal === '' || imgVal === '0' ) &&
				              $.trim( $('.wpzoom_slide_embed_code', $last).val() ) === '' &&
				              $.trim( $('.wpzoom_slide_caption', $last).val() ) === '' &&
				              $.trim( $('.wpzoom_slide_description', $last).val() ) === '';
				$slide = isEmpty ? $last : wpzCreateSlide( $slider );
			} else {
				$slide = wpzCreateSlide( $slider );
			}

			wpzSetSlideImage( $slide, att );
		});

		$slider.toggleClass( 'onlyone', $slider.find('li').length <= 1 );

		return;
	});

	$('.wpzoom_slide_add_images').on('click', function(e){
		e.preventDefault();
		imagesFrame.open();
		return;
	});

	$('.wpzoom_slide_type_image, .wpzoom_slide_type_video').on('click', function(e){
		e.preventDefault();

		var $li = $(this).closest('li').removeClass('image video');

		if ( $(this).hasClass('wpzoom_slide_type_image') ) {

			$li.addClass('image');
			$('.wpzoom_slide_type_input', $(this).closest('.wpzoom_slide_type')).val('image');

		} else if ( $(this).hasClass('wpzoom_slide_type_video') ) {

			$li.addClass('video');
			$('.wpzoom_slide_type_input', $(this).closest('.wpzoom_slide_type')).val('video');

		}

		return;
	});

	$('.wpzoom_slide_remove').on('click', function(e){
		e.preventDefault();

		$(this).parent().remove();

		if ( $('.wpzoom_slider li').length <= 1 ) $('.wpzoom_slider').addClass('onlyone');

		return;
	});

	$('.wpzoom_slider').sortable({
		axis: "x",
		items: "> li",
		opacity: 0.6,
		revert: true,
		cursor: 'move',
		handle: '.sort',
		update: wpzMarkSliderDirty
	});

	// ── Unsaved-changes guard for the slider ────────────────────────────────
	// Flag the slider dirty on any user change (delegated so it survives the
	// block editor re-rendering the metabox area), then warn before leaving and
	// clear the flag once the post is saved.

	$(document)
		.on('input change', '.wpzoom_slider .wpzoom_slide_caption, .wpzoom_slider .wpzoom_slide_description, .wpzoom_slider .wpzoom_slide_embed_code', wpzMarkSliderDirty)
		.on('click', '.wpzoom_slide_add, .wpzoom_slide_remove, .wpzoom_slide_clear_image_button, .wpzoom_slide_type_image, .wpzoom_slide_type_video', wpzMarkSliderDirty);

	$(window).on('beforeunload', function( e ){
		if ( ! wpzSliderDirty ) return;
		var msg = ( window.zoomPostSlider && zoomPostSlider.strings && zoomPostSlider.strings.unsaved )
			? zoomPostSlider.strings.unsaved
			: 'You have unsaved slider changes.';
		( e || window.event ).returnValue = msg; // legacy browsers
		return msg;                              // modern browsers show a generic prompt
	});

	// Clear the flag when the post is saved. Block editor: watch the save state
	// (metaboxes are submitted with a real, non-autosave save).
	if ( window.wp && wp.data && typeof wp.data.subscribe === 'function' ) {
		var wpzWasSaving = false;
		wp.data.subscribe(function(){
			var ed = wp.data.select('core/editor');
			if ( ! ed || typeof ed.isSavingPost !== 'function' ) return;
			var saving = ed.isSavingPost() && ! ed.isAutosavingPost();
			if ( saving && ! wpzWasSaving ) wpzSliderDirty = false;
			wpzWasSaving = saving;
		});
	}

	// Classic editor: the post form submit persists the metabox.
	$('form#post').on('submit', function(){ wpzSliderDirty = false; });

});