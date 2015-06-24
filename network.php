<!DOCTYPE HTML>
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<title>Linked Visions</title>
<script src="js/conf.js"></script> 
<script src="js/jquery.min.js"></script>
<script src="js/jquery-ui.min.js"></script>
<script src="js/jquery.history.js"></script>
<script src="js/jquery.rdfquery.core.min-1.0.js"></script>
<script src="js/jquery.colorbox-min.js"></script>
<script src="js/dragdealer.js"></script>
<script src="js/d3.v3.5.5.js"></script> 
<script src="js/vex.min.js"></script> 
<script src="js/network.js"></script> 
<script src="js/jquery.idle-timer.js"></script> 

<link rel="stylesheet" href="css/network.css">
<link rel="stylesheet" href="css/vex.css">
<link rel="stylesheet" href="css/vex-theme-os.css">
<link rel="stylesheet" href="css/colorbox.css">

<link rel="shortcut icon" href="menu/aictheme_favicon.png" type="image/x-icon">
</head>

<body>
<!-- Google Tag Manager -->
<noscript><iframe src="//www.googletagmanager.com/ns.html?id=GTM-MQBCFS"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'//www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-MQBCFS');</script>
<!-- End Google Tag Manager -->

<img src="menu/logo.png" id="logo">
<div id="title">WHISTLER AND ROUSSEL <br /> <span class="subtitle">LINKED VISIONS</span></div>
<a href="about.html" id="about">ABOUT</a>

<div id="network">
    <div id="popUp">
    </div>
	
  <div class="filters">
    <div class="filter-button active" id="filter_all">All</div>     
	  <div class="filter-button" id="filter_family">Family</div>     
	  <div class="filter-button" id="filter_friends">Friends</div>     
	  <div class="filter-button" id="filter_colleagues">Colleagues</div>     
	  <div class="filter-button" id="filter_mentors">Mentors & Followers</div>
	  <div class="filter-button" id="filter_employers">Artists & Models</div>     
  </div>
</div>


<div id="spinner">
	<img src="menu/preloader.gif">
    <span>LOADING</span>
</div>
<script>
if (interactive == true) {
//add timer for interactive
   (function($){
	//3 minutes
	var timeout = 60000;
	$(document).bind("idle.idleTimer", function(){
		window.location.href = 'index.html';
	});
	$(document).bind("active.idleTimer", function(){
		//reset timer? listen for idleness?
	});
	$.idleTimer(timeout);
	})(jQuery);
//logo function
	$('#logo').dblclick(function() {location.reload();});

} else {
	$('#logo').addClass('logopointer');
	$('#logo').click(function() {
	window.location.href ='http://www.artic.edu';
	});
}
</script>
</body>
</html>
