<?php
/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/**
 * Description of unifiVideoViewer
 *
 * @author bmorgan
 */
class unifiVideoViewer {
    var $serverProtocol;
    var $serverHost;
    var $serverPort;
    var $apiKey;
    private $bootstrapResponse;
    private $camreaResponse;
    var $cameraList;
    var $callUrl;
    var $unifiVersion;
    
    function __construct($serverProtocol, $serverHost, $serverPort, $apiKey) {		
         
        $this->serverProtocol = $serverProtocol; //http or https
        $this->serverHost = $serverHost; //my.site.com or 192.168.xxx.xxx
        $this->apiKey = $apiKey; //You can get this key from the user section of Unifi-Video
        $this->setServerPort($serverPort);
        $this->getCameras();
        $this->bootstrapJSON();
        $this->setUnifiVerson();
        $this->listCameras();
        $this->buildStremArr();
		$this->buildStremRtmpArr();
		$this->setCameraGridNumber();
	}
	
	public function array_sort($array, $on, $order=SORT_ASC)
	{
		$new_array = array();
		$sortable_array = array();

		if (count($array) > 0) {
			foreach ($array as $k => $v) {
				if (is_array($v)) {
					foreach ($v as $k2 => $v2) {
						if ($k2 == $on) {
							$sortable_array[$k] = $v2;
						}
					}
				} else {
					$sortable_array[$k] = $v;
				}
			}

			switch ($order) {
				case SORT_ASC:
					asort($sortable_array);
				break;
				case SORT_DESC:
					arsort($sortable_array);
				break;
			}

			foreach ($sortable_array as $k => $v) {
				$new_array[$k] = $array[$k];
			}
		}

		return $new_array;
	}

    
    private function setCameraGridNumber() {
		if (isset($_COOKIE["gridsort"])){
			$sortOrder = (array) json_decode($_COOKIE["gridsort"]);
		}
		foreach ($this->cameraList as $cameraid => $camera) {
			
			if(isset($sortOrder[$cameraid])){
				$this->cameraList[$cameraid]['sortOrder'] = $sortOrder[$cameraid];
			} else {
				$this->cameraList[$cameraid]['sortOrder'] = 1000;
			}
		}
    }
	
	private function buildStremArr() {
        foreach ($this->cameraList as $cameraid => $camera) {
            if($this->cameraList[$cameraid]["extra"]["managed"]) {
                if($this->unifiVersion=="3.1.5"){
                    $this->cameraList[$cameraid]['streamUrlLowRes'] = $this->getCameraStreamUrl($camera['uuid'], '2');
                    $this->cameraList[$cameraid]['streamUrl'] = $this->getCameraStreamUrl($camera['uuid'], '1');
                    $this->cameraList[$cameraid]['streamUrlHighRes'] = $this->getCameraStreamUrl($camera['uuid'], '0');
                } else {
                    $this->cameraList[$cameraid]['streamUrlLowRes'] = $this->getCameraStreamUrl($camera['uuid'], '2');
                    $this->cameraList[$cameraid]['streamUrl'] = $this->getCameraStreamUrl($cameraid, '1');
                    $this->cameraList[$cameraid]['streamUrlHighRes'] = $this->getCameraStreamUrl($cameraid, '0');
                }
            } else {
                unset($this->cameraList[$cameraid]);
            }
        }
    }
	
	private function buildStremRtmpArr() {
        foreach ($this->cameraList as $cameraid => $camera) {
            if($this->unifiVersion=="3.1.5"){
                $this->cameraList[$cameraid]['rtmpStreamUrlLowRes'] = $this->getCameraRtmpUrl($camera['uuid'], '2');
                $this->cameraList[$cameraid]['rtmpStreamUrl'] = $this->getCameraRtmpUrl($camera['uuid'], '1');
				$this->cameraList[$cameraid]['rtmpHiResStreamUrl'] = $this->getCameraRtmpUrl($camera['uuid'], '0');
            } else {
                $this->cameraList[$cameraid]['rtmpStreamUrlLowRes'] = $this->getCameraRtmpUrl($camera['uuid'], '2');
                $this->cameraList[$cameraid]['rtmpStreamUrl'] = $this->getCameraRtmpUrl($cameraid, '1');
				$this->cameraList[$cameraid]['rtmpHiResStreamUrl'] = $this->getCameraRtmpUrl($cameraid, '0');
            }
        }
    }
    
    public function listCameras(){
        $cameras = $this->getArrFromJSON($this->camreaResponse, 'data');
        $cameraArr = "";
        foreach ($cameras as $camera) {
            $cameraArr[$camera['_id']] = array(
                'uuid'=>$camera['uuid'],
                'name'=>$camera['name'],
                'status'=> $camera['state'],
				'rstp'=>$this->hasRstp($camera),
				'hostVersion' => $this->unifiVersion,
                'extra'=>$camera,
                'streamUrl'=>'');
        }
        $this->cameraList = $cameraArr;
    }
	
