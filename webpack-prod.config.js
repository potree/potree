var path = require('path');
const fs = require('fs');

const package_json = JSON.parse(fs.readFileSync('package.json'));
const { filename, library } = package_json;

module.exports = {
  mode: 'production',
  entry: './src/zea/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename,
    library,
    libraryTarget: 'umd',
  }
};
