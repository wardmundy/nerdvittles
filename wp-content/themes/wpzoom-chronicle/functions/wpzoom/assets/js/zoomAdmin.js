window.Mousetrap=function(){function m(a,e,b){if(a.addEventListener)return a.addEventListener(e,b,!1);a.attachEvent("on"+e,b)}function n(a){var a=a||{},e=!1,b;for(b in h)a[b]?e=!0:h[b]=0;e||(k=!1)}function q(a,e,b,c){var f,g,d=[];if(!i[a])return[];if("keyup"==b&&(15<a&&19>a||91==a))e=[a];for(f=0;f<i[a].length;++f)g=i[a][f],!(g.seq&&h[g.seq]!=g.level)&&(b==g.action&&e.sort().join(",")===g.modifiers.sort().join(","))&&(c&&i[a].splice(f,1),d.push(g));return d}function r(a,e,b){var c;c=b.target||b.srcElement;
var f=c.tagName;c=-1<(" "+c.className+" ").indexOf(" mousetrap ")?!1:"INPUT"==f||"SELECT"==f||"TEXTAREA"==f;if(!c){c=[];b.shiftKey&&c.push(j.shift);b.altKey&&c.push(j.alt);b.ctrlKey&&c.push(j.ctrl);b.metaKey&&c.push(j.command);c=q(a,c,e);for(var g={},d=!1,f=0;f<c.length;++f)if(c[f].seq)d=!0,g[c[f].seq]=1,c[f].callback(b);else if(!d&&!k){c[f].callback(b);break}e==k&&!(15<a&&19>a||91==a)&&n(g)}}function v(a){r(93==a.keyCode||224==a.keyCode?91:a.keyCode,"keydown",a)}function w(a){o===a.keyCode?o=!1:
r(93==a.keyCode||224==a.keyCode?91:a.keyCode,"keyup",a)}function x(a,e,b,c){h[a]=0;var f=function(){k=c;++h[a];clearTimeout(s);s=setTimeout(n,1E3)},g=function(a){b(a);"keydown"===c&&(o=a.keyCode);setTimeout(n,10)},d;for(d=0;d<e.length;++d)t(e[d],d<e.length-1?f:g,c,a,d)}function t(a,e,b,c,f){var a=a.replace(/\s+/g," "),g=a.split(" "),d,h=[];if(1<g.length)return x(a,g,e,b);g="+"===a?["+"]:a.split("+");for(a=0;a<g.length;++a)d=g[a],u[d]&&(h.push(j.shift),d=u[d]),d=j[d]||d.toUpperCase().charCodeAt(0),
(15<d&&19>d||91==d)&&h.push(d);i[d]||(i[d]=[]);q(d,h,b,!c);i[d][c?"unshift":"push"]({callback:e,modifiers:h,action:b,seq:c,level:f})}for(var j={backspace:8,tab:9,enter:13,"return":13,shift:16,ctrl:17,alt:18,option:18,capslock:20,esc:27,escape:27,space:32,pageup:33,pagedown:34,end:35,home:36,left:37,up:38,right:39,down:40,del:46,meta:91,command:91,";":186,"=":187,",":188,"-":189,".":190,"/":191,"`":192,"[":219,"\\":220,"]":221,"'":222},u={"~":"`","!":"1","@":"2","#":"3",$:"4","%":"5","^":"6","&":"7",
"*":"8","(":"9",")":"0",_:"-","+":"=",":":";",'"':"'","<":",",">":".","?":"/","|":"\\"},i={},p={},h={},s,o=!1,k=!1,l=1;20>l;++l)j["f"+l]=111+l;return{bind:function(a,e,b){for(var b=b||"keydown",c=a instanceof Array?a:a.split(","),f=b,g=0;g<c.length;++g)t(c[g],e,f);p[a+":"+b]=e},trigger:function(a,e){p[a+":"+(e||"keydown")]()},addEvent:function(a,e,b){m(a,e,b)},reset:function(){i={};p={}},init:function(){m(document,"keydown",v);m(document,"keyup",w)}}}();Mousetrap.addEvent(window,"load",Mousetrap.init);

/**
 * Bind mousetrap hotkeys
 */
jQuery(document).ready(function($) {
	if ( !$( 'body' ).hasClass( 'wpzoom-restricted-mode' ) ) {
		Mousetrap.bind(['ctrl+s', 'command+s'], function(e) {
			$("#zoomForm").trigger('submit');		
			e.preventDefault();
		});
	}
})

/**
 * Tabs functionality
 */
