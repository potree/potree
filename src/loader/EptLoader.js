/**
 * @class Loads mno files and returns a PointcloudOctree
 * for a description of the mno binary file format, read mnoFileFormat.txt
 *
 * @author Markus Schuetz
 */

class EptUtils {
    static get(url) {
        return new Promise((resolve, reject) => {
            let xhr = Potree.XHRFactory.createXMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200 || xhr.status === 0) {
                        resolve(xhr.responseText);
                    }
                    else {
                        reject(xhr.responseText);
                    }
                }
            };
            xhr.send(null);
        });
    }

    static getJson(url) {
        return EptUtils.get(url).then((data) => JSON.parse(data));
    }
};

Potree.EptLoader = class {
    static load(file, callback) {
        EptUtils.getJson(file)
        .then((info) => {
            let url = file.substr(0, file.lastIndexOf('entwine.json'));
            let geometry = new Potree.PointCloudEptGeometry(url, info);
            let root = new Potree.PointCloudEptGeometryNode(geometry);

            geometry.root = root;
            geometry.root.load();

            callback(geometry);
        });
    }
};