	private function hasRstp($camera){
        
		if (!empty($camera['channels'])) {
			$channaelArr = array();
			foreach ($camera['channels'] as $channel) {
				if($channel['isRtspEnabled'] && isset($channel['rtspAlias'])){
					$channaelPreArr = array(
						'rtspUrl' => $this->buildRtspUrl($this->serverHost,$channel['rtspAlias']),
						'res' => $channel['width']
					);
					array_push($channaelArr, $channaelPreArr);
				}
			}
			if (!empty($channaelArr)) {
				return $channaelArr;
			} else {
				return null;
			}
		} elseif (!empty($camera['channelSettings'])) {
			$channaelArr = array();
			foreach ($camera['channelSettings'] as $key => $channel) {
				if($channel['enableVodRtsp']){
					
					$resProp = str_replace("channel","video",$key);
					if (!empty($camera['videoProperties']['video'][$resProp]['width'])) {
						$resProp = $camera['videoProperties']['video'][$resProp]['width'];
					} else {
						$resProp = null;
					}
					
					$channaelPreArr = array(
						'rtspUrl' => $this->buildRtspUrl($this->serverHost,$channel['vodAlias']),
						'res' => $resProp
					);
					array_push($channaelArr, $channaelPreArr);
				}
			}
			if (!empty($channaelArr)) {
				return $channaelArr;
			} else {
				return null;
			}
		} else {
			return null;
		}
        
    }
	
	private function buildRtspUrl ($host, $alias) {
		if ($host && $alias) {
			return 'rtsp://'.$host.':7447/'.$alias;
		} else {
			return null;
		}
	}
    
    private function getCameraStreamUrl($id, $res){
        if($res=='2')
        {
            $cameraStreamJSON = $this->streamJSON($id, $res);
            if($this->hasLowRes($cameraStreamJSON))
            {
                if ($this->serverProtocol=="https") {
                    return $this->getArrFromJSON($cameraStreamJSON,'data/0/wssPath').'/'.$this->getArrFromJSON($cameraStreamJSON,'data/0/streamName').'?progressive';
                } else {
                    return $this->getArrFromJSON($cameraStreamJSON,'data/0/wsPath').'/'.$this->getArrFromJSON($cameraStreamJSON,'data/0/streamName').'?progressive';
                }
            }
        }
        else
        {
            $cameraStreamJSON = $this->streamJSON($id, $res);
        }
        
    }
	
	private function getCameraRtmpUrl($id, $res){
        if($res=='2')
        {
            $cameraStreamJSON = $this->streamJSON($id, $res);
            if($this->hasLowRes($cameraStreamJSON))
            {
                if ($this->serverProtocol=="https") {
                    return $this->getArrFromJSON($cameraStreamJSON,'data/0/rtmpPath').'/'.$this->getArrFromJSON($cameraStreamJSON,'data/0/streamName');
                } else {
                    return $this->getArrFromJSON($cameraStreamJSON,'data/0/rtmpPath').'/'.$this->getArrFromJSON($cameraStreamJSON,'data/0/streamName');
                }
            }
        }
        else
        {
            $cameraStreamJSON = $this->streamJSON($id, $res);
            if ($this->serverProtocol=="https") {
                return $this->getArrFromJSON($cameraStreamJSON,'data/0/rtmpPath').'/'.$this->getArrFromJSON($cameraStreamJSON,'data/0/streamName');
            } else {
                return $this->getArrFromJSON($cameraStreamJSON,'data/0/rtmpPath').'/'.$this->getArrFromJSON($cameraStreamJSON,'data/0/streamName');
            }   
        }
    }
    
    private function setUnifiVerson(){
        $systemInfo = $this->getArrFromJSON($this->bootstrapResponse,'data/0/systemInfo');
        $this->unifiVersion = $systemInfo['version'];
    }

    private function hasLowRes($JSON){
        $DecodedJSON = json_decode($JSON,TRUE);
        $currentArr = $DecodedJSON;
        if(isset($currentArr['data'][0]['rtmpPath']))
        {
            return true;
        }
        else
        {
            return false;
        }
    }


    private function getArrFromJSON($JSON, $WARR){
        $sArr = explode('/', $WARR);
        $DecodedJSON = json_decode($JSON,TRUE);
        $currentArr = $DecodedJSON;
        foreach ($sArr as $nArr) {
            if(isset($currentArr[$nArr]))
            {
                $currentArr = $currentArr[$nArr];
            }
            else
            {
                var_dump(array('$currentArr'=>$currentArr,'$JSON'=>$JSON, '$WARR'=>$WARR));
            }
        }
        return $currentArr;
    }
    
    private function streamJSON ($id, $res){
        return $this->callApi($this->buildCallApiUrl('stream/'.$id.'/'.$res.'/url'));
    }
    
    private function getCameras (){
        $this->camreaResponse = $this->callApi($this->buildCallApiUrl('camera'));
    }
    
    private function bootstrapJSON (){
        $this->bootstrapResponse = $this->callApi($this->buildCallApiUrl('bootstrap'));
    }
    
    private function buildCallApiUrl($call){
        $this->callUrl = $this->serverProtocol.'://'.$this->serverHost.':'.$this->serverPort.'/api/2.0/'.$call.'?apiKey='.$this->apiKey;
        return $this->serverProtocol.'://'.$this->serverHost.':'.$this->serverPort.'/api/2.0/'.$call.'?apiKey='.$this->apiKey;
    }

    private function callApi($url) {
        //  Initiate curl
        $ch = curl_init();
        // Disable SSL verification
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        // Will return the response, if false it print the response
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        // Set the url
        curl_setopt($ch, CURLOPT_URL,$url);
        // Execute
        $result=curl_exec($ch);
        // Closing
        curl_close($ch);
        return $result;
    }
    
    private function setServerPort($port) {
        if (!$port) {
            if ($this->serverProtocol=='https'){
                $this->serverPort = 7443; // By default if https 7443 if http 7080 unless otherwise changed
            } else {
                $this->serverPort = 7080;
            }
        } else {
            $this->serverPort = $port; // By default if https 7443 if http 7080 unless otherwise changed
        }
    }
}



class SwayzeTools {
    public function fixJSON($json) {
        return $json;
    }
}