jQuery(document).ready(function($) {
    var $mainNav = $('.zoom-nav-main');
    var $secondaryNav = $('.zoom-nav-secondary');
    var $backButton = $('.zoom-nav-back');
    var $defaultText = $('.btn-text-default');
    var $alternateText = $('.btn-text-alternate');
    
    // When clicking the back button
    $backButton.on('click', function(e) {
        e.preventDefault();
        
        if ($mainNav.hasClass('slide-left')) {
            // Going back to main menu
            $mainNav.removeClass('slide-left');
            $secondaryNav.removeClass('active');
            $defaultText.show();
            $alternateText.hide();
        } else {
            // Going to secondary menu
            $mainNav.addClass('slide-left');
            $secondaryNav.addClass('active');
            $defaultText.hide();
            $alternateText.show();
        }
    });
    
    // When clicking Theme Options
    $('.show-main-menu').on('click', function(e) {
        e.preventDefault();
        
        $mainNav.removeClass('slide-left');
        $secondaryNav.removeClass('active');
        $defaultText.show();
        $alternateText.hide();
    });
}); 