mkdir "test-libs"

mkdir "test-libs/zea-engine"
mklink /J "test-libs/zea-engine/dist" "node_modules/@zeainc/zea-engine/dist"
mklink /J "test-libs/zea-engine/public-resources" "node_modules/@zeainc/zea-engine/public-resources"

mkdir "test-libs/zea-pointclouds"
mklink /J "test-libs/zea-pointclouds/dist" "dist"