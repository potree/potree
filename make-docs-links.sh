mkdir -p docs/tutorials/libs
mkdir -p docs/tutorials/libs/zea-engine
ln -sf ${PWD}/node_modules/@zeainc/zea-engine/public-resources/ ${PWD}/docs/tutorials/libs/zea-engine/public-resources/
ln -sf ${PWD}/node_modules/@zeainc/zea-engine/dist/ ${PWD}/docs/tutorials/libs/zea-engine/dist/

mkdir -p docs/tutorials/libs/zea-pointclouds
ln -sf ${PWD}/dist ${PWD}/docs/tutorials/libs/zea-pointclouds/dist/
