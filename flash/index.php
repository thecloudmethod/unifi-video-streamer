<?php
require '../bootstrap.php'; 

$cameraId = $_GET['cameraId'];
if (isset($_GET['hostVersion'])) {
	$hostVersion = $_GET['hostVersion'];
} else {
	$hostVersion = $cameras[$cameraId]['hostVersion'];
}
if($hostVersion=="3.1.5")
{
	$videoScaleMultiplier = 1.03;
}
else
{
	$videoScaleMultiplier = 1.01;
}
if (isset($_GET['playerWidth'])) {
	$playerWidth = ($_GET['playerWidth'])*$videoScaleMultiplier.'px';
} else {
	$playerWidth = '100vw';
}
if (isset($_GET['playerHeight'])) {
	$playerHeight = ($_GET['playerHeight'])*$videoScaleMultiplier.'px';
} else {
	$playerHeight = '100vh';
}
if (isset($_GET['view'])) {
	$view = $_GET['view'];
} else {
	$view = 'low';
}
if (isset($_GET['wait'])) {
	$wait = 500;
	//$wait = $_GET['wait']*1500;
} else {
	$wait = 500;
}
if ($view == 'full') {
	$streamUrl = $cameras[$cameraId]['rtmpHiResStreamUrl'];
}
else if ($view == 'standard')
{
	$streamUrl = $cameras[$cameraId]['rtmpStreamUrl'];
} 
else if ($view == 'low')
{
	if(isset($cameras[$cameraId]['rtmpStreamUrlLowRes']))
	{
		//echo '<script type="text/javascript">console.log({"rtmpStream":"'.$cameras[$cameraId]['rtmpStreamUrlLowRes'].'", "$cameraId":"'.$cameraId.'"})</script>';
		$streamUrl = $cameras[$cameraId]['rtmpStreamUrlLowRes'];
	}
	else
	{
		$streamUrl = $cameras[$cameraId]['rtmpStreamUrl'];
	}	
} 
else 
{
	if(isset($cameras[$cameraId]['rtmpStreamUrlLowRes']))
	{
		//echo '<script type="text/javascript">console.log({"rtmpStream":"'.$cameras[$cameraId]['rtmpStreamUrlLowRes'].'", "$cameraId":"'.$cameraId.'"})</script>';
		$streamUrl = $cameras[$cameraId]['rtmpStreamUrlLowRes'];
	}
	else
	{
		$streamUrl = $cameras[$cameraId]['rtmpStreamUrl'];
	}
	
}
?>
<html>
  <head>
    <title>Locomote</title>
    <style type="text/css">
    #player object{}
		#player {
			position: relative !important;
			<?php if ($hostVersion=="3.1.5") { echo "height: ".$playerHeight."; width: ".$playerWidth."; top: -4px;"; } else { echo "height: ".$playerHeight."; width: ".$playerWidth."; top: -1px;"; }; ?>
		}
		body {
			margin: 0px !important;
			padding: 0px !important;
		}
    </style>
    <script src="locomote.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.2.1.min.js" integrity="sha256-hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=" crossorigin="anonymous"></script>
   
  </head>
  <body>
    <div id="player" class="player"></div>
	</body>
	
	<script type="text/javascript">

$(document).ready(function() {

	
	/* Load SWF and instantiate Locomote */
	var locomote = new Locomote('player', 'Player.swf');
	var swfconfig = {scaleUp: true};



	/* Set up a listener for when the API is ready to be used */
	locomote.on('apiReady', function() {
		locomote.config(swfconfig);
		/* console.log('API is ready. `play` can now be called');*/

		
		/*  Tell Locomote to play the specified media */
			locomote.play('<?php echo $streamUrl ?>');
		


	});



	<?php if ($view == 'full') { ?>

	locomote.on('streamStarted', function(){
		
		$('.player').height($(window).width() / 1.777777);
		$('.player').width($(window).width());
		$('.player object').height($(window).width() / 1.777777);
		$('.player object').width($(window).width());
		$('.player').trigger('resize');
		$('.player object').trigger('resize');
		console.log("Resize Triggers By streamStarted")
		console.log($(window).width() / 1.777777);
		console.log($(window).width());
	});

	<?php } ?>


	/* Start listening for streamStarted event */
	locomote.on('streamStarted', function() {
		/* console.log(locomote.streamStatus()); */
		<?php if ($view != 'full') { ?>
		locomote.muteSpeaker();
		<?php } ?>
	});

	/* If any error occurs, we should take action */
	locomote.on('error', function(err) {
	/*  console.log(err); */
	});



});

</script>
</html>