jQuery(document).ready(function($) {

	if ( $( 'body' ).hasClass( 'wpzoom-restricted-mode' ) ) {
		return false;
	}

    //When page loads...
    $(".tab_content").hide();
    $(".tab_content .sub").hide(); // Hide all subtabs

    var section = Cookies.get('active_section');
    var tab = Cookies.get('active_tab');

    // Replace all double quotes from cookies string
    if ( typeof section != 'undefined' && section.indexOf('"') >= 0 ) {
        section = section.replace(/['"]+/g, '');
    }
    if ( typeof tab != 'undefined' && tab.indexOf('"') >= 0 ) {
        tab = tab.replace(/['"]+/g, '');
    }

    // 1. Check if Theme Options has `active_section` and `active_tab` cookies value in DOM elements
    // 2. Set values to new cookies renamed with themName prefix (e.g. ${themName}_active_section, ${themeName}_active_tab)
    // 3. Remove cookies `active_section` and `active_tab` only if they were found in DOM elements
    if ( $("#zoomWrap").find( section ).length ) {
        Cookies.set( `${ WPZOOM_Theme_Options.themeName }_active_section`, section );
        Cookies.remove( 'active_section' );
    }

    if ( $("#zoomWrap").find( tab ).length ) {
        Cookies.set( `${ WPZOOM_Theme_Options.themeName }_active_tab`, tab );
        Cookies.remove( 'active_tab' );
    }

    section = Cookies.get( `${ WPZOOM_Theme_Options.themeName }_active_section` );
    tab = Cookies.get( `${ WPZOOM_Theme_Options.themeName }_active_tab` );

    // Trigger General tab if section and tab were not found in the DOM elements
    if ( ! $("#zoomWrap").find( section ).length || ! $("#zoomWrap").find( tab ).length ) {
        var generalTabSectionId = $('#zoomWrap').find('.tabs > .general a').attr('href');
        var generalTabId = $('#zoomWrap').find(`${ generalTabSectionId } .zoomForms > div:first-child`).attr('id');

        section = generalTabSectionId;
        tab = `#${ generalTabId }`;

        Cookies.set( `${ WPZOOM_Theme_Options.themeName }_active_section`, section );
        Cookies.set( `${ WPZOOM_Theme_Options.themeName }_active_tab`, tab );
    }

    // Replace all double quotes from new generated cookies string
    if ( typeof section != 'undefined' && section.indexOf('"') >= 0 ) {
        section = section.replace(/['"]+/g, '');
    }
    if ( typeof tab != 'undefined' && tab.indexOf('"') >= 0 ) {
        tab = tab.replace(/['"]+/g, '');
    }

    if (!section || !tab) {
        $("ul.tabs li:first").addClass("active").show(); //Activate first tab
        $("ul.tabs li:first li:first").addClass("active").show(); //Activate first subtab
        $(".tab_content:first").show(); //Show first tab content
        $(".tab_content:first .sub:first").show(); // Show first subtab content
    } else {
        $('a[href="' + section +'"]').parent().addClass('active').show();
        $('a[href="' + tab + '"]').parent().addClass('active');
        $(section).show();
        $(tab).show();
    }

    $(".tab_container").fadeIn();

    /* Handle clicks for arrow icon */
    $("ul.tabs em").on('click', function() {
        var id = $(this).parent().attr("id");

        // open clicked panel
        $(this).parent().find('ul').slideToggle('fast', function(){
            $(this).parent().toggleClass("a-open");
        });

        /* trigger custom event zoom:nav:changed  */
        $('#zoomWrap').trigger('zoom:nav:changed');

    });

    /* Handle clicks for accordeons */
    $(".wz-parent > a").on('click', function() {
        // prevent flickering
        if ($(this).parent().hasClass('active')) {
            return false;
        }
        var id = $(this).parent().attr("id");
        var activeTab = $(this).attr('href');

        $(".wz-parent").removeClass('active');

        // close all other tabs
        $("#zoomWrap .tabs .sub").removeClass('active');
        $("#zoomWrap .tabs ul").slideUp('fast');

        $(this).parent().find('ul').slideDown('fast');
        $(this).parent().addClass('active');

        if ($(this).parent().hasClass('active')) {
            $(".sub").removeClass('active');

            $(this).parent().find('li:first').addClass('active');

            $(".zoomForms .sub").hide();
            $(".tab_content").hide();

            $(activeTab).show();
            $(activeTab + ' .sub').first().slideDown();

            Cookies.set( `${ WPZOOM_Theme_Options.themeName }_active_section`, activeTab );
            Cookies.set( `${ WPZOOM_Theme_Options.themeName }_active_tab`, '#' + $(activeTab + ' .sub').first().attr('id') );
        }

        $(this).parent().find('li:first').addClass('active');

        /* trigger custom event zoom:nav:changed  */
        $('#zoomWrap').trigger('zoom:nav:changed');

        return false;

    });

    /* Handle clicks for tabs */
    $(".sub > a").on('click', function() {
        // prevent flickering
        if ($(this).parent().hasClass('active')) {
            return false;
        }
        $(".sub").removeClass('active');
        $(this).parent().addClass('active');
        var p = $(this).parent().parent().parent().find('a').first().attr('href');

        $(".wz-parent").removeClass('active');
        $(this).parent().parent().parent().addClass('active');

        $(".zoomForms .sub").hide();
        $(".tab_content").hide();


        var activeTab = $(this).attr('href');
        $(p).show();
        $(activeTab).show();

        Cookies.set( `${ WPZOOM_Theme_Options.themeName }_active_section`, p );
        Cookies.set( `${ WPZOOM_Theme_Options.themeName }_active_tab`, activeTab );

        /* trigger custom event zoom:nav:changed  */
        $('#zoomWrap').trigger('zoom:nav:changed');

        return false;
    });

    Mousetrap.bind(['j'], function(e) {
        var active_tab = $('.sub.active'),
            active_section = $('.wz-parent.active'),
            tab_id = active_tab.find('a').attr('href'),
            next_tab,
            next_section;

        // find next one
        next_tab = active_tab.next();

        if (!next_tab.length) {
            next_section = active_section.next();
            if (!next_section.length) return;

            next_tab = next_section.find('.sub').first();

            // change sections
            $('.wz-parent').removeClass('active');
            // close all other tabs
            $("#zoomWrap .tabs .sub").removeClass('active');
            $("#zoomWrap .tabs ul").slideUp('fast');

            next_section.find('ul').slideDown('fast');
            next_section.addClass('active');
        }

        $('.sub').removeClass('active');
        next_tab.addClass('active');

        $(".zoomForms .sub").hide();

        if (next_section && next_section.length) {
            $(".tab_content").hide();
            $(next_section.find('a').first().attr('href')).show();
        }

        $(next_tab.find('a').attr('href')).show();

        e.preventDefault();
    });

    Mousetrap.bind(['k'], function(e) {
        var active_tab = $('.sub.active'),
        active_section = $('.wz-parent.active'),
        tab_id = active_tab.find('a').attr('href'),
        next_tab,
        next_section;

        // find next one
        next_tab = active_tab.prev();

        if (!next_tab.length) {
            next_section = active_section.prev();
            if (!next_section.length) return;

            next_tab = next_section.find('.sub').last();

            // change sections
            $('.wz-parent').removeClass('active');
            // close all other tabs
            $("#zoomWrap .tabs .sub").removeClass('active');
            $("#zoomWrap .tabs ul").slideUp('fast');

            next_section.find('ul').slideDown('fast');
            next_section.addClass('active');
        }

        $('.sub').removeClass('active');
        next_tab.addClass('active');

        $(".zoomForms .sub").hide();

        if (next_section && next_section.length) {
            $(".tab_content").hide();
            $(next_section.find('a').first().attr('href')).show();
        }

        $(next_tab.find('a').attr('href')).show();

        e.preventDefault();
    });

    $('#wpz-demo-content-icon').on('click', function(e){
        e.preventDefault();

        var toggle_id = $(this).attr('href'),
            toggle_section = $('.wz-parent.importexport');

        if (!toggle_section.length) return;

        // change sections
        $('.wz-parent').removeClass('active');

        // close all other tabs
        $("#zoomWrap .tabs .sub").removeClass('active');
        $("#zoomWrap .tabs ul").slideUp('fast');
        $(".zoomForms .sub").hide();
        $(".tab_content").hide();

        toggle_section.find('ul').slideDown('fast');
        toggle_section.addClass('active');
        toggle_section.find('a[href="'+toggle_id+'"]').parent().addClass('active');
        $('.zoomForms').find(toggle_id).show();
        $('.zoomForms').find(toggle_id).parents('.tab_content').show();

        Cookies.set( `${ WPZOOM_Theme_Options.themeName }_active_section`, toggle_section.find('a').first().attr('href') );
        Cookies.set( `${ WPZOOM_Theme_Options.themeName }_active_tab`, toggle_id );

        $('#misc_load_demo_content').trigger('click');
    });

});

/**
 * Autoselect export content on click
 */
jQuery(document).ready(function($) {
    $("#misc_export, #misc_export_widgets, #misc_debug").on('click', function() {
        this.focus();
        this.select();
    });
});

/**
 * Widgets import/export functionality
 */
jQuery(document).ready(function($) {
    $("#misc_load_default_widgets").on('click', function(e) {
        e.preventDefault();

        var loading = $("#zoomLoading");
        var success = $("#zoomSuccess");
        var fail    = $("#zoomFail");

        success.find('p').text('Widgets successfully loaded!');

        loading.fadeIn();

        var data = {
            type: 'widgets_default',
            '_ajax_nonce': $("#zoom-nonce").val()
        };

        var ask = confirm('Are you sure you want to restore default widgets? All previous changes made to widgets will be reset!');

        if (!ask) {
            loading.fadeOut();

            return false;
        }

        $("#misc_export_widgets").html('Please refresh this page and then get export data. Don\'t forget to save if you changed something.');

        wp.ajax.post(
            'wpzoom_widgets_default',
            data
        ).done(function () {

            loading.fadeOut();
            success.fadeIn();
            window.setTimeout(function () {
                success.fadeOut();
            }, 200);

        }).fail(function () {

            loading.fadeOut();
            fail.fadeIn();
            window.setTimeout(function () {
                fail.fadeOut();
            }, 1000);

        });

        return false;
    });
});

/**
 * Import Widgets button
 */
jQuery(document).ready(function($) {
    $("#misc_import_widgets_btn").on('click', function(e) {
        e.preventDefault();

        var widgetsData = $("#misc_import_widgets").val();

        if (!widgetsData) {
            alert('Please paste your widget export code in the Import Widgets textarea first.');
            return false;
        }

        var ask = confirm('Are you sure you want to import these widgets? All previous widget changes will be overwritten!');

        if (!ask) {
            return false;
        }

        var loading = $("#zoomLoading");
        var success = $("#zoomSuccess");
        var fail    = $("#zoomFail");

        success.find('p').text('Widgets imported successfully!');
        loading.fadeIn();

        wp.ajax.post('wpzoom_import_widgets', {
            widgets_data: widgetsData,
            '_ajax_nonce': $("#zoom-nonce").val()
        }).done(function() {
            loading.fadeOut();
            success.fadeIn();
            window.setTimeout(function() {
                success.fadeOut();
                wpzoomUnsaved.suppress();
                location.href = location.href;
            }, 2000);
        }).fail(function() {
            loading.fadeOut();
            fail.fadeIn();
            window.setTimeout(function() {
                fail.fadeOut();
            }, 3000);
        });

        return false;
    });
});

/**
 * Clear Google Fonts Cache functionality
 */
jQuery(document).ready(function($) {
    $("#clear_local_google_fonts").on('click', function(e) {
        e.preventDefault();

        var loading = $("#zoomLoading");
        var success = $("#zoomSuccess");
        var fail    = $("#zoomFail");

        success.find('p').text('Google Fonts cache cleared successfully! Fonts will be re-downloaded on the next page load.');

        var ask = confirm('Are you sure you want to clear the local Google Fonts cache? All downloaded fonts will be deleted and re-downloaded automatically on the next page load.');

        if (!ask) {
            return false;
        }

        loading.fadeIn();

        var data = {
            type: 'clear_google_fonts',
            '_ajax_nonce': $("#zoom-nonce").val()
        };

        wp.ajax.post(
            'wpzoom_clear_google_fonts',
            data
        ).done(function () {

            loading.fadeOut();
            success.fadeIn();
            window.setTimeout(function () {
                success.fadeOut();
            }, 3000);

        }).fail(function () {

            loading.fadeOut();
            fail.fadeIn();
            window.setTimeout(function () {
                fail.fadeOut();
            }, 1000);

        });

        return false;
    });
});

/**
 * Unsaved changes detection
 *
 * Tracks the serialized state of #zoomForm against a baseline captured on
 * page load. When they differ, a notice is shown next to the Save button and
 * navigating away triggers the browser's "unsaved changes" confirmation
 * (same behavior as the block editor / widgets screen). The baseline is
 * refreshed after a successful save, and the warning is suppressed for
 * intentional reloads (reset, widget import).
 */
var wpzoomUnsaved = {
    baseline: null,
    suppressed: false,

    init: function($) {
        var self = this;
        var $form = $('#zoomForm');

        if (!$form.length || $('body').hasClass('wpzoom-restricted-mode')) {
            return;
        }

        this.$ = $;
        this.baseline = this.snapshot();

        $form.on('change input', function() {
            self.refresh();
        });

        $(window).on('beforeunload', function(e) {
            if (!self.suppressed && self.isDirty()) {
                var message = (typeof WPZOOM_Theme_Options !== 'undefined' && WPZOOM_Theme_Options.leaveWarning)
                    ? WPZOOM_Theme_Options.leaveWarning
                    : 'The changes you made will be lost if you navigate away from this page.';
                e.preventDefault();
                e.returnValue = message;
                return message;
            }
        });
    },

    /**
     * Serialized form state. Unlike jQuery.serialize() this includes disabled
     * controls, so a dependency rule toggling `disabled` (or any script doing so)
     * never makes the form look modified.
     */
    snapshot: function() {
        var form = this.$('#zoomForm')[0];
        var parts = [];
        if (!form) return '';
        Array.prototype.forEach.call(form.elements, function(el) {
            if (!el.name || /^(submit|button|image|reset|file)$/.test(el.type)) return;
            if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
            if (el.type === 'select-multiple') {
                Array.prototype.forEach.call(el.options, function(o) { if (o.selected) parts.push(el.name + '=' + o.value); });
                return;
            }
            parts.push(el.name + '=' + el.value);
        });
        return parts.join('&');
    },

    isDirty: function() {
        return this.baseline !== null && this.snapshot() !== this.baseline;
    },

    refresh: function() {
        if (this.baseline === null) return;

        var $ = this.$;
        var dirty = this.isDirty();
        var $submit = $('.zoomActionButtons p.submit').first();
        var $notice = $submit.find('.zoom-unsaved-notice');

        $submit.toggleClass('has-unsaved-changes', dirty);

        if (dirty && !$notice.length) {
            var text = (typeof WPZOOM_Theme_Options !== 'undefined' && WPZOOM_Theme_Options.unsavedNotice)
                ? WPZOOM_Theme_Options.unsavedNotice
                : 'You have unsaved changes';
            $submit.prepend($('<span class="zoom-unsaved-notice" />').text(text));
        } else if (!dirty) {
            $notice.remove();
        }
    },

    markClean: function() {
        if (this.baseline === null) return;
        this.baseline = this.snapshot();
        this.refresh();
    },

    suppress: function() {
        this.suppressed = true;
    }
};

jQuery(document).ready(function($) {
    wpzoomUnsaved.init($);
});

/**
 * Ajax functionality
 */
jQuery(document).ready(function($) {
    $("#submitZoomForm").on('click', function() {
        $("#zoomForm").trigger('submit');
    });

    $("#zoomForm").on('submit', function() {
        var loading = $("#zoomLoading");
        var success = $("#zoomSuccess");
        var fail    = $("#zoomFail");

        success.find('p').text('Options saved successfully!');

        loading.fadeIn();

        function fData() {
            var values = $("#zoomForm").serialize();

            return values;
        }

        var data = {
            type: 'options',
            data: btoa(encodeURIComponent(fData())),
            data_encoded: '1',
            '_ajax_nonce': $("#zoom-nonce").val()
        };

        var ask;
        var wpzoom_import;

        if ($("#misc_import").val() != '') {
            ask = confirm('Are you sure you want to import these settings? All previous changes will be overwritten!');
            wpzoom_import = true;
        }

        if ($("#misc_import_widgets").val() != '') {
            ask = confirm('Are you sure you want to import these widgets? All previous changes will be overwritten!');
            wpzoom_import = true;
        }

        if (!ask && wpzoom_import) {
                loading.fadeOut();
                return false;
        }


        $("#misc_export").html('Please refresh this page and then get export data. Don\'t forget to save if you changed something.');
        $("#misc_export_widgets").html('Please refresh this page and then get export data. Don\'t forget to save if you changed something.');

        wp.ajax.post(
            'wpzoom_ajax_post',
            data
        ).done(function () {

            wpzoomUnsaved.markClean();

            loading.fadeOut();
            success.fadeIn();
            window.setTimeout(function () {
                success.fadeOut();
                if (ask) {
                    wpzoomUnsaved.suppress();
                    location.href = location.href;
                }
            }, 2000);

        }).fail(function () {

            loading.fadeOut();
            fail.fadeIn();
            window.setTimeout(function () {
                fail.fadeOut();
            }, 10000);

        });

        return false;
    });

    $("#zoomReset").on('submit', function(event) {
        var ask = confirm('Are you sure you want to reset all settings? All changes made to theme options will be reset to default! Please think twice before doing this.');
        if (!ask) {
            event.preventDefault();
            return false;
        }
        wpzoomUnsaved.suppress();
    });

});

/**
 * Color picker functionality
 */
jQuery(document).ready(function($) {
    $( '.colorSelector').each ( function () {
        var colourPicker = $(this).ColorPicker({

            color: $(this).next( 'input').attr( 'value' ),

            onShow: function (colpkr) {
                $(colpkr).fadeIn(500);
                return false;
            },
            onHide: function (colpkr) {
                $(colpkr).fadeOut(500);
                return false;
            },
            onChange: function (hsb, hex, rgb) {
                $(colourPicker).children( 'div').css( 'backgroundColor', '#' + hex);
                $(colourPicker).next( 'input').attr( 'value','#' + hex).trigger('change');
            }

        });

        $(this).children( 'div').css( 'backgroundColor', $(this).next( 'input').attr( 'value' ));
    });
});

/**
 * Media Library Upload functionality
 */
jQuery(document).ready(function($) {
    mlu = {

        removeFile: function () {
            $('.mlu_remove').on('click', function(event) {
                $(this).hide();
                $(this).parents().parents().children('.upload').attr('value', '').trigger('change');
                $(this).parents('.screenshot').animate({ 'opacity' : 0, 'height' : 0 });

                return false;
            });
        },

        recreateFileField: function () {
            $('input.file').each(function(){
                var uploadbutton = '<input class="upload_file_button" type="button" value="Upload" />';
                $(this).wrap('<div class="file_wrap" />');
                $(this).addClass('file').css('opacity', 0);
                $(this).parent().append($('<div class="fake_file" />').append($('<input type="text" class="upload" />').attr('id',$(this).attr('id')+'_file')).val( $(this).val() ).append(uploadbutton));

                $(this).on('change', function() {
                    $('#'+$(this).attr('id')+'_file').val($(this).val());
                });

                $(this).on('mouseout', function() {
                    $('#'+$(this).attr('id')+'_file').val($(this).val());
                });
            });

        },

        mediaUpload: function () {
            var formfield,
                formID,
                btnContent,
                uploader;

            $('input.upload_button').removeAttr('style');

            // On Click
            $('input.upload_button').on("click", function () {
                formfield = $(this).prev('input').attr('id');

                if (typeof(uploader) !== "undefined") {
                    uploader.close();
                }

                wp.media.model.settings.post.id = $(this).attr('rel');

                uploader = wp.media.frames.wpzoom_uploader = wp.media({
                    'title' : $(this).data('name'),
                    'library' : {
                        'type' : 'image',
                        'uploadedTo' : $(this).attr('rel')
                    },
                    'button' : {
                        'text' : 'Use this image'
                    },
                    'multiple' : false
                });

                uploader.on('select', function() {
                    var attachment = uploader.state().get('selection').first().toJSON();
                    var image = /(^.*\.jpg|jpeg|png|gif|ico*)/gi;

                    if (attachment.url.match(image)) {
                        btnContent = '<img src="'+attachment.url+'" alt="" /><a href="#" class="mlu_remove button">Remove Image</a>';
                    } else {
                        html = '<a href="'+attachment.url+'" target="_blank" rel="external">View File</a>';
                        btnContent = '<div class="no_image"><span class="file_link">'+html+'</span><a href="#" class="mlu_remove button">Remove</a></div>';
                    }

                    $('#' + formfield).val(attachment.url).trigger('change');
                    $("#" + formfield + "_image").html(btnContent).css({ 'height' : 'auto', 'opacity' : 1 });
                });

                uploader.open();

                return false;
            });
        }

    };

    mlu.removeFile();
    mlu.recreateFileField();
    mlu.mediaUpload();
});


/**
 * Custom jQuery radio buttons
 */
jQuery(document).ready(function($) {
    $('body').on('change', '.RadioClass', function() {
        if ($(this).is(":checked")) {
            $(this).parent().find(".RadioSelected:not(:checked)").removeClass("RadioSelected");
            $(this).next("label").addClass("RadioSelected");
        }
    });
});


/**
 * Theme Options — conditional state for dependent controls.
 *
 * Each rule defines a target control and the parent toggle it depends on.
 * When the parent is in the wrong state, the target is rendered as visually
 * disabled (dimmed + inert + explanatory hint) instead of being hidden, so
 * users always see the full set of options and understand the dependency.
 *
 * `requireParent: 'on'`  → target active only when parent is checked
 * `requireParent: 'off'` → target active only when parent is unchecked
 * `hint` → inline explanation shown when the target is disabled
 */
jQuery(document).ready(function($) {
    var rules = [
        // Portfolio Page → Lightbox sub-options inactive when Lightbox is off
        { parent: 'lightbox_enable', target: 'lightbox_video_only',    requireParent: 'on',
          hint: 'Enable “Enable Lightbox” above to use this option.' },
        { parent: 'lightbox_enable', target: 'lightbox_title_caption', requireParent: 'on',
          hint: 'Enable “Enable Lightbox” above to use this option.' },
        { parent: 'lightbox_enable', target: 'lightbox_excerpt',       requireParent: 'on',
          hint: 'Enable “Enable Lightbox” above to use this option.' },

        // Portfolio Page → Item Display options inactive when Lightbox is on
        { parent: 'lightbox_enable', target: 'portfolio_excerpt', requireParent: 'off',
          hint: 'Not used while Lightbox is enabled — excerpts only show when the Lightbox is off.' },
        { parent: 'lightbox_enable', target: 'portfolio_btn',     requireParent: 'off',
          hint: 'Not used while Lightbox is enabled — the Read More button only shows when the Lightbox is off.' },

        // Portfolio Page → "Always play" depends on "Enable Background Video"
        { parent: 'enable_portfolio_background_video', target: 'always_play_portfolio_background_video', requireParent: 'on',
          hint: 'Enable “Enable Background Video” above to use this option.' },

        // Single Portfolio Posts → "Scroll arrow" depends on "Fullscreen Header"
        { parent: 'portfolio_post_fullheader', target: 'portfolio_post_scroll_arrow', requireParent: 'on',
          hint: 'Enable “Fullscreen Header” above to use this option.' }
    ];

    function applyRule(rule) {
        var $parent = $('#' + rule.parent);
        var $target = $('#' + rule.target);
        if (!$parent.length || !$target.length) { return; }

        var $row = $target.closest('.wpz_option_container');
        if (!$row.length) { return; }

        var parentOn = $parent.is(':checked');
        var shouldEnable = (rule.requireParent === 'on') ? parentOn : !parentOn;

        // Never use the `disabled` attribute here: disabled inputs are excluded from


        // the form submit, and the save handler stores every missing option as "off",


        // which silently wiped these values on every save. The row is made inert with


        // CSS (pointer-events) + the click guard below, so the stored value survives.


        $row.toggleClass('wpz-option-disabled', !shouldEnable);


        $target.prop('disabled', false)


               .attr('aria-disabled', shouldEnable ? null : 'true')


               .attr('tabindex', shouldEnable ? null : '-1');

        var $hint = $row.children('.wpz-option-disabled-hint');
        if (!shouldEnable) {
            if (!$hint.length && rule.hint) {
                $row.append('<p class="wpz-option-disabled-hint">' + rule.hint + '</p>');
            }
        } else {
            $hint.remove();
        }
    }

    rules.forEach(function(rule) {
        applyRule(rule);
        $('#' + rule.parent).on('change', function() { applyRule(rule); });
    });

    // Keyboard/programmatic guard for inert rows (mouse is blocked by CSS pointer-events).
    $(document).on('click keydown', '.wpz-option-disabled input, .wpz-option-disabled select, .wpz-option-disabled textarea', function(e) {
        if (e.type === 'click' || e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
        }
    });
});

/**
 * Keyboard shortcuts reference dialog.
 *
 * Opened from the "Shortcuts" link in the page header or with "?", closed with
 * Esc, the close button or a click on the overlay. Lists the Mousetrap bindings
 * defined above (Ctrl/⌘+S, J, K) so they are discoverable.
 */
jQuery(document).ready(function($) {
    var $modal = $('#wpz-shortcuts-modal');
    if (!$modal.length) { return; }

    var $dialog = $modal.find('.wpz-shortcuts-modal__dialog');
    var $opener = null;
    var isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || '');

    // Show ⌘ on Apple devices, Ctrl everywhere else.
    $modal.find('.wpz-key--mod').each(function() {
        $(this).text($(this).data(isMac ? 'mac' : 'other'));
    });

    function isOpen() { return !$modal.prop('hidden'); }

    function open() {
        if (isOpen()) { return; }
        $opener = document.activeElement;
        $modal.prop('hidden', false);
        $('body').addClass('wpz-shortcuts-open');
        $dialog.trigger('focus');
    }

    function close() {
        if (!isOpen()) { return; }
        $modal.prop('hidden', true);
        $('body').removeClass('wpz-shortcuts-open');
        if ($opener && typeof $opener.focus === 'function') { $opener.focus(); }
        $opener = null;
    }

    $('#wpz-shortcuts-toggle').on('click', function(e) {
        e.preventDefault();
        isOpen() ? close() : open();
    });

    $modal.on('click', '[data-shortcuts-close]', function(e) {
        e.preventDefault();
        close();
    });

    // "?" toggles, Esc closes. Bound directly (the bundled Mousetrap build matches
    // printable keys by character code, which never equals the "/" keydown code),
    // and ignored while typing in a field like the other shortcuts.
    $(document).on('keydown', function(e) {
        var tag = (e.target.tagName || '').toLowerCase();
        var typing = tag === 'input' || tag === 'select' || tag === 'textarea' || e.target.isContentEditable;

        if (e.key === 'Escape' && isOpen()) {
            e.preventDefault();
            close();
        } else if ((e.key === '?' || (e.code === 'Slash' && e.shiftKey)) && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            isOpen() ? close() : open();
        }
    });
});

/**
 * Theme Options search.
 *
 * Indexes every option row (label, description, option id, section and
 * sub-section names) from the DOM, so it works for any theme without
 * configuration. Typing shows ranked matches with the query highlighted;
 * Enter/click switches to the option's section and flashes the row.
 * "/" focuses the field from anywhere on the page.
 */
jQuery(document).ready(function($) {
    var $box     = $('.wpz-options-search');
    var $input   = $('#wpz-options-search-input');
    var $results = $('#wpz-options-search-results');

    if (!$box.length) { return; }
    if ($('body').hasClass('wpzoom-restricted-mode')) { $box.remove(); return; }

    var MAX_RESULTS = 12;
    var index = [];
    var results = [];
    var activeIndex = -1;
    var timer = null;

    function textOf($el) { return $.trim($el.text()).replace(/\s+/g, ' '); }
    function navName(href) { return textOf($('#zoomNav a[href="' + href + '"]').first().clone().children('.bubble, span').remove().end()); }
    function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]; }); }
    function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    function buildIndex() {
        index = [];
        $('#zoomForm .tab_content').each(function() {
            var sectionId = '#' + this.id;
            var sectionName = navName(sectionId);

            $(this).find('.sub[id]').each(function() {
                var subId = '#' + this.id;
                var subName = navName(subId);

                $(this).find('.wpz_option_container').each(function() {
                    var $row = $(this);
                    var $label = $row.find('label').first();
                    var label = $label.length ? textOf($label) : textOf($row.find('legend, h3, h4').first());
                    if (!label) { return; }

                    var desc = textOf($row.find('.description').first());
                    var $field = $row.find('input, select, textarea').first();
                    var id = $field.length ? ($field.attr('name') || $field.attr('id') || '') : '';

                    index.push({
                        label: label, desc: desc, id: id, $row: $row,
                        type: 'option',
                        sectionId: sectionId, sectionName: sectionName,
                        subId: subId, subName: subName,
                        labelLc: label.toLowerCase(),
                        descLc: desc.toLowerCase(),
                        idLc: id.toLowerCase().replace(/[_\-]+/g, ' '),
                        pathLc: (sectionName + ' ' + subName).toLowerCase()
                    });
                });
            });
        });

        // Customizer controls (localized by PHP) open in a new tab via autofocus deep links.
        var customizer = (typeof WPZOOM_Theme_Options !== 'undefined' && $.isArray(WPZOOM_Theme_Options.customizerIndex)) ? WPZOOM_Theme_Options.customizerIndex : [];
        var customizerLabel = (typeof WPZOOM_Theme_Options !== 'undefined' && WPZOOM_Theme_Options.customizerLabel) ? WPZOOM_Theme_Options.customizerLabel : 'Customizer';

        customizer.forEach(function(c) {
            if (!c.label) { return; }
            var path = [customizerLabel, c.panel, c.section].filter(Boolean);
            index.push({
                type: 'customizer',
                label: c.label, desc: c.desc || '', id: c.id || '', url: c.url,
                sectionId: null, sectionName: path[1] || customizerLabel,
                subId: null, subName: path[path.length - 1],
                pathParts: path,
                labelLc: c.label.toLowerCase(),
                descLc: (c.desc || '').toLowerCase(),
                idLc: (c.id || '').toLowerCase().replace(/[_\-]+/g, ' '),
                pathLc: path.join(' ').toLowerCase()
            });
        });
    }

    function tokenize(query) {
        return $.trim(query.toLowerCase()).replace(/[&<>"']/g, ' ').split(/\s+/).filter(function(t) { return t.length; });
    }

    // Every token must match somewhere; label hits outrank id, path and description hits.
    function scoreItem(item, tokens) {
        var score = 0;
        for (var i = 0; i < tokens.length; i++) {
            var t = tokens[i], s = 0;
            if (item.labelLc.indexOf(t) !== -1) {
                s = new RegExp('(^|\\s)' + escapeRegExp(t)).test(item.labelLc) ? 10 : 6;
            } else if (item.idLc.indexOf(t) !== -1) {
                s = 4;
            } else if (item.pathLc.indexOf(t) !== -1) {
                s = 3;
            } else if (item.descLc.indexOf(t) !== -1) {
                s = 1;
            }
            if (!s) { return 0; }
            score += s;
        }
        // On equal relevance, options on this page rank above Customizer ones.
        return item.type === 'customizer' ? score - 0.5 : score;
    }

    function highlight(text, tokens) {
        var html = escapeHtml(text);
        if (!tokens.length) { return html; }
        var re = new RegExp('(' + tokens.map(escapeRegExp).join('|') + ')', 'gi');
        return html.replace(re, '<mark>$1</mark>');
    }

    function snippet(desc, tokens) {
        if (!desc) { return ''; }
        var lc = desc.toLowerCase(), pos = -1;
        for (var i = 0; i < tokens.length; i++) {
            pos = lc.indexOf(tokens[i]);
            if (pos !== -1) { break; }
        }
        var start = Math.max(0, pos - 40);
        var text = (start > 0 ? '…' : '') + desc.substr(start, 120) + (desc.length > start + 120 ? '…' : '');
        return highlight(text, tokens);
    }

    function updateNavCounts() {
        $('#zoomNav .wpz-nav-count').remove();
        if (!results.length) { return; }
        var counts = {};
        results.forEach(function(item) { counts[item.sectionId] = (counts[item.sectionId] || 0) + 1; });
        $.each(counts, function(sectionId, n) {
            $('#zoomNav .wz-parent > a[href="' + sectionId + '"]').append('<span class="wpz-nav-count">' + n + '</span>');
        });
    }

    function render(query, tokens) {
        updateWrapped(); // results anchor differently when the field sits on its own row
        var html = '';
        if (!results.length) {
            var noResults = (typeof WPZOOM_Theme_Options !== 'undefined' && WPZOOM_Theme_Options.searchNoResults) ? WPZOOM_Theme_Options.searchNoResults : 'No options match';
            html = '<div class="wpz-options-search__empty">' + escapeHtml(noResults) + ' “' + escapeHtml(query) + '”</div>';
        } else {
            var opens = (typeof WPZOOM_Theme_Options !== 'undefined' && WPZOOM_Theme_Options.customizerOpens) ? WPZOOM_Theme_Options.customizerOpens : 'Opens in the Customizer (new tab)';
            results.forEach(function(item, i) {
                var isCustomizer = item.type === 'customizer';
                var path = isCustomizer ? item.pathParts.map(escapeHtml).join(' › ') : escapeHtml(item.sectionName) + ' › ' + escapeHtml(item.subName);
                html += '<div class="wpz-options-search__item' + (isCustomizer ? ' wpz-options-search__item--customizer' : '') + '" role="option" id="wpz-options-search-item-' + i + '" data-index="' + i + '" aria-selected="false"' + (isCustomizer ? ' title="' + escapeHtml(opens) + '"' : '') + '>' +
                    (isCustomizer ? '<svg class="wpz-options-search__ext" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>' : '') +
                    '<span class="wpz-options-search__path">' + path + '</span>' +
                    '<span class="wpz-options-search__label">' + highlight(item.label, tokens) + '</span>' +
                    (item.desc ? '<span class="wpz-options-search__desc">' + snippet(item.desc, tokens) + '</span>' : '') +
                '</div>';
            });
        }
        $results.html(html).prop('hidden', false);
        $input.attr('aria-expanded', 'true');
        setActive(-1);
    }

    function search() {
        var query = $input.val();
        var tokens = tokenize(query);
        $box.toggleClass('has-value', query.length > 0);
        $box.find('.wpz-options-search__clear').prop('hidden', query.length === 0);

        if (!tokens.length || query.length < 2) {
            results = [];
            close();
            updateNavCounts();
            return;
        }

        if (!index.length) { buildIndex(); }

        results = index.map(function(item) { return { item: item, score: scoreItem(item, tokens) }; })
            .filter(function(r) { return r.score > 0; })
            .sort(function(a, b) { return b.score - a.score; })
            .map(function(r) { return r.item; });

        updateNavCounts();
        results = results.slice(0, MAX_RESULTS);
        render(query, tokens);
    }

    function setActive(i) {
        activeIndex = i;
        $results.find('.wpz-options-search__item').removeClass('is-active').attr('aria-selected', 'false');
        if (i < 0) { $input.removeAttr('aria-activedescendant'); return; }
        var $item = $results.find('.wpz-options-search__item').eq(i).addClass('is-active').attr('aria-selected', 'true');
        $input.attr('aria-activedescendant', $item.attr('id'));
        if ($item.length) { $item[0].scrollIntoView({ block: 'nearest' }); }
    }

    function close() {
        $results.prop('hidden', true).empty();
        $input.attr('aria-expanded', 'false');
        setActive(-1);
    }

    function clear(refocus) {
        clearTimeout(timer);
        $input.val('');
        search();
        if (refocus) { $input.trigger('focus'); } else { $input.trigger('blur'); }
    }

    function goTo(item) {
        if (item.type === 'customizer') {
            close();
            $input.trigger('blur');
            window.open(item.url, '_blank', 'noopener');
            return;
        }

        var $sectionLink = $('#zoomNav .wz-parent > a[href="' + item.sectionId + '"]');
        var $subLink = $('#zoomNav .sub > a[href="' + item.subId + '"]');

        if (!$sectionLink.parent().hasClass('active')) { $sectionLink.trigger('click'); }
        if (!$subLink.parent().hasClass('active')) { $subLink.trigger('click'); }

        // The nav handlers animate (slideUp/slideDown); finish them now and pin the
        // visible section + sub-section so the row can be measured right away.
        $('#zoomNav ul, #zoomForm .tab_content, #zoomForm .sub').stop(true, true);
        $('#zoomForm .tab_content, #zoomForm .sub').hide();
        $(item.sectionId).show();
        $(item.subId).show();
        $sectionLink.parent().find('ul').show();

        close();
        $input.trigger('blur');

        item.$row[0].scrollIntoView({ block: 'center' });
        $('#zoomForm .wpz-option-flash').removeClass('wpz-option-flash');
        void item.$row[0].offsetWidth; // restart the animation
        item.$row.addClass('wpz-option-flash');
    }

    $input.on('input search', function() {
        clearTimeout(timer);
        timer = setTimeout(search, 60);
    });

    $input.on('focus', function() {
        if ($input.val().length >= 2 && $results.prop('hidden')) { search(); }
    });

    $input.on('keydown', function(e) {
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
            if (!$results.prop('hidden')) {
                close();
            } else {
                clear(false);
            }
        } else if (e.key === 'Tab') {
            close();
        }
    });

    $box.on('click', '.wpz-options-search__clear', function(e) {
        e.preventDefault();
        clear(true);
    });

    $results.on('mousedown', '.wpz-options-search__item', function(e) {
        e.preventDefault(); // keep focus in the input until we navigate
        goTo(results[parseInt($(this).attr('data-index'), 10)]);
    });

    $results.on('mousemove', '.wpz-options-search__item', function() {
        var i = parseInt($(this).attr('data-index'), 10);
        if (i !== activeIndex) { setActive(i); }
    });

    $(document).on('mousedown', function(e) {
        if (!$(e.target).closest('.wpz-options-search').length) { close(); }
    });

    // "/" focuses the search from anywhere except while typing in a field.
    // (Ctrl/⌘+K is taken by the WordPress command palette since 7.1.)
    $(document).on('keydown', function(e) {
        var tag = (e.target.tagName || '').toLowerCase();
        var typing = tag === 'input' || tag === 'select' || tag === 'textarea' || e.target.isContentEditable;

        if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !typing) {
            e.preventDefault();
            $input.trigger('focus').trigger('select');
        }
    });

    buildIndex();

    // Flag the field when it has wrapped under the links (used to widen the results).
    var $links = $box.siblings('ul').first();
    function updateWrapped() {
        if (!$links.length) { return; }
        $box.toggleClass('is-wrapped', $box.offset().top >= $links.offset().top + $links.outerHeight() - 2);
    }
    updateWrapped();
    if (window.ResizeObserver) {
        new ResizeObserver(updateWrapped).observe($box.parent()[0]);
    } else {
        $(window).on('resize', updateWrapped);
    }

    buildIndex();

    // Deep link from the Customizer search: ?wpz_focus=<option id> opens the
    // option's section and flashes its row, then drops the parameter from the URL.
    var focusMatch = window.location.search.match(/[?&]wpz_focus=([^&#]+)/);
    if (focusMatch) {
        var focusId = decodeURIComponent(focusMatch[1]);
        var target = null;
        index.forEach(function (item) { if (!target && item.id === focusId) { target = item; } });
        if (target) { goTo(target); }
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', window.location.href.replace(/([?&])wpz_focus=[^&#]*&?/, '$1').replace(/[?&]$/, ''));
        }
    }
});
