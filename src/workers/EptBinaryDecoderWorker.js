Potree = { };

onmessage = function(event) {
    let buffer = event.data.buffer;
    let view = new DataView(buffer);
    let schema = event.data.schema;
    let scale = event.data.scale;
    let offset = event.data.offset;
    let mins = event.data.mins;

    let dimensions = schema.reduce((p, c) => {
        p[c.name] = c;
        return p;
    }, { });

    let dimSize = (type) => {
        switch (type) {
            case 'int8': case 'uint8': return 1;
            case 'int16': case 'uint16': return 2;
            case 'int32': case 'uint32': case 'float': return 4;
            case 'int64': case 'uint64': case 'double': return 8;
            default: throw new Error('Invalid dimension type: ' + type);
        }
    };

    let dimOffset = (name) => {
        let offset = 0;
        for (var i = 0; i < schema.length; ++i) {
            if (schema[i].name == name) return offset;
            offset += dimSize(schema[i].type);
        }
        return undefined;
    };

    let getExtractor = (name) => {
        let offset = dimOffset(name);
        switch (dimensions[name].type) {
            case 'int8'  : return (pos) => view.getInt8(pos + offset);
            case 'int16' : return (pos) => view.getInt16(pos + offset, true);
            case 'int32' : return (pos) => view.getInt32(pos + offset, true);
            case 'int64' : return (pos) => view.getInt64(pos + offset, true);
            case 'uint8' : return (pos) => view.getUint8(pos + offset);
            case 'uint16': return (pos) => view.getUint16(pos + offset, true);
            case 'uint32': return (pos) => view.getUint32(pos + offset, true);
            case 'uint64': return (pos) => view.getUint64(pos + offset, true);
            case 'float' : return (pos) => view.getFloat32(pos + offset, true);
            case 'double': return (pos) => view.getFloat64(pos + offset, true);
            default: throw new Error('Invalid dimension type: ' + type);
        };
    };

    let pointSize = schema.reduce((p, c) => p + dimSize(c.type), 0);
    let numPoints = buffer.byteLength / pointSize;

    let xyzBuffer, rgbBuffer, intensityBuffer, classificationBuffer,
        returnNumberBuffer, numberOfReturnsBuffer, pointSourceIdBuffer;
    let xyz, rgb, intensity, classification, returnNumber, numberOfReturns,
        pointSourceId;
    let xyzExtractor, rgbExtractor, intensityExtractor, classificationExtractor,
        returnNumberExtractor, numberOfReturnsExtractor, pointSourceIdExtractor;

    if (dimensions['X'] && dimensions['Y'] && dimensions['Z']) {
        xyzBuffer = new ArrayBuffer(numPoints * 4 * 3);
        xyz = new Float32Array(xyzBuffer);
        xyzExtractor = [
            getExtractor('X'),
            getExtractor('Y'),
            getExtractor('Z')
        ];
    }

    if (dimensions['Red'] && dimensions['Green'] && dimensions['Blue']) {
        rgbBuffer = new ArrayBuffer(numPoints * 4);
        rgb = new Uint8Array(rgbBuffer);
        rgbExtractor = [
            getExtractor('Red'),
            getExtractor('Green'),
            getExtractor('Blue')
        ];
    }

    if (dimensions['Intensity']) {
        intensityBuffer = new ArrayBuffer(numPoints * 4);
        intensity = new Float32Array(intensityBuffer);
        intensityExtractor = getExtractor('Intensity');
    }

    if (dimensions['Classification']) {
        classificationBuffer = new ArrayBuffer(numPoints);
        classification = new Uint8Array(classificationBuffer);
        classificationExtractor = getExtractor('Classification');
    }

    if (dimensions['ReturnNumber']) {
        returnNumberBuffer = new ArrayBuffer(numPoints);
        returnNumber = new Uint8Array(returnNumberBuffer);
        returnNumberExtractor = getExtractor('ReturnNumber');
    }

    if (dimensions['NumberOfReturns']) {
        numberOfReturnsBuffer = new ArrayBuffer(numPoints);
        numberOfReturns = new Uint8Array(numberOfReturnsBuffer);
        numberOfReturnsExtractor = getExtractor('NumberOfReturns');
    }

    if (dimensions['PointSourceId']) {
        pointSourceIdBuffer = new ArrayBuffer(numPoints * 2);
        pointSourceId = new Uint16Array(pointSourceIdBuffer);
        pointSourceIdExtractor = getExtractor('PointSourceId');
    }

    let mean = [0, 0, 0];
    let bounds = {
        min: [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE],
        max: [-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE],
    };

    let x, y, z;
    for (let i = 0; i < numPoints; ++i) {
        let pos = i * pointSize;
        if (xyz) {
            x = xyzExtractor[0](pos) * scale.x + offset.x - mins[0];
            y = xyzExtractor[1](pos) * scale.y + offset.y - mins[1];
            z = xyzExtractor[2](pos) * scale.z + offset.z - mins[2];

            mean[0] += x / numPoints;
            mean[1] += y / numPoints;
            mean[2] += z / numPoints;

            bounds.min[0] = Math.min(bounds.min[0], x);
            bounds.min[1] = Math.min(bounds.min[1], y);
            bounds.min[2] = Math.min(bounds.min[2], z);

            bounds.max[0] = Math.max(bounds.max[0], x);
            bounds.max[1] = Math.max(bounds.max[1], y);
            bounds.max[2] = Math.max(bounds.max[2], z);

            xyz[3 * i + 0] = x;
            xyz[3 * i + 1] = y;
            xyz[3 * i + 2] = z;
        }

        if (rgb) {
            rgb[4 * i + 0] = rgbExtractor[0](pos);
            rgb[4 * i + 1] = rgbExtractor[1](pos);
            rgb[4 * i + 2] = rgbExtractor[2](pos);
        }

        if (intensity) intensity[i] = intensityExtractor(pos);
        if (classification) classification[i] = classificationExtractor(pos);
        if (returnNumber) returnNumber[i] = returnNumberExtractor(pos);
        if (numberOfReturns) numberOfReturns[i] = numberOfReturnsExtractor(pos);
        if (pointSourceId) pointSourceId[i] = pointSourceIdExtractor(pos);
    }

    let indicesBuffer = new ArrayBuffer(numPoints * 4);
    let indices = new Uint32Array(indicesBuffer);
    for (let i = 0; i < numPoints; ++i) {
        indices[i] = i;
    }

    let message = {
        numPoints: numPoints,
        tightBoundingBox: bounds,
        mean: mean,

        position: xyzBuffer,
        color: rgbBuffer,
        intensity: intensityBuffer,
        classification: classificationBuffer,
        returnNumber: returnNumberBuffer,
        numberOfReturns: numberOfReturnsBuffer,
        pointSourceId: pointSourceIdBuffer,
        indices: indicesBuffer
    };

    let transferables = [
        message.position,
        message.color,
        message.intensity,
        message.classification,
        message.returnNumber,
        message.numberOfReturns,
        message.pointSourceId,
        message.indices
    ].filter((v) => v);

    postMessage(message, transferables);
}

