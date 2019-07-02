<!DOCTYPE html>
<!--
To change this license header, choose License Headers in Project Properties.
To change this template file, choose Tools | Templates
and open the template in the editor.
-->
<?php require 'bootstrap.php'; ?>
<html>
    <head>
        <meta charset="UTF-8">
        <title></title>
		<link rel="stylesheet" href="//code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">
		<link rel="stylesheet" href="css/common.css">
		<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.0.13/css/all.css" integrity="sha384-DNOHZ68U8hZfKXOrtjWvjxusGo9WQnrNx2sqG0tfsghAvtVlRW3tvkXWZh58N9jp" crossorigin="anonymous">
		<style>
			#sortable { 
				list-style-type: none; 
				margin: 0; 
				padding: 0; 
				width: 100vw;
				height: 100vh; 
			}
			#sortable li { 
				position: relative;
				margin: 0px 0px 0px 0;
				padding: 0px;
				float: left;
				width: 20%;
			}
			#sortable li iframe {
				margin: 0px 0px 0px 0;
				padding: 0px;
				float: left;
				position: absolute;
				top: 0px;
				left: 0px;
				z-index: 0;
				width: 100%;
			}
			.ui-sortable-handle {
				position: absolute;
				top: 0px;
				right: 0px;
				z-index: 3000;
				width: 65px !important;
				height: 65px !important;;
			}
			.refresh {
				position: absolute;
				bottom: 0px;
				right: 0px;
				z-index: 3000;
				width: 2vw;
				height: 2vw;
				font-size: 1.3vw;
				color: #ffffff;
			}
			.move{
				background-image: url('move.png');
				background-repeat: no-repeat;
				background-position: center;;    
			}
			.expandFullScreen {
				position: absolute;
				top: 0px;
				left: 0px;
				z-index: 2000;
				width: 100% !important;
				height: 100% !important;;
			}
			.closeFullScreen {
				position: absolute;
				top: 0px;
				left: 0px;
				z-index: 10000;
				width: 100% !important;
				height: 100% !important;;
			}
			.loading {
				position: fixed;
				top: 0px;
				left: 0px;
				z-index: 4800;
				bottom: 0;
				right: 0;
				background: url(loading_apple.gif);
				background-repeat: no-repeat;
				background-size: 65px 65px;
				background-position: center; 
			}
			.ui-state-default, .ui-widget-content .ui-state-default, .ui-widget-header .ui-state-default, .ui-button, html .ui-button.ui-state-disabled:hover, html .ui-button.ui-state-disabled:active {
				border: 0px solid #000 !important;
				background: #000 !important;
				font-weight: normal;
			}
			.fullscreen{
				z-index: 4000 !important; 
				position: fixed !important; 
				top: 0 !important; 
				left: 0 !important;
				bottom: 0;
				right: 0;
				background-color:rgba(0, 0, 0, 0.75);
			}
			 .fullscreen iframe{
				position: fixed;
				top: 0px;
				left: 0px;
				right: 0 !important;
				bottom: 0 !important;
				z-index: 4900;
				width: 100vw;
			}
			body {
				height: 100vh;
				width: 100vw;
				margin: 0px;
				padding: 0px;
			}
			#player {
				position: relative !important;
				height: 100vh;
				width: 100vw;
				z-index: 4900;
			}
			#player object {
				z-index: 4950;	
			}
		
		}
		</style>
		<script src="flash/locomote.min.js"></script>
		<script src="https://code.jquery.com/jquery-3.2.1.min.js" integrity="sha256-hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=" crossorigin="anonymous"></script>
		<script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"></script>
		<script src="js/js.cookie.min.js"></script>
		<script>
		$(function(){

			var $content = $('#sortable li');
			var $window = $(window).on('resize', function(){
			   var height = ($(window).width() / 5) / 1.777777;
			   var width = $(window).width() / 5;
			   $content.height(height);
			}).trigger('resize'); //on page load

		});
		$(document).ready(function() {
			var locomote = null;

			var $sortableList = $("#sortable");
			var sortEventHandler = function(event, ui){
				updateSort();
				console.log("New sort order!");
			};
			$('.refresh').click(function(e){
				var stream = '/flash/index.php?cameraId='+$(this).parent().attr('id');
				$(this).parent().find("iframe").attr("src", stream);
			});
			$('.expandFullScreen').dblclick(function(e){

				$('#player').height($(window).width() / 1.777777);
				$('#player').width($(window).width());

				$.get("getStreamUrl.php?cameraId="+$(this).parent().attr('id'), function(response, status){
					response = JSON.parse(response);
					if(response['data']['rtmpHiResStreamUrl'] && response['data']['extra']['platform'] !="GEN3L")
					{
						fullScreenUrl = response['data']['rtmpHiResStreamUrl'];
					}
					else
					{
						fullScreenUrl = response['data']['rtmpStreamUrl'];
					}
					
					/* Load SWF and instantiate Locomote */
					locomote = new Locomote('player', 'flash/Player.swf');
					var swfconfig = {scaleUp: true};

					locomote.on('apiReady', function() {
						locomote.config(swfconfig);
						locomote.play(fullScreenUrl);
					});
					
					/* If any error occurs, we should take action */
					locomote.on('error', function(err) {
					/*  console.log(err); */
					});
				});

				
				
				//var playerHeight = $(window).width() / 1.777777;
				//var playerWidth = $(window).width();
				//var stream = '/flash/index.php?cameraId='+$(this).parent().attr('id')+'&view=full&playerWidth='+Math.round(playerWidth)+'&playerHeight='+Math.round(playerHeight);
				//$('.fullscreen iframe').attr("src", stream);
				$('.fullscreen').toggle();
			});
			$('.closeFullScreen').dblclick(function(e){
				locomote.destroy();
				//var stream = '';
				//$('.fullscreen iframe').attr("src", stream);
				$('.fullscreen').toggle();
			});
			$sortableList.sortable({
				handle: '.handle',
				stop: sortEventHandler,
				start: function(e, ui) {
				// creates a temporary attribute on the element with the old index
				$(this).attr('data-previndex', ui.item.index());
				},
				update: function(e, ui) {
					// gets the new and old index then removes the temporary attribute
					var newIndex = ui.item.index();
					var oldIndex = $(this).attr('data-previndex');
					$(this).removeAttr('data-previndex');
				}
			})
			
			$sortableList.on("sortchange", sortEventHandler);
			
			var gridorder = {};
			function updateSort() {
				var listElements = $sortableList.children();
				console.log(listElements);
				listElements.each(function(i) {
					gridorder[this.id] = i ;
				});
				Cookies.remove('gridsort');
				Cookies.set("gridsort", JSON.stringify(gridorder), { expires: 999 });
				
				console.log(JSON.stringify(gridorder));
			};
		});
					   
		</script>
	</head>
    <body>
		<ul id="sortable">
        <?php
		// var_dump($cameras);
		$objCount = 0;
		foreach( $cameras as $key => $value){
			if($value['status']=="CONNECTED") {
			echo '<li id="'.$key.'" sort="'.$value['sortOrder'].'" hostVersion="'.$value['hostVersion'].'" wait="'.$objCount.'" class="ui-state-default"><span class="refresh"><i style="display:none" class="fas fa-sync"></i></span><span class="expandFullScreen"></span><span class="handle"></span><iframe class="stream" frameBorder="0" style="" scrolling="no" src=""></iframe></li>';
			$objCount = $objCount+1;
			}
        }
        ?>
		</ul>
		<div class="fullscreen" style="display: none;"><span class="loading"></span><span class="closeFullScreen"></span>
			<div id="player" class="player"></div>
		</div>
		<script>
		 $(document).ready(function(){
			
			$(".ui-sortable-handle").hover(function(){
				$(this).addClass("move");
			}, function(){ 
				$(this).removeClass("move");
			});

			$(".refresh").hover(function(){
				$(this).find("i").fadeIn(); 
			}, function(){ 
				$(this).find("i").fadeOut();
			});
			
			if (Cookies.get('reloaded')!='true') {
				Cookies.set('reloaded', 'true', { expires: 0.5 });
				setTimeout(function () {
					location.reload();
				}, 10*60000);	
			
			}

			var playerHeight = ($(window).width() / 5) / 1.777777;
			var playerWidth = $(window).width() / 5;

			$('#sortable li').each(function(index) {
			var stream = '/flash/index.php?cameraId='+$(this).attr('id')+'&hostVersion='+$(this).attr('hostVersion')+'&playerWidth='+Math.round(playerWidth)+'&playerHeight='+Math.round(playerHeight)+'&wait='+index;
			$(this).find("iframe").attr("src", stream);
			});


		});
		</script>
    </body>
</html>
