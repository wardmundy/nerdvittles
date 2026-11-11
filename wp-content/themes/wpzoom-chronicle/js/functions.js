/**
 * Theme functions file
 */



 jQuery(function( $ ) {

    /**
     * Activate FitVids.
     */
    $(".entry-content, .video-cover, .post-video").fitVids();



     $('#toggle-top').click(function() {
         $('#topmenu-wrap').slideToggle(400);
         $(this).toggleClass("active");

         return false;

     });

     $('#toggle-main').click(function() {
         $('#menu-wrap').slideToggle(400);
         $(this).toggleClass("active");

         return false;

     });


     function mobileadjust() {

         var windowWidth = $(window).width();

         if( typeof window.orientation === 'undefined' ) {
             $('#menu-wrap').removeAttr('style');
             $('#topmenu-wrap').removeAttr('style');
         }

         if( windowWidth < 769 ) {
             $('#menu-wrap').addClass('mobile-menu');
             $('#topmenu-wrap').addClass('mobile-menu');
         }

     }

     mobileadjust();

     $(window).resize(function() {
         mobileadjust();
     });



    if ( $('#respond input, #respond textarea').length > 0 && 'placeholder' in $('#respond input, #respond textarea')[0] ) {
        $('#respond').find('#commentform p label').hide();
    }



 });


