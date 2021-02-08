## Update Lanes Lambda Layers

Lambda layers for update lanes is comprised of 3 layers
1. AWS built-in SciPy layer 
2. Flatbuffer GroundTruth compiled python 
3. "UpdateLanes" layer
    1. Shapely (1.7.0)
    2. Google flatbuffers

There is a `NumPy 1.18.5` layer defined in the service, but it isn't attached to any Lambda function. 

The SciPy layer is just a standard AWS layer.

The steps below layout how to rebuild the layers.  Each updated zip file needs to be in `/lambda/layer` to be picked up by `terraform plan/apply`.   

#### Using the layer dependencies locally 
To use these modules locally, you can simply install (`pip`) `scipy`, `flattbuffers` and `shapely`, using the versions defined in the layers.  

For the Python compiled flattbuffers dependencies, follow the same instructions for the layer construction below.

#### Building the Python Flatbuffer dependencies 

##### 1. Create a `flatc` executable 
```
clone https://github.com/google/flatbuffers
cmake -G "Unix Makefiles" -DCMAKE_BUILD_TYPE=Release 
make
```

##### 2. Build the dependencies from GroundTruth schema (https://github.com/NextDroid/DataSchemas/blob/develop/schemas/GroundTruth.fbs)

Run this locally to generate the layer zip (can eventually make this part of the build)
```
mkdir aws-lambda-layer-fb-py
cd aws-lambda-layer-fb-py
mkdir -p lambda-layer/python/lib/python3.8/site-packages
cp <GroundTruth.fbs>  lambda-layer/python/lib/python3.8/site-packages
flatc <GroundTruth.fbs>
rm <GroundTruth.fbs>
cd lambda-layer
zip -r9 python-flatbuffers.zip . 
```

#### Building the NumPy layer (again, currently not used but defined in the service)

Run this locally to generate the layer zip (can eventually make this part of the build)
```
mkdir aws-lambda-layer-numpy
cd aws-lambda-layer-numpy
mkdir -p lambda-layer/python/lib/python3.8/site-packages
python3.7 -m pip install numpy==1.18.5 --target lambda-layer/python/lib/python3.8/site-packages
cd lambda-layer
zip -r9 numpy-1.18.5.zip . 
```


#### Building the "UpdateLanes" layer (again, currently not used but defined in the service)

Run this locally to generate the layer zip (can eventually make this part of the build)
```
mkdir aws-lambda-layer-updatelanes
cd aws-lambda-layer-updatelanes
mkdir -p lambda-layer/python/lib/python3.8/site-packages
python3.7 -m pip install shapely==1.7.0 --target lambda-layer/python/lib/python3.8/site-packages
python3.7 -m pip install flatbuffers==1.12 --target lambda-layer/python/lib/python3.8/site-packages
cd lambda-layer
zip -r9 updatelanes.zip . 
```