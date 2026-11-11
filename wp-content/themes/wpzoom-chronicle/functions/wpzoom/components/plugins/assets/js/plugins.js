jQuery(document).ready(($) => {

// Install plugin item
$('.js-wpzoom-plugin-item-button').on('click', function( event ) {
    event.preventDefault();

    const btn = $(this);
    var pluginsToInstall = btn.closest( '.section_footer' ).find( 'input[type=checkbox]' ).serializeArray();

    if ( pluginsToInstall.length === 0 ) {
        return false;
    }

    wpzoomInstallPluginsAjaxCall( pluginsToInstall, 0, btn, false );

    
} );

var pluginsToInstall = $( '.wpz-grid-wrap .wpzoom-plugin-item .section_footer input[type=checkbox]' ).serializeArray();
if ( pluginsToInstall.length === 0 ) {
    $('.js-wpzoom-install-all-plugins').addClass( 'button-disabled' );
}

// Install all plugins
$('.js-wpzoom-install-all-plugins').on('click', function( event ) {
    event.preventDefault();

    var $button = $( this );
    var pluginsToInstall = $( '.wpz-grid-wrap .wpzoom-plugin-item .section_footer input[type=checkbox]' ).serializeArray();
    
    if ( pluginsToInstall.length === 0 ) {
        return false;
    }

    $button.addClass( 'button-disabled' );

    wpzoomInstallPluginsAjaxCall( pluginsToInstall, 0, $button, false );
} );

/**
 * Install plugins via AJAX
 *
 * @param {Object[]} plugins The array of plugin objects with name and value pairs.
 * @param {int} counter, The counter of the plugin to import from the list above.
 * @param {Object} $button The jQuery object of the submit button.
 * @param {bool} pluginInstallFailed If there were any failed plugin installs.
 */
function wpzoomInstallPluginsAjaxCall( plugins, counter, $button, pluginInstallFailed ) {
    var plugin = plugins[ counter ],
    slug = plugin.name;

    var pluginData = $( '.plugin-item-' + slug ).attr( 'plugin-data' );    

    $.ajax({
        method: 'POST',
        url: ajaxurl,
        data:        {
            action: 'wpzoom_install_plugin',
            //security: ocdi.ajax_nonce,
            slug: slug,
            pluginData: pluginData,
        },
        beforeSend:  function() {
            var $currentPluginItem = $( '.plugin-item-' + slug );
            $currentPluginItem.addClass( 'plugin-item--loading' );
            $currentPluginItem.find( 'a.button' ).text( 'Installing...' );
        }
    } )
    .done( function( response ) {
        var $currentPluginItem = $( '.plugin-item-' + slug );
        
        $currentPluginItem.removeClass( 'plugin-item--loading' );


        if ( response.success ) {
            $currentPluginItem.addClass( 'plugin-item--active' );
            $currentPluginItem.find( 'input[type=checkbox]' ).prop( 'disabled', true );
            $currentPluginItem.find( 'a.button' ).text( 'Active' );
            $currentPluginItem.find( 'a.button' ).addClass( 'button-disabled' );
        } else {

            if ( -1 === response.data.indexOf( '<p>' ) ) {
                response.data = '<p>' + response.data + '</p>';
            }

            $currentPluginItem.find( '.js-wpzoom-plugin-item-error' ).append( response.data );
            $currentPluginItem.find( 'input[type=checkbox]' ).prop( 'checked', false );
            pluginInstallFailed = true;
        }
    })
    .fail( function( error ) {
        var $currentPluginItem = $( '.plugin-item-' + slug );
        $currentPluginItem.removeClass( 'plugin-item--loading' );
        $currentPluginItem.find( '.js-inpiro-plugin-item-error' ).append( '<p>' + error.statusText + ' (' + error.status + ')</p>' );
        pluginInstallFailed = true;
    })
    .always( function() {
        counter++;
        if ( counter === plugins.length ) {

            $button.removeClass( 'wpzoom-button-disabled' );
        } else {
            wpzoomInstallPluginsAjaxCall( plugins, counter, $button, pluginInstallFailed );
        }
    } );

}

});