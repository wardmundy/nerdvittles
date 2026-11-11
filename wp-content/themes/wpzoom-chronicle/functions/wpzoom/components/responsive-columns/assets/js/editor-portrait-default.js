/**
 * WPZOOM Responsive Columns — editor helper.
 *
 * The bundled editor JS registers four orientation tabs and defaults to the
 * first one (Tablet landscape), which we hide via CSS. This observer watches
 * for new Responsive Columns panels and programmatically selects the first
 * visible tab so the Portrait range control is shown by default.
 */
( function () {
	'use strict';

	function selectVisibleTab( tabList ) {
		var tabs = tabList.querySelectorAll( 'button[role="tab"]' );
		var active = tabList.querySelector( 'button[role="tab"].is-active' );

		if ( ! active || active.offsetParent !== null ) {
			return;
		}

		for ( var i = 0; i < tabs.length; i++ ) {
			if ( tabs[ i ].offsetParent !== null ) {
				tabs[ i ].click();
				return;
			}
		}
	}

	function scan( root ) {
		var lists = root.querySelectorAll
			? root.querySelectorAll( '.s1-rc-breakpoints .components-tab-panel__tabs' )
			: [];

		for ( var i = 0; i < lists.length; i++ ) {
			selectVisibleTab( lists[ i ] );
		}
	}

	var observer = new MutationObserver( function ( mutations ) {
		for ( var i = 0; i < mutations.length; i++ ) {
			var added = mutations[ i ].addedNodes;
			for ( var j = 0; j < added.length; j++ ) {
				if ( added[ j ].nodeType === 1 ) {
					scan( added[ j ] );
				}
			}
		}
	} );

	observer.observe( document.body, { childList: true, subtree: true } );
	scan( document.body );
} )();
