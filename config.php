<?php

/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

$config['servers'] = array(
    /*
    array(
        'protocol' => 'http', 
        'server' => '192.168.1.30',
        'port' => '7070',
        'apiKey' => 's6dsbpzYoHAhE3yJ'
    ),
    */
    array(
        'protocol' => 'http', // http or https
        'server' => '192.168.1.29', // server address domain or ip address
        'port' => '7080', // https = 7443, http = 7080, Unless changed in the unifi config.
        'apiKey' => 'f4lBh6w2EepuLgwAoa6eXZxuqT59LflA' // api key that can be found in the user settings of unifi
    ),

    array(
        'protocol' => 'http', // http or https
        'server' => '192.168.1.28', // server address domain or ip address
        'port' => '7080', // https = 7443, http = 7080, Unless changed in the unifi config.
        'apiKey' => 'lomYXYfD65fehCzgEJIEAVaET46nshYU' // api key that can be found in the user settings of unifi
    ),
    
    /*
     * 
     * You can add addition comptuer by uncommenting below. 
    array(
        'protocol' => 'http', 
        'server' => 'your.server.com',
        'port' => '7080',
        'apiKey' => 'xxxxxxxxxxxx'
    ),
     
     */
);
