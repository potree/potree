<?php

// "{693550.968, 3915914.169},{693890.618, 3916387.819},{694584.820, 3916458.180},{694786.239, 3916307.199}"
// width14

// getPoints.php?min=693550.968;3915914.169&max=694584.820;3916458.180&minLevel=0&maxLevel=3

// getPoints.php?pc=../pointclouds/vol_total/cloud.js&min=693550.968;3915914.169&max=694584.820;3916458.180&minLevel=0&maxLevel=5

function toCoordinate($value){
	$coord = explode(';', $value);
	
	for($i = 0; $i < count($coord); $i++){
		$coord[$i] = (double)$coord[$i];
	}
	
	return $coord;
}

$min = toCoordinate($_GET['min']);
$max = toCoordinate($_GET['max']);
$minLevel = isset($_GET['minLevel']) ? (int)$_GET['minLevel'] : 0;
$maxLevel = isset($_GET['maxLevel']) ? (int)$_GET['maxLevel'] : 3;

$path = realpath($_GET['pc']);
$path = str_replace("\\", "/", $path);

//$path = "D:/dev/pointclouds/converted/CA13/cloud.js";
$outputFile = "./result.las";

$yc = ($min[1] + $max[1]) / 2.0;
$sizeY = $max[1] - $min[1];

$coordinates = "{".$min[0].",$yc},{".$max[0].",$yc}";
$width = ($max[1] - $min[1]) / 2.0;

$binary = "D:/dev/workspaces/CPotree/master/bin/Release_x64/PotreeElevationProfile.exe";

$command = "$binary " . escapeshellarg($path) . " "
	. "-o " . escapeshellarg($outputFile) . " "
	. "--estimate "
	. "--coordinates " . escapeshellarg($coordinates) . " "
	. "--width " . escapeshellarg($width) . " "
	. "--min-level " . escapeshellarg($minLevel) . " "
	. "--max-level " . escapeshellarg($maxLevel) . " ";
echo "$command <br/>";

$output = "";
exec($command, $output);

foreach($output as $line){
	echo "$line <br/>";
}

$path = realpath($_GET['pc']);
echo($path);

?>

