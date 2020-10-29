<?php


$dir    = './';
$files = scandir($dir);

foreach($files as $key => $value){
	
	if($value === "." || $value === ".." || $value === "image_preview.php"){
		continue;
	}
	
	?>	
	<div style="float: left; margin: 10px; width: 140px; height: 140px">
		<span ><?= $value ?></span><br>
		<img src="<?= $value ?>" style="width: 128px; border: 1px solid black" />
	</div>
	<?php

}



?>