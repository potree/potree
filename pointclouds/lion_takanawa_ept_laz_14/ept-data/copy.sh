function translate {
    pdal translate "../../lion_takanawa_ept_laz/ept-data/$1" "$1" \
        --writers.las.forward=all \
        --writers.las.minor_version=4 \
        --writers.las.dataformat_id=7
}

translate "0-0-0-0.laz"
translate "1-0-0-1.laz"  
translate "1-0-1-1.laz"  
translate "1-1-0-1.laz"  
translate "2-0-1-1.laz"  
translate "2-0-2-1.laz"  
translate "2-1-1-1.laz"  
translate "2-1-2-1.laz"
translate "1-0-0-0.laz" 
translate "1-0-1-0.laz"  
translate "1-1-0-0.laz"  
translate "1-1-1-0.laz"  
translate "2-0-1-2.laz"  
translate "2-1-0-1.laz"  
translate "2-1-1-2.laz"
translate "2-1-3-1.laz"
