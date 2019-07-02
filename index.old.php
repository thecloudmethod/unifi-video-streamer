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
        <link rel="stylesheet" href="css/common.css">
		<script src="https://code.jquery.com/jquery-3.2.1.min.js" integrity="sha256-hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=" crossorigin="anonymous"></script>
    </head>
    <body>
	
        <?php
		// var_dump($cameras);
        foreach( $cameras as $key => $value){
			if($value['status']=="CONNECTED") {
				echo '<iframe frameBorder="0" style="" scrolling="no" src="/flash/index.php?cameraId='.$key.'&hostVersion='.$value['hostVersion'].'"></iframe>';
			}
        }
        ?>
		<script>
		 $(document).ready(function(){
			setInterval(function(){
				$("iframe").each(function(i) {
					$(this).delay(30000 * i).attr('src', $(this).attr('src'));
					consolelog(this);
				}); 
			},390000);
		 });
		</script>
    </body>
</html>
