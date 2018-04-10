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
};

Potree.EptLoader = class {
    static load(file, callback) {
        var url, info, hier;

        EptUtils.get(file)
        .then((data) => JSON.parse(data))
        .then((i) => {
            info = i;
            url = file.substr(0, file.indexOf('entwine.json'));

            // TODO Hierarchy loading order.
            return EptUtils.get(url + 'entwine-hierarchy.json');
        })
        .then((data) => JSON.parse(data))
        .then((h) => {
            hier = h;
            let geometry = new Potree.PointCloudEptGeometry(url, info, hier);

            let root = new Potree.PointCloudEptGeometryNode(geometry);
            root.hasChildren = true;
            root.numPoints = 1; // TODO from hierarchy.

            geometry.root = root;
            geometry.root.load();

            callback(geometry);
        });
    }
};

