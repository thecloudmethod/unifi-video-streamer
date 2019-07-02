<?php
ini_set("xdebug.var_display_max_children", -1);
ini_set("xdebug.var_display_max_data", -1);
ini_set("xdebug.var_display_max_depth", -1);
/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
require 'config.php';
require 'unifiVideoViewer.php';

$cameras = array();

foreach( $config['servers'] as $key => $serverSettigns){
    $unifiServer = new unifiVideoViewer($serverSettigns['protocol'], $serverSettigns['server'], $serverSettigns['port'], $serverSettigns['apiKey']);
    $cameras = array_merge($cameras, $unifiServer->cameraList);
}

$tempCammeraList = $cameras;
$tempCammeraList = $unifiServer->array_sort($tempCammeraList, 'sortOrder', SORT_ASC);
$cameras = $tempCammeraList;