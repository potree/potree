
import * as THREE from "three";

// http://epsg.io/
proj4.defs([
	// Thailand
	[
	  'EPSG:24047',
	  '+proj=utm +zone=47 +ellps=evrst30 +towgs84=293,836,318,0.5,1.6,-2.8,2.1 +units=m +no_defs +type=crs',
	],
	['EPSG:32647', '+proj=utm +zone=47 +datum=WGS84 +units=m +no_defs +type=crs'],
  
	// hong kong
	[
	  'EPSG:2326',
	  '+proj=tmerc +lat_0=22.31213333333334 +lon_0=114.1785555555556 +k=1 +x_0=836694.05 +y_0=819069.8 +ellps=intl +towgs84=-162.619,-276.959,-161.764,0.067753,-2.24365,-1.15883,-1.09425 +units=m +no_defs',
	],
  
	// canada
	[
	  'EPSG:2952',
	  '+proj=tmerc +lat_0=0 +lon_0=-79.5 +k=0.9999 +x_0=304800 +y_0=0 +ellps=GRS80 +towgs84=-0.991,1.9072,0.5129,-1.25033e-07,-4.6785e-08,-5.6529e-08,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:2177',
	  '+proj=tmerc +lat_0=0 +lon_0=18 +k=0.999923 +x_0=6500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
	],
	[
	  'EPSG:2180',
	  '+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
	],
	[
	  'EPSG:2932',
	  '+proj=tmerc +lat_0=24.45 +lon_0=51.21666666666667 +k=0.99999 +x_0=200000 +y_0=300000 +ellps=intl +towgs84=-119.425,-303.659,-11.0006,1.1643,0.174458,1.09626,3.65706 +units=m +no_defs',
	],
	[
	  'EPSG:3414',
	  '+proj=tmerc +lat_0=1.366666666666667 +lon_0=103.8333333333333 +k=1 +x_0=28001.642 +y_0=38744.572 +ellps=WGS84 +units=m +no_defs',
	],
	[
	  'EPSG:5255',
	  '+proj=tmerc +lat_0=0 +lon_0=33 +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	['EPSG:4917', '+proj=geocent +ellps=GRS80 +units=m +no_defs +type=crs'],
	['EPSG:4918', '+proj=geocent +ellps=GRS80 +units=m +no_defs +type=crs'],
	['EPSG:4919', '+proj=geocent +ellps=GRS80 +units=m +no_defs +type=crs'],
	['EPSG:4896', '+proj=geocent +ellps=GRS80 +units=m +no_defs +type=crs'],
	['EPSG:5332', '+proj=geocent +ellps=GRS80 +units=m +no_defs +type=crs'],
	['EPSG:7789', '+proj=geocent +ellps=GRS80 +units=m +no_defs +type=crs'],
	['EPSG:9988', '+proj=geocent +ellps=GRS80 +units=m +no_defs +type=crs'],
	['EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs'],
	// indonesia
	[
	  'EPSG:2310',
	  '+proj=tmerc +lat_0=0 +lon_0=132 +k=0.9996 +x_0=500000 +y_0=10000000 +datum=WGS84 +units=m +no_defs +type=crs',
	],
	['EPSG:9489', '+proj=utm +zone=49 +south +ellps=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:9988', '+proj=geocent +ellps=GRS80 +units=m +no_defs +type=crs'],
	['EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs'],
	[
	  'EPSG:23879',
	  '+proj=utm +zone=49 +south +ellps=WGS84 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	['EPSG:32749', '+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32754', '+proj=utm +zone=54 +south +datum=WGS84 +units=m +no_defs +type=crs'],
  
	//
	[
	  'EPSG:5173',
	  '+proj=tmerc +lat_0=38 +lon_0=125.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43',
	],
	[
	  'EPSG:5174',
	  '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43',
	],
	[
	  'EPSG:5175',
	  '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=550000 +ellps=bessel +units=m +no_defs  +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43',
	],
	[
	  'EPSG:5176',
	  '+proj=tmerc +lat_0=38 +lon_0=129.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43',
	],
	[
	  'EPSG:5177',
	  '+proj=tmerc +lat_0=38 +lon_0=131.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs  +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43',
	],
	[
	  'EPSG:5182',
	  '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=550000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
	],
	[
	  'EPSG:5185',
	  '+proj=tmerc +lat_0=38 +lon_0=125 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
	],
	[
	  'EPSG:5186',
	  '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
	],
	[
	  'EPSG:5187',
	  '+proj=tmerc +lat_0=38 +lon_0=129 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
	],
	[
	  'EPSG:5188',
	  '+proj=tmerc +lat_0=38 +lon_0=131 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
	],
	['EPSG:5387', '+proj=utm +zone=18 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'],
  
	['EPSG:32650', '+proj=utm +zone=50 +datum=WGS84 +units=m +no_defs'],
	['EPSG:32651', '+proj=utm +zone=51 +datum=WGS84 +units=m +no_defs'],
	['EPSG:32652', '+proj=utm +zone=52 +datum=WGS84 +units=m +no_defs'],
	['EPSG:32653', '+proj=utm +zone=53 +datum=WGS84 +units=m +no_defs'],
	['EPSG:32654', '+proj=utm +zone=54 +datum=WGS84 +units=m +no_defs'],
	['EPSG:32655', '+proj=utm +zone=55 +datum=WGS84 +units=m +no_defs'],
  
	[
	  'EPSG:23700',
	  '+proj=somerc +lat_0=47.1443937222222 +lon_0=19.0485717777778 +k_0=0.99993 +x_0=650000 +y_0=200000 +ellps=GRS67 +towgs84=52.684,-71.194,-13.975,-0.312,-0.1063,-0.3729,1.0191 +units=m +no_defs',
	],
	['EPSG:32643', '+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32644', '+proj=utm +zone=44 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32646', '+proj=utm +zone=46 +datum=WGS84 +units=m +no_defs'],
  
	// KSA
	[
	  'EPSG:2318',
	  '+proj=lcc +lat_0=25.08951 +lon_0=48 +lat_1=17 +lat_2=33 +x_0=0 +y_0=0 +ellps=intl +towgs84=-143,-236,7,0,0,0,0 +units=m +no_defs +type=crs',
	],
	['EPSG:32636', '+proj=utm +zone=36 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32637', '+proj=utm +zone=37 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32638', '+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32639', '+proj=utm +zone=39 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32640', '+proj=utm +zone=40 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32641', '+proj=utm +zone=41 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32642', '+proj=utm +zone=42 +datum=WGS84 +units=m +no_defs +type=crs'],
	[
	  'EPSG:20436',
	  '+proj=utm +zone=36 +ellps=intl +towgs84=-143,-236,7,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:20437',
	  '+proj=utm +zone=37 +ellps=intl +towgs84=-143,-236,7,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:20438',
	  '+proj=utm +zone=38 +ellps=intl +towgs84=-143,-236,7,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:20439',
	  '+proj=utm +zone=39 +ellps=intl +towgs84=-143,-236,7,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:20440',
	  '+proj=utm +zone=40 +ellps=intl +towgs84=-143,-236,7,0,0,0,0 +units=m +no_defs +type=crs',
	],
  
	[
	  'EPSG:8836',
	  '+proj=utm +zone=36 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:8837',
	  '+proj=utm +zone=37 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:8837',
	  '+proj=utm +zone=37 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:8839',
	  '+proj=utm +zone=39 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:8840',
	  '+proj=utm +zone=40 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
  
	// WSG84 UTM
	['EPSG:32601', '+proj=utm +zone=1 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32602', '+proj=utm +zone=2 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32603', '+proj=utm +zone=3 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32604', '+proj=utm +zone=4 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32605', '+proj=utm +zone=5 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32606', '+proj=utm +zone=6 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32607', '+proj=utm +zone=7 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32608', '+proj=utm +zone=8 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32609', '+proj=utm +zone=9 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32610', '+proj=utm +zone=10 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32611', '+proj=utm +zone=11 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32612', '+proj=utm +zone=12 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32613', '+proj=utm +zone=13 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32614', '+proj=utm +zone=14 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32615', '+proj=utm +zone=15 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32616', '+proj=utm +zone=16 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32617', '+proj=utm +zone=17 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32618', '+proj=utm +zone=18 +datum=WGS84 +units=m +no_defs +type=crs'],
	['EPSG:32619', '+proj=utm +zone=19 +datum=WGS84 +units=m +no_defs +type=crs'],
  
	// NAD83(2011)
	[
	  'EPSG:6355',
	  '+proj=tmerc +lat_0=30.5 +lon_0=-85.8333333333333 +k=0.99996 +x_0=200000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:9748',
	  '+proj=tmerc +lat_0=30.5 +lon_0=-85.8333333333333 +k=0.99996 +x_0=200000.0001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6356',
	  '+proj=tmerc +lat_0=30 +lon_0=-87.5 +k=0.999933333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:9749',
	  '+proj=tmerc +lat_0=30 +lon_0=-87.5 +k=0.999933333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6403',
	  '+proj=lcc +lat_0=51 +lon_0=-176 +lat_1=53.8333333333333 +lat_2=51.8333333333333 +x_0=1000000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6395',
	  '+proj=tmerc +lat_0=54 +lon_0=-142 +k=0.9999 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6396',
	  '+proj=tmerc +lat_0=54 +lon_0=-146 +k=0.9999 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6397',
	  '+proj=tmerc +lat_0=54 +lon_0=-150 +k=0.9999 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6398',
	  '+proj=tmerc +lat_0=54 +lon_0=-154 +k=0.9999 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6399',
	  '+proj=tmerc +lat_0=54 +lon_0=-158 +k=0.9999 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6400',
	  '+proj=tmerc +lat_0=54 +lon_0=-162 +k=0.9999 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6401',
	  '+proj=tmerc +lat_0=54 +lon_0=-166 +k=0.9999 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6402',
	  '+proj=tmerc +lat_0=54 +lon_0=-170 +k=0.9999 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6404',
	  '+proj=tmerc +lat_0=31 +lon_0=-111.916666666667 +k=0.9999 +x_0=213360 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6405',
	  '+proj=tmerc +lat_0=31 +lon_0=-111.916666666667 +k=0.9999 +x_0=213360 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=ft +no_defs +type=crs',
	],
	[
	  'EPSG:6406',
	  '+proj=tmerc +lat_0=31 +lon_0=-110.166666666667 +k=0.9999 +x_0=213360 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6407',
	  '+proj=tmerc +lat_0=31 +lon_0=-110.166666666667 +k=0.9999 +x_0=213360 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=ft +no_defs +type=crs',
	],
	[
	  'EPSG:6408',
	  '+proj=tmerc +lat_0=31 +lon_0=-113.75 +k=0.999933333 +x_0=213360 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6409',
	  '+proj=tmerc +lat_0=31 +lon_0=-113.75 +k=0.999933333 +x_0=213360 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=ft +no_defs +type=crs',
	],
	[
	  'EPSG:6410',
	  '+proj=lcc +lat_0=34.3333333333333 +lon_0=-92 +lat_1=36.2333333333333 +lat_2=34.9333333333333 +x_0=400000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6411',
	  '+proj=lcc +lat_0=34.3333333333333 +lon_0=-92 +lat_1=36.2333333333333 +lat_2=34.9333333333333 +x_0=399999.99998984 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6412',
	  '+proj=lcc +lat_0=32.6666666666667 +lon_0=-92 +lat_1=34.7666666666667 +lat_2=33.3 +x_0=400000 +y_0=400000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6413',
	  '+proj=lcc +lat_0=32.6666666666667 +lon_0=-92 +lat_1=34.7666666666667 +lat_2=33.3 +x_0=399999.99998984 +y_0=399999.99998984 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6415',
	  '+proj=lcc +lat_0=39.3333333333333 +lon_0=-122 +lat_1=41.6666666666667 +lat_2=40 +x_0=2000000 +y_0=500000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6416',
	  '+proj=lcc +lat_0=39.3333333333333 +lon_0=-122 +lat_1=41.6666666666667 +lat_2=40 +x_0=2000000.0001016 +y_0=500000.0001016 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6417',
	  '+proj=lcc +lat_0=37.6666666666667 +lon_0=-122 +lat_1=39.8333333333333 +lat_2=38.3333333333333 +x_0=2000000 +y_0=500000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6418',
	  '+proj=lcc +lat_0=37.6666666666667 +lon_0=-122 +lat_1=39.8333333333333 +lat_2=38.3333333333333 +x_0=2000000.0001016 +y_0=500000.0001016 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6419',
	  '+proj=lcc +lat_0=36.5 +lon_0=-120.5 +lat_1=38.4333333333333 +lat_2=37.0666666666667 +x_0=2000000 +y_0=500000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6420',
	  '+proj=lcc +lat_0=36.5 +lon_0=-120.5 +lat_1=38.4333333333333 +lat_2=37.0666666666667 +x_0=2000000.0001016 +y_0=500000.0001016 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6421',
	  '+proj=lcc +lat_0=35.3333333333333 +lon_0=-119 +lat_1=37.25 +lat_2=36 +x_0=2000000 +y_0=500000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6422',
	  '+proj=lcc +lat_0=35.3333333333333 +lon_0=-119 +lat_1=37.25 +lat_2=36 +x_0=2000000.0001016 +y_0=500000.0001016 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6423',
	  '+proj=lcc +lat_0=33.5 +lon_0=-118 +lat_1=35.4666666666667 +lat_2=34.0333333333333 +x_0=2000000 +y_0=500000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6424',
	  '+proj=lcc +lat_0=33.5 +lon_0=-118 +lat_1=35.4666666666667 +lat_2=34.0333333333333 +x_0=2000000.0001016 +y_0=500000.0001016 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6425',
	  '+proj=lcc +lat_0=32.1666666666667 +lon_0=-116.25 +lat_1=33.8833333333333 +lat_2=32.7833333333333 +x_0=2000000 +y_0=500000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6426',
	  '+proj=lcc +lat_0=32.1666666666667 +lon_0=-116.25 +lat_1=33.8833333333333 +lat_2=32.7833333333333 +x_0=2000000.0001016 +y_0=500000.0001016 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6427',
	  '+proj=lcc +lat_0=37.8333333333333 +lon_0=-105.5 +lat_1=39.75 +lat_2=38.45 +x_0=914401.8289 +y_0=304800.6096 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6428',
	  '+proj=lcc +lat_0=37.8333333333333 +lon_0=-105.5 +lat_1=39.75 +lat_2=38.45 +x_0=914401.828803657 +y_0=304800.609601219 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6429',
	  '+proj=lcc +lat_0=39.3333333333333 +lon_0=-105.5 +lat_1=40.7833333333333 +lat_2=39.7166666666667 +x_0=914401.8289 +y_0=304800.6096 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6430',
	  '+proj=lcc +lat_0=39.3333333333333 +lon_0=-105.5 +lat_1=40.7833333333333 +lat_2=39.7166666666667 +x_0=914401.828803657 +y_0=304800.609601219 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6431',
	  '+proj=lcc +lat_0=36.6666666666667 +lon_0=-105.5 +lat_1=38.4333333333333 +lat_2=37.2333333333333 +x_0=914401.8289 +y_0=304800.6096 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6432',
	  '+proj=lcc +lat_0=36.6666666666667 +lon_0=-105.5 +lat_1=38.4333333333333 +lat_2=37.2333333333333 +x_0=914401.828803657 +y_0=304800.609601219 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6433',
	  '+proj=lcc +lat_0=40.8333333333333 +lon_0=-72.75 +lat_1=41.8666666666667 +lat_2=41.2 +x_0=304800.6096 +y_0=152400.3048 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6434',
	  '+proj=lcc +lat_0=40.8333333333333 +lon_0=-72.75 +lat_1=41.8666666666667 +lat_2=41.2 +x_0=304800.609601219 +y_0=152400.30480061 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6435',
	  '+proj=tmerc +lat_0=38 +lon_0=-75.4166666666667 +k=0.999995 +x_0=200000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6436',
	  '+proj=tmerc +lat_0=38 +lon_0=-75.4166666666667 +k=0.999995 +x_0=200000.0001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6437',
	  '+proj=tmerc +lat_0=24.3333333333333 +lon_0=-81 +k=0.999941177 +x_0=200000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6438',
	  '+proj=tmerc +lat_0=24.3333333333333 +lon_0=-81 +k=0.999941177 +x_0=200000.0001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6440',
	  '+proj=lcc +lat_0=29 +lon_0=-84.5 +lat_1=30.75 +lat_2=29.5833333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6441',
	  '+proj=lcc +lat_0=29 +lon_0=-84.5 +lat_1=30.75 +lat_2=29.5833333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6442',
	  '+proj=tmerc +lat_0=24.3333333333333 +lon_0=-82 +k=0.999941177 +x_0=200000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6443',
	  '+proj=tmerc +lat_0=24.3333333333333 +lon_0=-82 +k=0.999941177 +x_0=200000.0001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6444',
	  '+proj=tmerc +lat_0=30 +lon_0=-82.1666666666667 +k=0.9999 +x_0=200000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6445',
	  '+proj=tmerc +lat_0=30 +lon_0=-82.1666666666667 +k=0.9999 +x_0=200000.0001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6446',
	  '+proj=tmerc +lat_0=30 +lon_0=-84.1666666666667 +k=0.9999 +x_0=700000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6447',
	  '+proj=tmerc +lat_0=30 +lon_0=-84.1666666666667 +k=0.9999 +x_0=699999.999898399 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6448',
	  '+proj=tmerc +lat_0=41.6666666666667 +lon_0=-114 +k=0.999947368 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6449',
	  '+proj=tmerc +lat_0=41.6666666666667 +lon_0=-114 +k=0.999947368 +x_0=500000.0001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6450',
	  '+proj=tmerc +lat_0=41.6666666666667 +lon_0=-112.166666666667 +k=0.999947368 +x_0=200000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6451',
	  '+proj=tmerc +lat_0=41.6666666666667 +lon_0=-112.166666666667 +k=0.999947368 +x_0=200000.0001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6452',
	  '+proj=tmerc +lat_0=41.6666666666667 +lon_0=-115.75 +k=0.999933333 +x_0=800000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6453',
	  '+proj=tmerc +lat_0=41.6666666666667 +lon_0=-115.75 +k=0.999933333 +x_0=800000.0001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6454',
	  '+proj=tmerc +lat_0=36.6666666666667 +lon_0=-88.3333333333333 +k=0.999975 +x_0=300000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6455',
	  '+proj=tmerc +lat_0=36.6666666666667 +lon_0=-88.3333333333333 +k=0.999975 +x_0=300000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6456',
	  '+proj=tmerc +lat_0=36.6666666666667 +lon_0=-90.1666666666667 +k=0.999941177 +x_0=700000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6457',
	  '+proj=tmerc +lat_0=36.6666666666667 +lon_0=-90.1666666666667 +k=0.999941177 +x_0=699999.99998984 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6458',
	  '+proj=tmerc +lat_0=37.5 +lon_0=-85.6666666666667 +k=0.999966667 +x_0=100000 +y_0=250000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6459',
	  '+proj=tmerc +lat_0=37.5 +lon_0=-85.6666666666667 +k=0.999966667 +x_0=99999.9998983997 +y_0=249999.9998984 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6460',
	  '+proj=tmerc +lat_0=37.5 +lon_0=-87.0833333333333 +k=0.999966667 +x_0=900000 +y_0=250000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6461',
	  '+proj=tmerc +lat_0=37.5 +lon_0=-87.0833333333333 +k=0.999966667 +x_0=900000 +y_0=249999.9998984 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6462',
	  '+proj=lcc +lat_0=41.5 +lon_0=-93.5 +lat_1=43.2666666666667 +lat_2=42.0666666666667 +x_0=1500000 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6463',
	  '+proj=lcc +lat_0=41.5 +lon_0=-93.5 +lat_1=43.2666666666667 +lat_2=42.0666666666667 +x_0=1500000 +y_0=999999.999989839 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6464',
	  '+proj=lcc +lat_0=40 +lon_0=-93.5 +lat_1=41.7833333333333 +lat_2=40.6166666666667 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6465',
	  '+proj=lcc +lat_0=40 +lon_0=-93.5 +lat_1=41.7833333333333 +lat_2=40.6166666666667 +x_0=500000.00001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6466',
	  '+proj=lcc +lat_0=38.3333333333333 +lon_0=-98 +lat_1=39.7833333333333 +lat_2=38.7166666666667 +x_0=400000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6467',
	  '+proj=lcc +lat_0=38.3333333333333 +lon_0=-98 +lat_1=39.7833333333333 +lat_2=38.7166666666667 +x_0=399999.99998984 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6468',
	  '+proj=lcc +lat_0=36.6666666666667 +lon_0=-98.5 +lat_1=38.5666666666667 +lat_2=37.2666666666667 +x_0=400000 +y_0=400000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6469',
	  '+proj=lcc +lat_0=36.6666666666667 +lon_0=-98.5 +lat_1=38.5666666666667 +lat_2=37.2666666666667 +x_0=399999.99998984 +y_0=399999.99998984 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6470',
	  '+proj=lcc +lat_0=37.5 +lon_0=-84.25 +lat_1=37.9666666666667 +lat_2=38.9666666666667 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6471',
	  '+proj=lcc +lat_0=37.5 +lon_0=-84.25 +lat_1=37.9666666666667 +lat_2=38.9666666666667 +x_0=500000.0001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6472',
	  '+proj=lcc +lat_0=36.3333333333333 +lon_0=-85.75 +lat_1=37.0833333333333 +lat_2=38.6666666666667 +x_0=1500000 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6473',
	  '+proj=lcc +lat_0=36.3333333333333 +lon_0=-85.75 +lat_1=37.0833333333333 +lat_2=38.6666666666667 +x_0=1500000 +y_0=999999.999898399 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6474',
	  '+proj=lcc +lat_0=36.3333333333333 +lon_0=-85.75 +lat_1=37.9333333333333 +lat_2=36.7333333333333 +x_0=500000 +y_0=500000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6475',
	  '+proj=lcc +lat_0=36.3333333333333 +lon_0=-85.75 +lat_1=37.9333333333333 +lat_2=36.7333333333333 +x_0=500000.0001016 +y_0=500000.0001016 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6476',
	  '+proj=lcc +lat_0=30.5 +lon_0=-92.5 +lat_1=32.6666666666667 +lat_2=31.1666666666667 +x_0=1000000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6477',
	  '+proj=lcc +lat_0=30.5 +lon_0=-92.5 +lat_1=32.6666666666667 +lat_2=31.1666666666667 +x_0=999999.999989839 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6478',
	  '+proj=lcc +lat_0=28.5 +lon_0=-91.3333333333333 +lat_1=30.7 +lat_2=29.3 +x_0=1000000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6479',
	  '+proj=lcc +lat_0=28.5 +lon_0=-91.3333333333333 +lat_1=30.7 +lat_2=29.3 +x_0=999999.999989839 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6483',
	  '+proj=tmerc +lat_0=43.6666666666667 +lon_0=-68.5 +k=0.9999 +x_0=300000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6484',
	  '+proj=tmerc +lat_0=43.6666666666667 +lon_0=-68.5 +k=0.9999 +x_0=300000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6485',
	  '+proj=tmerc +lat_0=42.8333333333333 +lon_0=-70.1666666666667 +k=0.999966667 +x_0=900000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6486',
	  '+proj=tmerc +lat_0=42.8333333333333 +lon_0=-70.1666666666667 +k=0.999966667 +x_0=900000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6487',
	  '+proj=lcc +lat_0=37.6666666666667 +lon_0=-77 +lat_1=39.45 +lat_2=38.3 +x_0=400000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6488',
	  '+proj=lcc +lat_0=37.6666666666667 +lon_0=-77 +lat_1=39.45 +lat_2=38.3 +x_0=399999.9998984 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6489',
	  '+proj=lcc +lat_0=41 +lon_0=-70.5 +lat_1=41.4833333333333 +lat_2=41.2833333333333 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6490',
	  '+proj=lcc +lat_0=41 +lon_0=-70.5 +lat_1=41.4833333333333 +lat_2=41.2833333333333 +x_0=500000.0001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6491',
	  '+proj=lcc +lat_0=41 +lon_0=-71.5 +lat_1=42.6833333333333 +lat_2=41.7166666666667 +x_0=200000 +y_0=750000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6492',
	  '+proj=lcc +lat_0=41 +lon_0=-71.5 +lat_1=42.6833333333333 +lat_2=41.7166666666667 +x_0=200000.0001016 +y_0=750000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6493',
	  '+proj=lcc +lat_0=43.3166666666667 +lon_0=-84.3666666666667 +lat_1=45.7 +lat_2=44.1833333333333 +x_0=6000000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6494',
	  '+proj=lcc +lat_0=43.3166666666667 +lon_0=-84.3666666666667 +lat_1=45.7 +lat_2=44.1833333333333 +x_0=5999999.999976 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=ft +no_defs +type=crs',
	],
	[
	  'EPSG:6495',
	  '+proj=lcc +lat_0=44.7833333333333 +lon_0=-87 +lat_1=47.0833333333333 +lat_2=45.4833333333333 +x_0=8000000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6496',
	  '+proj=lcc +lat_0=44.7833333333333 +lon_0=-87 +lat_1=47.0833333333333 +lat_2=45.4833333333333 +x_0=7999999.999968 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=ft +no_defs +type=crs',
	],
	[
	  'EPSG:6498',
	  '+proj=lcc +lat_0=41.5 +lon_0=-84.3666666666667 +lat_1=43.6666666666667 +lat_2=42.1 +x_0=4000000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6499',
	  '+proj=lcc +lat_0=41.5 +lon_0=-84.3666666666667 +lat_1=43.6666666666667 +lat_2=42.1 +x_0=3999999.999984 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=ft +no_defs +type=crs',
	],
	[
	  'EPSG:6500',
	  '+proj=lcc +lat_0=45 +lon_0=-94.25 +lat_1=47.05 +lat_2=45.6166666666667 +x_0=800000 +y_0=100000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6501',
	  '+proj=lcc +lat_0=45 +lon_0=-94.25 +lat_1=47.05 +lat_2=45.6166666666667 +x_0=800000.00001016 +y_0=99999.9999898399 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6502',
	  '+proj=lcc +lat_0=46.5 +lon_0=-93.1 +lat_1=48.6333333333333 +lat_2=47.0333333333333 +x_0=800000 +y_0=100000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6503',
	  '+proj=lcc +lat_0=46.5 +lon_0=-93.1 +lat_1=48.6333333333333 +lat_2=47.0333333333333 +x_0=800000.00001016 +y_0=99999.9999898399 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6504',
	  '+proj=lcc +lat_0=43 +lon_0=-94 +lat_1=45.2166666666667 +lat_2=43.7833333333333 +x_0=800000 +y_0=100000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6505',
	  '+proj=lcc +lat_0=43 +lon_0=-94 +lat_1=45.2166666666667 +lat_2=43.7833333333333 +x_0=800000.00001016 +y_0=99999.9999898399 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6506',
	  '+proj=tmerc +lat_0=29.5 +lon_0=-88.8333333333333 +k=0.99995 +x_0=300000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6507',
	  '+proj=tmerc +lat_0=29.5 +lon_0=-88.8333333333333 +k=0.99995 +x_0=300000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6509',
	  '+proj=tmerc +lat_0=29.5 +lon_0=-90.3333333333333 +k=0.99995 +x_0=700000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6510',
	  '+proj=tmerc +lat_0=29.5 +lon_0=-90.3333333333333 +k=0.99995 +x_0=699999.999898399 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6511',
	  '+proj=tmerc +lat_0=35.8333333333333 +lon_0=-92.5 +k=0.999933333 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6512',
	  '+proj=tmerc +lat_0=35.8333333333333 +lon_0=-90.5 +k=0.999933333 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6513',
	  '+proj=tmerc +lat_0=36.1666666666667 +lon_0=-94.5 +k=0.999941177 +x_0=850000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6514',
	  '+proj=lcc +lat_0=44.25 +lon_0=-109.5 +lat_1=49 +lat_2=45 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6515',
	  '+proj=lcc +lat_0=44.25 +lon_0=-109.5 +lat_1=49 +lat_2=45 +x_0=599999.9999976 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=ft +no_defs +type=crs',
	],
	[
	  'EPSG:6516',
	  '+proj=lcc +lat_0=39.8333333333333 +lon_0=-100 +lat_1=43 +lat_2=40 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6880',
	  '+proj=lcc +lat_0=39.8333333333333 +lon_0=-100 +lat_1=43 +lat_2=40 +x_0=500000.00001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6518',
	  '+proj=tmerc +lat_0=34.75 +lon_0=-116.666666666667 +k=0.9999 +x_0=500000 +y_0=6000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6519',
	  '+proj=tmerc +lat_0=34.75 +lon_0=-116.666666666667 +k=0.9999 +x_0=500000.00001016 +y_0=6000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6520',
	  '+proj=tmerc +lat_0=34.75 +lon_0=-115.583333333333 +k=0.9999 +x_0=200000 +y_0=8000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6521',
	  '+proj=tmerc +lat_0=34.75 +lon_0=-115.583333333333 +k=0.9999 +x_0=200000.00001016 +y_0=8000000.00001016 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6522',
	  '+proj=tmerc +lat_0=34.75 +lon_0=-118.583333333333 +k=0.9999 +x_0=800000 +y_0=4000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6523',
	  '+proj=tmerc +lat_0=34.75 +lon_0=-118.583333333333 +k=0.9999 +x_0=800000.00001016 +y_0=3999999.99998984 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6524',
	  '+proj=tmerc +lat_0=42.5 +lon_0=-71.6666666666667 +k=0.999966667 +x_0=300000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6525',
	  '+proj=tmerc +lat_0=42.5 +lon_0=-71.6666666666667 +k=0.999966667 +x_0=300000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6526',
	  '+proj=tmerc +lat_0=38.8333333333333 +lon_0=-74.5 +k=0.9999 +x_0=150000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6527',
	  '+proj=tmerc +lat_0=38.8333333333333 +lon_0=-74.5 +k=0.9999 +x_0=150000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6528',
	  '+proj=tmerc +lat_0=31 +lon_0=-106.25 +k=0.9999 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6529',
	  '+proj=tmerc +lat_0=31 +lon_0=-106.25 +k=0.9999 +x_0=500000.0001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6530',
	  '+proj=tmerc +lat_0=31 +lon_0=-104.333333333333 +k=0.999909091 +x_0=165000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6531',
	  '+proj=tmerc +lat_0=31 +lon_0=-104.333333333333 +k=0.999909091 +x_0=165000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6532',
	  '+proj=tmerc +lat_0=31 +lon_0=-107.833333333333 +k=0.999916667 +x_0=830000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6533',
	  '+proj=tmerc +lat_0=31 +lon_0=-107.833333333333 +k=0.999916667 +x_0=830000.0001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6534',
	  '+proj=tmerc +lat_0=40 +lon_0=-76.5833333333333 +k=0.9999375 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6535',
	  '+proj=tmerc +lat_0=40 +lon_0=-76.5833333333333 +k=0.9999375 +x_0=249999.9998984 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6536',
	  '+proj=tmerc +lat_0=38.8333333333333 +lon_0=-74.5 +k=0.9999 +x_0=150000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6537',
	  '+proj=tmerc +lat_0=38.8333333333333 +lon_0=-74.5 +k=0.9999 +x_0=150000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6538',
	  '+proj=lcc +lat_0=40.1666666666667 +lon_0=-74 +lat_1=41.0333333333333 +lat_2=40.6666666666667 +x_0=300000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6539',
	  '+proj=lcc +lat_0=40.1666666666667 +lon_0=-74 +lat_1=41.0333333333333 +lat_2=40.6666666666667 +x_0=300000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6540',
	  '+proj=tmerc +lat_0=40 +lon_0=-78.5833333333333 +k=0.9999375 +x_0=350000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6541',
	  '+proj=tmerc +lat_0=40 +lon_0=-78.5833333333333 +k=0.9999375 +x_0=350000.0001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6542',
	  '+proj=lcc +lat_0=33.75 +lon_0=-79 +lat_1=36.1666666666667 +lat_2=34.3333333333333 +x_0=609601.22 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6543',
	  '+proj=lcc +lat_0=33.75 +lon_0=-79 +lat_1=36.1666666666667 +lat_2=34.3333333333333 +x_0=609601.219202438 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6544',
	  '+proj=lcc +lat_0=47 +lon_0=-100.5 +lat_1=48.7333333333333 +lat_2=47.4333333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6545',
	  '+proj=lcc +lat_0=47 +lon_0=-100.5 +lat_1=48.7333333333333 +lat_2=47.4333333333333 +x_0=599999.9999976 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=ft +no_defs +type=crs',
	],
	[
	  'EPSG:6546',
	  '+proj=lcc +lat_0=45.6666666666667 +lon_0=-100.5 +lat_1=47.4833333333333 +lat_2=46.1833333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6547',
	  '+proj=lcc +lat_0=45.6666666666667 +lon_0=-100.5 +lat_1=47.4833333333333 +lat_2=46.1833333333333 +x_0=599999.9999976 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=ft +no_defs +type=crs',
	],
	[
	  'EPSG:6548',
	  '+proj=lcc +lat_0=39.6666666666667 +lon_0=-82.5 +lat_1=41.7 +lat_2=40.4333333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6549',
	  '+proj=lcc +lat_0=39.6666666666667 +lon_0=-82.5 +lat_1=41.7 +lat_2=40.4333333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6550',
	  '+proj=lcc +lat_0=38 +lon_0=-82.5 +lat_1=40.0333333333333 +lat_2=38.7333333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6551',
	  '+proj=lcc +lat_0=38 +lon_0=-82.5 +lat_1=40.0333333333333 +lat_2=38.7333333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6552',
	  '+proj=lcc +lat_0=35 +lon_0=-98 +lat_1=36.7666666666667 +lat_2=35.5666666666667 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6553',
	  '+proj=lcc +lat_0=35 +lon_0=-98 +lat_1=36.7666666666667 +lat_2=35.5666666666667 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6554',
	  '+proj=lcc +lat_0=33.3333333333333 +lon_0=-98 +lat_1=35.2333333333333 +lat_2=33.9333333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6555',
	  '+proj=lcc +lat_0=33.3333333333333 +lon_0=-98 +lat_1=35.2333333333333 +lat_2=33.9333333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6558',
	  '+proj=lcc +lat_0=43.6666666666667 +lon_0=-120.5 +lat_1=46 +lat_2=44.3333333333333 +x_0=2500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6559',
	  '+proj=lcc +lat_0=43.6666666666667 +lon_0=-120.5 +lat_1=46 +lat_2=44.3333333333333 +x_0=2500000.0001424 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=ft +no_defs +type=crs',
	],
	[
	  'EPSG:6560',
	  '+proj=lcc +lat_0=41.6666666666667 +lon_0=-120.5 +lat_1=44 +lat_2=42.3333333333333 +x_0=1500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6561',
	  '+proj=lcc +lat_0=41.6666666666667 +lon_0=-120.5 +lat_1=44 +lat_2=42.3333333333333 +x_0=1500000.0001464 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=ft +no_defs +type=crs',
	],
	[
	  'EPSG:6562',
	  '+proj=lcc +lat_0=40.1666666666667 +lon_0=-77.75 +lat_1=41.95 +lat_2=40.8833333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6563',
	  '+proj=lcc +lat_0=40.1666666666667 +lon_0=-77.75 +lat_1=41.95 +lat_2=40.8833333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6564',
	  '+proj=lcc +lat_0=39.3333333333333 +lon_0=-77.75 +lat_1=40.9666666666667 +lat_2=39.9333333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6565',
	  '+proj=lcc +lat_0=39.3333333333333 +lon_0=-77.75 +lat_1=40.9666666666667 +lat_2=39.9333333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6567',
	  '+proj=tmerc +lat_0=41.0833333333333 +lon_0=-71.5 +k=0.99999375 +x_0=100000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6568',
	  '+proj=tmerc +lat_0=41.0833333333333 +lon_0=-71.5 +k=0.99999375 +x_0=99999.9999898399 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6569',
	  '+proj=lcc +lat_0=31.8333333333333 +lon_0=-81 +lat_1=34.8333333333333 +lat_2=32.5 +x_0=609600 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6570',
	  '+proj=lcc +lat_0=31.8333333333333 +lon_0=-81 +lat_1=34.8333333333333 +lat_2=32.5 +x_0=609600 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=ft +no_defs +type=crs',
	],
	[
	  'EPSG:6571',
	  '+proj=lcc +lat_0=43.8333333333333 +lon_0=-100 +lat_1=45.6833333333333 +lat_2=44.4166666666667 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6572',
	  '+proj=lcc +lat_0=43.8333333333333 +lon_0=-100 +lat_1=45.6833333333333 +lat_2=44.4166666666667 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6573',
	  '+proj=lcc +lat_0=42.3333333333333 +lon_0=-100.333333333333 +lat_1=44.4 +lat_2=42.8333333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6574',
	  '+proj=lcc +lat_0=42.3333333333333 +lon_0=-100.333333333333 +lat_1=44.4 +lat_2=42.8333333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6575',
	  '+proj=lcc +lat_0=34.3333333333333 +lon_0=-86 +lat_1=36.4166666666667 +lat_2=35.25 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6576',
	  '+proj=lcc +lat_0=34.3333333333333 +lon_0=-86 +lat_1=36.4166666666667 +lat_2=35.25 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6577',
	  '+proj=lcc +lat_0=29.6666666666667 +lon_0=-100.333333333333 +lat_1=31.8833333333333 +lat_2=30.1166666666667 +x_0=700000 +y_0=3000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6578',
	  '+proj=lcc +lat_0=29.6666666666667 +lon_0=-100.333333333333 +lat_1=31.8833333333333 +lat_2=30.1166666666667 +x_0=699999.999898399 +y_0=3000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6581',
	  '+proj=lcc +lat_0=34 +lon_0=-101.5 +lat_1=36.1833333333333 +lat_2=34.65 +x_0=200000 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6582',
	  '+proj=lcc +lat_0=34 +lon_0=-101.5 +lat_1=36.1833333333333 +lat_2=34.65 +x_0=200000.0001016 +y_0=999999.999898399 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6583',
	  '+proj=lcc +lat_0=31.6666666666667 +lon_0=-98.5 +lat_1=33.9666666666667 +lat_2=32.1333333333333 +x_0=600000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6584',
	  '+proj=lcc +lat_0=31.6666666666667 +lon_0=-98.5 +lat_1=33.9666666666667 +lat_2=32.1333333333333 +x_0=600000 +y_0=2000000.0001016 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6585',
	  '+proj=lcc +lat_0=25.6666666666667 +lon_0=-98.5 +lat_1=27.8333333333333 +lat_2=26.1666666666667 +x_0=300000 +y_0=5000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6586',
	  '+proj=lcc +lat_0=25.6666666666667 +lon_0=-98.5 +lat_1=27.8333333333333 +lat_2=26.1666666666667 +x_0=300000 +y_0=5000000.0001016 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6587',
	  '+proj=lcc +lat_0=27.8333333333333 +lon_0=-99 +lat_1=30.2833333333333 +lat_2=28.3833333333333 +x_0=600000 +y_0=4000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6588',
	  '+proj=lcc +lat_0=27.8333333333333 +lon_0=-99 +lat_1=30.2833333333333 +lat_2=28.3833333333333 +x_0=600000 +y_0=3999999.9998984 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6619',
	  '+proj=lcc +lat_0=38.3333333333333 +lon_0=-111.5 +lat_1=40.65 +lat_2=39.0166666666667 +x_0=500000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6625',
	  '+proj=lcc +lat_0=38.3333333333333 +lon_0=-111.5 +lat_1=40.65 +lat_2=39.0166666666667 +x_0=500000.00001016 +y_0=2000000.00001016 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6620',
	  '+proj=lcc +lat_0=40.3333333333333 +lon_0=-111.5 +lat_1=41.7833333333333 +lat_2=40.7166666666667 +x_0=500000 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6626',
	  '+proj=lcc +lat_0=40.3333333333333 +lon_0=-111.5 +lat_1=41.7833333333333 +lat_2=40.7166666666667 +x_0=500000.00001016 +y_0=999999.999989839 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6621',
	  '+proj=lcc +lat_0=36.6666666666667 +lon_0=-111.5 +lat_1=38.35 +lat_2=37.2166666666667 +x_0=500000 +y_0=3000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6627',
	  '+proj=lcc +lat_0=36.6666666666667 +lon_0=-111.5 +lat_1=38.35 +lat_2=37.2166666666667 +x_0=500000.00001016 +y_0=3000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6589',
	  '+proj=tmerc +lat_0=42.5 +lon_0=-72.5 +k=0.999964286 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6590',
	  '+proj=tmerc +lat_0=42.5 +lon_0=-72.5 +k=0.999964286 +x_0=500000.00001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6592',
	  '+proj=lcc +lat_0=37.6666666666667 +lon_0=-78.5 +lat_1=39.2 +lat_2=38.0333333333333 +x_0=3500000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6593',
	  '+proj=lcc +lat_0=37.6666666666667 +lon_0=-78.5 +lat_1=39.2 +lat_2=38.0333333333333 +x_0=3500000.0001016 +y_0=2000000.0001016 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6594',
	  '+proj=lcc +lat_0=36.3333333333333 +lon_0=-78.5 +lat_1=37.9666666666667 +lat_2=36.7666666666667 +x_0=3500000 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6595',
	  '+proj=lcc +lat_0=36.3333333333333 +lon_0=-78.5 +lat_1=37.9666666666667 +lat_2=36.7666666666667 +x_0=3500000.0001016 +y_0=999999.999898399 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6598',
	  '+proj=lcc +lat_0=45.3333333333333 +lon_0=-120.5 +lat_1=47.3333333333333 +lat_2=45.8333333333333 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6599',
	  '+proj=lcc +lat_0=45.3333333333333 +lon_0=-120.5 +lat_1=47.3333333333333 +lat_2=45.8333333333333 +x_0=500000.0001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6600',
	  '+proj=lcc +lat_0=38.5 +lon_0=-79.5 +lat_1=40.25 +lat_2=39 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6601',
	  '+proj=lcc +lat_0=38.5 +lon_0=-79.5 +lat_1=40.25 +lat_2=39 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6602',
	  '+proj=lcc +lat_0=37 +lon_0=-81 +lat_1=38.8833333333333 +lat_2=37.4833333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6603',
	  '+proj=lcc +lat_0=37 +lon_0=-81 +lat_1=38.8833333333333 +lat_2=37.4833333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6879',
	  '+proj=lcc +lat_0=43.8333333333333 +lon_0=-90 +lat_1=45.5 +lat_2=44.25 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6605',
	  '+proj=lcc +lat_0=43.8333333333333 +lon_0=-90 +lat_1=45.5 +lat_2=44.25 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6606',
	  '+proj=lcc +lat_0=45.1666666666667 +lon_0=-90 +lat_1=46.7666666666667 +lat_2=45.5666666666667 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6607',
	  '+proj=lcc +lat_0=45.1666666666667 +lon_0=-90 +lat_1=46.7666666666667 +lat_2=45.5666666666667 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6608',
	  '+proj=lcc +lat_0=42 +lon_0=-90 +lat_1=44.0666666666667 +lat_2=42.7333333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6609',
	  '+proj=lcc +lat_0=42 +lon_0=-90 +lat_1=44.0666666666667 +lat_2=42.7333333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6611',
	  '+proj=tmerc +lat_0=40.5 +lon_0=-105.166666666667 +k=0.9999375 +x_0=200000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6612',
	  '+proj=tmerc +lat_0=40.5 +lon_0=-105.166666666667 +k=0.9999375 +x_0=200000.00001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6613',
	  '+proj=tmerc +lat_0=40.5 +lon_0=-107.333333333333 +k=0.9999375 +x_0=400000 +y_0=100000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6614',
	  '+proj=tmerc +lat_0=40.5 +lon_0=-107.333333333333 +k=0.9999375 +x_0=399999.99998984 +y_0=99999.9999898399 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6615',
	  '+proj=tmerc +lat_0=40.5 +lon_0=-110.083333333333 +k=0.9999375 +x_0=800000 +y_0=100000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6616',
	  '+proj=tmerc +lat_0=40.5 +lon_0=-110.083333333333 +k=0.9999375 +x_0=800000.00001016 +y_0=99999.9999898399 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
	[
	  'EPSG:6617',
	  '+proj=tmerc +lat_0=40.5 +lon_0=-108.75 +k=0.9999375 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
	[
	  'EPSG:6618',
	  '+proj=tmerc +lat_0=40.5 +lon_0=-108.75 +k=0.9999375 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs',
	],
  
	// NAD83 - Guam
	[
	  'EPSG:4414',
	  '+proj=tmerc +lat_0=13.5 +lon_0=144.75 +k=1 +x_0=100000 +y_0=200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
	],
  ]);

export class MapView{

	constructor (viewer) {
		this.viewer = viewer;

		this.webMapService = 'WMTS';
		this.mapProjectionName = 'EPSG:3857';
		this.mapProjection = proj4.defs(this.mapProjectionName);
		this.sceneProjection = null;

		this.extentsLayer = null;
		this.cameraLayer = null;
		this.toolLayer = null;
		this.sourcesLayer = null;
		this.sourcesLabelLayer = null;
		this.images360Layer = null;
		this.enabled = false;

		this.createAnnotationStyle = (text) => {
			return [
				new ol.style.Style({
					image: new ol.style.Circle({
						radius: 10,
						stroke: new ol.style.Stroke({
							color: [255, 255, 255, 0.5],
							width: 2
						}),
						fill: new ol.style.Fill({
							color: [0, 0, 0, 0.5]
						})
					})
				})
			];
		};

		this.createLabelStyle = (text) => {
			let style = new ol.style.Style({
				image: new ol.style.Circle({
					radius: 6,
					stroke: new ol.style.Stroke({
						color: 'white',
						width: 2
					}),
					fill: new ol.style.Fill({
						color: 'green'
					})
				}),
				text: new ol.style.Text({
					font: '12px helvetica,sans-serif',
					text: text,
					fill: new ol.style.Fill({
						color: '#000'
					}),
					stroke: new ol.style.Stroke({
						color: '#fff',
						width: 2
					})
				})
			});

			return style;
		};
	}

	showSources (show) {
		this.sourcesLayer.setVisible(show);
		this.sourcesLabelLayer.setVisible(show);
	}

	init () {

		if(typeof ol === "undefined"){
			return;
		}

		this.elMap = $('#potree_map');
		this.elMap.draggable({ handle: $('#potree_map_header') });
		this.elMap.resizable();

		this.elTooltip = $(`<div style="position: relative; z-index: 100"></div>`);
		this.elMap.append(this.elTooltip);

		let extentsLayer = this.getExtentsLayer();
		let cameraLayer = this.getCameraLayer();
		this.getToolLayer();
		let sourcesLayer = this.getSourcesLayer();
		this.images360Layer = this.getImages360Layer();
		this.getSourcesLabelLayer();
		this.getAnnotationsLayer();

		let mousePositionControl = new ol.control.MousePosition({
			coordinateFormat: ol.coordinate.createStringXY(5),
			projection: 'EPSG:4326',
			undefinedHTML: '&nbsp;'
		});

		let _this = this;
		let DownloadSelectionControl = function (optOptions) {
			let options = optOptions || {};

			// TOGGLE TILES
			let btToggleTiles = document.createElement('button');
			btToggleTiles.innerHTML = 'T';
			btToggleTiles.addEventListener('click', () => {
				let visible = sourcesLayer.getVisible();
				_this.showSources(!visible);
			}, false);
			btToggleTiles.style.float = 'left';
			btToggleTiles.title = 'show / hide tiles';

			// DOWNLOAD SELECTED TILES
			let link = document.createElement('a');
			link.href = '#';
			link.download = 'list.txt';
			link.style.float = 'left';

			let button = document.createElement('button');
			button.innerHTML = 'D';
			link.appendChild(button);

			let handleDownload = (e) => {
				let features = selectedFeatures.getArray();

				let url = [document.location.protocol, '//', document.location.host, document.location.pathname].join('');

				if (features.length === 0) {
					alert('No tiles were selected. Select area with ctrl + left mouse button!');
					e.preventDefault();
					e.stopImmediatePropagation();
					return false;
				} else if (features.length === 1) {
					let feature = features[0];

					if (feature.source) {
						let cloudjsurl = feature.pointcloud.pcoGeometry.url;
						let sourceurl = new URL(url + '/../' + cloudjsurl + '/../source/' + feature.source.name);
						link.href = sourceurl.href;
						link.download = feature.source.name;
					}
				} else {
					let content = '';
					for (let i = 0; i < features.length; i++) {
						let feature = features[i];

						if (feature.source) {
							let cloudjsurl = feature.pointcloud.pcoGeometry.url;
							let sourceurl = new URL(url + '/../' + cloudjsurl + '/../source/' + feature.source.name);
							content += sourceurl.href + '\n';
						}
					}

					let uri = 'data:application/octet-stream;base64,' + btoa(content);
					link.href = uri;
					link.download = 'list_of_files.txt';
				}
			};

			button.addEventListener('click', handleDownload, false);

			// assemble container
			let element = document.createElement('div');
			element.className = 'ol-unselectable ol-control';
			element.appendChild(link);
			element.appendChild(btToggleTiles);
			element.style.bottom = '0.5em';
			element.style.left = '0.5em';
			element.title = 'Download file or list of selected tiles. Select tile with left mouse button or area using ctrl + left mouse.';

			ol.control.Control.call(this, {
				element: element,
				target: options.target
			});
		};
		ol.inherits(DownloadSelectionControl, ol.control.Control);

		this.map = new ol.Map({
			controls: ol.control.defaults({
				attributionOptions: ({
					collapsible: false
				})
			}).extend([
				// this.controls.zoomToExtent,
				new DownloadSelectionControl(),
				mousePositionControl
			]),
			layers: [
				new ol.layer.Tile({source: new ol.source.OSM()}),
				this.toolLayer,
				this.annotationsLayer,
				this.sourcesLayer,
				this.sourcesLabelLayer,
				this.images360Layer,
				extentsLayer,
				cameraLayer
			],
			target: 'potree_map_content',
			view: new ol.View({
				center: this.olCenter,
				zoom: 9
			})
		});

		// DRAGBOX / SELECTION
		this.dragBoxLayer = new ol.layer.Vector({
			source: new ol.source.Vector({}),
			style: new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: 'rgba(0, 0, 255, 1)',
					width: 2
				})
			})
		});
		this.map.addLayer(this.dragBoxLayer);

		let select = new ol.interaction.Select();
		this.map.addInteraction(select);

		let selectedFeatures = select.getFeatures();

		let dragBox = new ol.interaction.DragBox({
			condition: ol.events.condition.platformModifierKeyOnly
		});

		this.map.addInteraction(dragBox);

		// this.map.on('pointermove', evt => {
		// 	let pixel = evt.pixel;
		// 	let feature = this.map.forEachFeatureAtPixel(pixel, function (feature) {
		// 		return feature;
		// 	});

		// 	// console.log(feature);
		// 	// this.elTooltip.css("display", feature ? '' : 'none');
		// 	this.elTooltip.css('display', 'none');
		// 	if (feature && feature.onHover) {
		// 		feature.onHover(evt);
		// 		// overlay.setPosition(evt.coordinate);
		// 		// tooltip.innerHTML = feature.get('name');
		// 	}
		// });

		this.map.on('click', evt => {
			let pixel = evt.pixel;
			let feature = this.map.forEachFeatureAtPixel(pixel, function (feature) {
				return feature;
			});

			if (feature && feature.onClick) {
				feature.onClick(evt);
			}
		});

		dragBox.on('boxend', (e) => {
			// features that intersect the box are added to the collection of
			// selected features, and their names are displayed in the "info"
			// div
			let extent = dragBox.getGeometry().getExtent();
			this.getSourcesLayer().getSource().forEachFeatureIntersectingExtent(extent, (feature) => {
				selectedFeatures.push(feature);
			});
		});

		// clear selection when drawing a new box and when clicking on the map
		dragBox.on('boxstart', (e) => {
			selectedFeatures.clear();
		});
		this.map.on('click', () => {
			selectedFeatures.clear();
		});

		this.viewer.addEventListener('scene_changed', e => {
			this.setScene(e.scene);
		});

		this.onPointcloudAdded = e => {
			this.load(e.pointcloud);
		};

		this.on360ImagesAdded = e => {
			this.addImages360(e.images);
		};

		this.onAnnotationAdded = e => {
			if (!this.sceneProjection) {
				return;
			}

			let annotation = e.annotation;
			let position = annotation.position;
			let mapPos = this.toMap.forward([position.x, position.y]);
			let feature = new ol.Feature({
				geometry: new ol.geom.Point(mapPos),
				name: annotation.title
			});
			feature.setStyle(this.createAnnotationStyle(annotation.title));

			feature.onHover = evt => {
				let coordinates = feature.getGeometry().getCoordinates();
				let p = this.map.getPixelFromCoordinate(coordinates);

				this.elTooltip.html(annotation.title);
				this.elTooltip.css('display', '');
				this.elTooltip.css('left', `${p[0]}px`);
				this.elTooltip.css('top', `${p[1]}px`);
			};

			feature.onClick = evt => {
				annotation.clickTitle();
			};

			this.getAnnotationsLayer().getSource().addFeature(feature);
		};

		this.setScene(this.viewer.scene);
	}

	setScene (scene) {
		if (this.scene === scene) {
			return;
		};

		if (this.scene) {
			this.scene.removeEventListener('pointcloud_added', this.onPointcloudAdded);
			this.scene.removeEventListener('360_images_added', this.on360ImagesAdded);
			this.scene.annotations.removeEventListener('annotation_added', this.onAnnotationAdded);
		}

		this.scene = scene;

		this.scene.addEventListener('pointcloud_added', this.onPointcloudAdded);
		this.scene.addEventListener('360_images_added', this.on360ImagesAdded);
		this.scene.annotations.addEventListener('annotation_added', this.onAnnotationAdded);

		for (let pointcloud of this.viewer.scene.pointclouds) {
			this.load(pointcloud);
		}

		this.viewer.scene.annotations.traverseDescendants(annotation => {
			this.onAnnotationAdded({annotation: annotation});
		});

		for(let images of this.viewer.scene.images360){
			this.on360ImagesAdded({images: images});
		}
	}

	getExtentsLayer () {
		if (this.extentsLayer) {
			return this.extentsLayer;
		}

		this.gExtent = new ol.geom.LineString([[0, 0], [0, 0]]);

		let feature = new ol.Feature(this.gExtent);
		let featureVector = new ol.source.Vector({
			features: [feature]
		});

		this.extentsLayer = new ol.layer.Vector({
			source: featureVector,
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(255, 255, 255, 0.2)'
				}),
				stroke: new ol.style.Stroke({
					color: '#0000ff',
					width: 2
				}),
				image: new ol.style.Circle({
					radius: 3,
					fill: new ol.style.Fill({
						color: '#0000ff'
					})
				})
			})
		});

		return this.extentsLayer;
	}

	getAnnotationsLayer () {
		if (this.annotationsLayer) {
			return this.annotationsLayer;
		}

		this.annotationsLayer = new ol.layer.Vector({
			source: new ol.source.Vector({
			}),
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(255, 0, 0, 1)'
				}),
				stroke: new ol.style.Stroke({
					color: 'rgba(255, 0, 0, 1)',
					width: 2
				})
			})
		});

		return this.annotationsLayer;
	}

	getCameraLayer () {
		if (this.cameraLayer) {
			return this.cameraLayer;
		}

		// CAMERA LAYER
		this.gCamera = new ol.geom.LineString([[0, 0], [0, 0], [0, 0], [0, 0]]);
		let feature = new ol.Feature(this.gCamera);
		let featureVector = new ol.source.Vector({
			features: [feature]
		});

		this.cameraLayer = new ol.layer.Vector({
			source: featureVector,
			style: new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: '#0000ff',
					width: 2
				})
			})
		});

		return this.cameraLayer;
	}

	getToolLayer () {
		if (this.toolLayer) {
			return this.toolLayer;
		}

		this.toolLayer = new ol.layer.Vector({
			source: new ol.source.Vector({
			}),
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(255, 0, 0, 1)'
				}),
				stroke: new ol.style.Stroke({
					color: 'rgba(255, 0, 0, 1)',
					width: 2
				})
			})
		});

		return this.toolLayer;
	}

	getImages360Layer(){
		if(this.images360Layer){
			return this.images360Layer;
		}

		let style = new ol.style.Style({
			image: new ol.style.Circle({
				radius: 4,
				stroke: new ol.style.Stroke({
					color: [255, 0, 0, 1],
					width: 2
				}),
				fill: new ol.style.Fill({
					color: [255, 100, 100, 1]
				})
			})
		});
		
		let layer = new ol.layer.Vector({
			source: new ol.source.Vector({}),
			style: style,
		});

		this.images360Layer = layer;

		return this.images360Layer;
	}

	getSourcesLayer () {
		if (this.sourcesLayer) {
			return this.sourcesLayer;
		}

		this.sourcesLayer = new ol.layer.Vector({
			source: new ol.source.Vector({}),
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(0, 0, 150, 0.1)'
				}),
				stroke: new ol.style.Stroke({
					color: 'rgba(0, 0, 150, 1)',
					width: 1
				})
			})
		});

		return this.sourcesLayer;
	}

	getSourcesLabelLayer () {
		if (this.sourcesLabelLayer) {
			return this.sourcesLabelLayer;
		}

		this.sourcesLabelLayer = new ol.layer.Vector({
			source: new ol.source.Vector({
			}),
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(255, 0, 0, 0.1)'
				}),
				stroke: new ol.style.Stroke({
					color: 'rgba(255, 0, 0, 1)',
					width: 2
				})
			}),
			minResolution: 0.01,
			maxResolution: 20
		});

		return this.sourcesLabelLayer;
	}

	setSceneProjection (sceneProjection) {
		this.sceneProjection = sceneProjection;
		this.toMap = proj4(this.sceneProjection, this.mapProjection);
		this.toScene = proj4(this.mapProjection, this.sceneProjection);
	};

	getMapExtent () {
		let bb = this.viewer.getBoundingBox();

		let bottomLeft = this.toMap.forward([bb.min.x, bb.min.y]);
		let bottomRight = this.toMap.forward([bb.max.x, bb.min.y]);
		let topRight = this.toMap.forward([bb.max.x, bb.max.y]);
		let topLeft = this.toMap.forward([bb.min.x, bb.max.y]);

		let extent = {
			bottomLeft: bottomLeft,
			bottomRight: bottomRight,
			topRight: topRight,
			topLeft: topLeft
		};

		return extent;
	};

	getMapCenter () {
		let mapExtent = this.getMapExtent();

		let mapCenter = [
			(mapExtent.bottomLeft[0] + mapExtent.topRight[0]) / 2,
			(mapExtent.bottomLeft[1] + mapExtent.topRight[1]) / 2
		];

		return mapCenter;
	};

	updateToolDrawings () {
		this.toolLayer.getSource().clear();

		let profiles = this.viewer.profileTool.profiles;
		for (let i = 0; i < profiles.length; i++) {
			let profile = profiles[i];
			let coordinates = [];

			for (let j = 0; j < profile.points.length; j++) {
				let point = profile.points[j];
				let pointMap = this.toMap.forward([point.x, point.y]);
				coordinates.push(pointMap);
			}

			let line = new ol.geom.LineString(coordinates);
			let feature = new ol.Feature(line);
			this.toolLayer.getSource().addFeature(feature);
		}

		let measurements = this.viewer.measuringTool.measurements;
		for (let i = 0; i < measurements.length; i++) {
			let measurement = measurements[i];
			let coordinates = [];

			for (let j = 0; j < measurement.points.length; j++) {
				let point = measurement.points[j].position;
				let pointMap = this.toMap.forward([point.x, point.y]);
				coordinates.push(pointMap);
			}

			if (measurement.closed && measurement.points.length > 0) {
				coordinates.push(coordinates[0]);
			}

			let line = new ol.geom.LineString(coordinates);
			let feature = new ol.Feature(line);
			this.toolLayer.getSource().addFeature(feature);
		}
	}

	addImages360(images){
		let transform = this.toMap.forward;
		let layer = this.getImages360Layer();

		for(let image of images.images){

			let p = transform([image.position[0], image.position[1]]);

			let feature = new ol.Feature({
				'geometry': new ol.geom.Point(p),
			});

			feature.onClick = () => {
				images.focus(image);
			};

			layer.getSource().addFeature(feature);
		}
	}

	async load (pointcloud) {
		if (!pointcloud) {
			return;
		}

		if (!pointcloud.projection) {
			return;
		}

		if (!this.sceneProjection) {
			try {
				this.setSceneProjection(pointcloud.projection);
			}catch (e) {
				console.log('Failed projection:', e);

				if (pointcloud.fallbackProjection) {
					try {
						console.log('Trying fallback projection...');
						this.setSceneProjection(pointcloud.fallbackProjection);
						console.log('Set projection from fallback');
					}catch (e) {
						console.log('Failed fallback projection:', e);
						return;
					}
				}else{
					return;
				};
			}
		}

		let mapExtent = this.getMapExtent();
		let mapCenter = this.getMapCenter();

		let view = this.map.getView();
		view.setCenter(mapCenter);

		this.gExtent.setCoordinates([
			mapExtent.bottomLeft,
			mapExtent.bottomRight,
			mapExtent.topRight,
			mapExtent.topLeft,
			mapExtent.bottomLeft
		]);

		view.fit(this.gExtent, [300, 300], {
			constrainResolution: false
		});

		if (pointcloud.pcoGeometry.type == 'ept'){ 
			return;
		}

		let url = `${pointcloud.pcoGeometry.url}/../sources.json`;
		//let response = await fetch(url);

		fetch(url).then(async (response) => {
			let data = await response.json();
		
			let sources = data.sources;

			for (let i = 0; i < sources.length; i++) {
				let source = sources[i];
				let name = source.name;
				let bounds = source.bounds;

				let mapBounds = {
					min: this.toMap.forward([bounds.min[0], bounds.min[1]]),
					max: this.toMap.forward([bounds.max[0], bounds.max[1]])
				};
				let mapCenter = [
					(mapBounds.min[0] + mapBounds.max[0]) / 2,
					(mapBounds.min[1] + mapBounds.max[1]) / 2
				];

				let p1 = this.toMap.forward([bounds.min[0], bounds.min[1]]);
				let p2 = this.toMap.forward([bounds.max[0], bounds.min[1]]);
				let p3 = this.toMap.forward([bounds.max[0], bounds.max[1]]);
				let p4 = this.toMap.forward([bounds.min[0], bounds.max[1]]);

				// let feature = new ol.Feature({
				//	'geometry': new ol.geom.LineString([p1, p2, p3, p4, p1])
				// });
				let feature = new ol.Feature({
					'geometry': new ol.geom.Polygon([[p1, p2, p3, p4, p1]])
				});
				feature.source = source;
				feature.pointcloud = pointcloud;
				this.getSourcesLayer().getSource().addFeature(feature);

				feature = new ol.Feature({
					geometry: new ol.geom.Point(mapCenter),
					name: name
				});
				feature.setStyle(this.createLabelStyle(name));
				this.sourcesLabelLayer.getSource().addFeature(feature);
			}
		}).catch(() => {
			
		});

	}

	toggle () {
		if (this.elMap.is(':visible')) {
			this.elMap.css('display', 'none');
			this.enabled = false;
		} else {
			this.elMap.css('display', 'block');
			this.enabled = true;
		}
	}

	update (delta) {
		if (!this.sceneProjection) {
			return;
		}

		let pm = $('#potree_map');

		if (!this.enabled) {
			return;
		}

		// resize
		let mapSize = this.map.getSize();
		let resized = (pm.width() !== mapSize[0] || pm.height() !== mapSize[1]);
		if (resized) {
			this.map.updateSize();
		}

		//
		let camera = this.viewer.scene.getActiveCamera();

		let scale = this.map.getView().getResolution();
		let campos = camera.position;
		let camdir = camera.getWorldDirection(new THREE.Vector3());
		let sceneLookAt = camdir.clone().multiplyScalar(30 * scale).add(campos);
		let geoPos = camera.position;
		let geoLookAt = sceneLookAt;
		let mapPos = new THREE.Vector2().fromArray(this.toMap.forward([geoPos.x, geoPos.y]));
		let mapLookAt = new THREE.Vector2().fromArray(this.toMap.forward([geoLookAt.x, geoLookAt.y]));
		let mapDir = new THREE.Vector2().subVectors(mapLookAt, mapPos).normalize();

		mapLookAt = mapPos.clone().add(mapDir.clone().multiplyScalar(30 * scale));
		let mapLength = mapPos.distanceTo(mapLookAt);
		let mapSide = new THREE.Vector2(-mapDir.y, mapDir.x);

		let p1 = mapPos.toArray();
		let p2 = mapLookAt.clone().sub(mapSide.clone().multiplyScalar(0.3 * mapLength)).toArray();
		let p3 = mapLookAt.clone().add(mapSide.clone().multiplyScalar(0.3 * mapLength)).toArray();

		this.gCamera.setCoordinates([p1, p2, p3, p1]);
	}

	get sourcesVisible () {
		return this.getSourcesLayer().getVisible();
	}

	set sourcesVisible (value) {
		this.getSourcesLayer().setVisible(value);
	}

}
