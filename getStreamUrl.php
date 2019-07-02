<?php require 'bootstrap.php';


$cameraId = $_GET['cameraId'];

if(isset($cameras[$cameraId]))
{
	echo json_encode(array('data'=>$cameras[$cameraId]));
}
else
{
	echo json_encode(array('data'=>array('error'=>'error', 'message'=>'could not find the specified camera id.')));
}
