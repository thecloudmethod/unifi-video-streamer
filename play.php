<?php
require 'bootstrap.php'; 

$cameraId = $_GET['cameraId'];
$hostVersion = $_GET['hostVersion'];

$streamUrl = $cameras[$cameraId]['streamUrl'];
?>
<html>
    <head>
        <title>EvoStream WebSocket Video Demo</title>
        <link rel="stylesheet" href="css/common.css">
        <meta charset="UTF-8">
		<script src="https://code.jquery.com/jquery-3.2.1.min.js" integrity="sha256-hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=" crossorigin="anonymous"></script>
        <script src="//ers.evostream.com:5050/demo/js/evohtml5player.bundle.js"></script>
		<?php 
		if($hostVersion=="3.1.5"){
		?>
		<script type="text/javascript" src="js/vxgplayer-1.8.31.min.js"> </script> 
		<?php
		}
		?>
        <script>
            var ws;
            var started = false;
			

            function stop() {
                if (ws)
                    ws.close();

                stopPlayer();
                started = false;
            }

            function startPlay() {
                // Prevent accidental double clicks
                if (started) return;

                started = true;
				
				//emsVideo.init();
				//emsVideo.attachVideo();
				
				

                initializePlayer();

                //compute the final URI of the stream
                var streamURI = document.getElementById("wsUrl").value;
                // streamURI += "/" + document.getElementById("streamName").value + "?progressive";

                //connect to the streaming server via WS
                ws = new WebSocket(streamURI);
                ws.binaryType = 'arraybuffer';

                //setup the handler for when data arrives via WS
                ws.onmessage = function (msg) {
                    var arrayView = new Uint8Array(msg.data);
                    parseData(arrayView);
					//emsVideo.appendChunk(msg.data);
                };
            }
        </script>
		<!--
		<script>
		 $(document).ready(function(){
			setInterval(function(){ reload_page(); },6*60000);
		 });

		 function reload_page()
		 {
			window.location.reload(true);
		 }
		</script>
		-->
    </head>
    <body>
	<?php 
	if($hostVersion=="3.1.5"){
	?>
		<div class="vxgplayer" id="vxg_media_player1" latency="10000" auto-reconnect avsync mute url="<?php echo $cameras[$cameraId]['rstp'][0]['rtspUrl'] ?>" autostart muted nmf-src="pnacl/Release/media_player.nmf" nmf-path="media_player.nmf"></div>
    <?php
	} else {
	?>
        <input type="hidden" id="wsUrl" value="<?php echo $streamUrl ?>">
        <input type="hidden" id="streamName" value="<?php echo $streamUrl ?>">
        <video width="480" height="270" id="videoElement" autoplay muted></video>
		
	<script>
        startPlay()
    </script>   
	<?php
	}
	?>
     
    </body>
    
</html>