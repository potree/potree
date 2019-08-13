#!/bin/python3
import os
import sys
sys.path.append(os.path.join(sys.path[0], '..', '..', 'build', 'DataSchemas', 'include', 'DataSchemas'))
import parser
import argparse
import json
import numpy as np
import matplotlib.pyplot as plt
import flatbuffers
from Flatbuffer.GroundTruth import Lanes, Lane, Vec3
from shapely.geometry import LineString, Point


def to_bytes(n, length, endianess='big'):
    h = '%x' % n
    s = ('0'*(len(h) % 2) + h).zfill(length*2).decode('hex')
    return s if endianess == 'big' else s[::-1]

def write_buffer(builder, filename, createNew):
    if not createNew:
        flag = "ab"
        print("APPENDING")
    else:
        flag = "wb"
        print("NEW")

    file = open(filename, flag)
    output_data = builder.Output()
#     size = len(output_data).to_bytes(4, byteorder='little', signed=True)
    size = len(output_data).to_bytes(4, byteorder='little', signed=True)
    print("Size: {}".format(len(output_data)))
    file.write(size)
    file.write(output_data)

def create_vector(builder, nparray, flag):
    numVals = nparray.shape[0]

    if flag == 'left':
        Lane.LaneStartLeftVector(builder, numVals)
    elif flag == 'right':
        Lane.LaneStartRightVector(builder, numVals)
    else:
        Lane.LaneStartSpineVector(builder, numVals)

    for i in range(numVals)[::-1]:
        val = Vec3.CreateVec3(builder, nparray[i, 0], nparray[i, 1], nparray[i, 2])
    vals = builder.EndVector(numVals)

    return vals

def getXYZ(data):
    x = data['position']['x']
    y = data['position']['y']
    z = data['position']['z']
    return [x, y, z]


def getLinesFromJson(inputFileLeft, inputFileRight):
    laneSegments = []
    laneLefts = []
    laneSpines = []
    laneRights = []

    leftData = json.loads(open(inputFileLeft, 'r').read())
    rightData = json.loads(open(inputFileRight, 'r').read())

    # Get Left/Right Line Vertices
    for i in range(len(leftData)):
        laneLefts.append(  getXYZ(leftData[i]) )
    for i in range(len(rightData)):
        laneRights.append( getXYZ(rightData[i]) )

    # Compute Spine Vertices (using left lane as reference):
    rightLine = LineString(laneRights) # Create shapely linestring for right line
    for p in laneLefts:
        pt = Point(p)
        projPt = rightLine.interpolate(rightLine.project(pt))
        minLine = LineString([pt, projPt]) # Shortest line from pt to right line
        spinePt = minLine.interpolate(minLine.length/2)
        laneSpines.append([spinePt.x, spinePt.y, spinePt.z])

    # Convert to Numpy arrays:

    laneSpines = np.array(laneSpines[:len(laneSpines)])
    laneLefts = np.array(laneLefts[:len(laneLefts)])
    laneRights = np.array(laneRights[:len(laneRights)])

    laneSegments.append({
        "left": laneLefts,
        "right": laneRights,
        "spine": laneSpines
    })

    return laneSegments

def plotLines(laneSegments):
    first = True
    for laneSegment in laneSegments:
        if first:
            laneSpines = laneSegment['spine']
            laneLefts = laneSegment['left']
            laneRights = laneSegment['right']
            first = False
        else:
            laneSpines = np.vstack([laneSpines, laneSegment['spine']])
            laneLefts = np.vstack([laneLefts, laneSegment['left']])
            laneRights = np.vstack([laneRights, laneSegment['right']])

    print(laneSpines.shape)
    fig = plt.figure(figsize=[10,10])
    plt.plot(laneLefts[:,0], laneLefts[:,1])
    plt.plot(laneRights[:,0], laneRights[:,1])
    plt.plot(laneSpines[:,0], laneSpines[:,1])
    plt.axis('equal')
    plt.show()
    plt.savefig('lanes.pdf')


def outputFlatbuffer(laneSegments, outputFile):
    createNew = True
    temp_lanes = []

    i = 0
    for laneSegment in laneSegments:
        print(i)
        i += 1

        builder = flatbuffers.Builder(1024)

        lefts = create_vector(builder, laneSegment['left'], 'left')
        rights = create_vector(builder, laneSegment['right'], 'right')
        spines = create_vector(builder, laneSegment['spine'], 'spine')

        # Start Lane:
        Lane.LaneStart(builder)

        # Set ID:
        Lane.LaneAddId(builder, 1337)

        # Add Lefts:
        Lane.LaneAddLeft(builder, lefts)

        # Add Rights:
        Lane.LaneAddRight(builder, rights)

        # Add Spine:
        Lane.LaneAddSpine(builder, spines)

        lane = Lane.LaneEnd(builder)
        builder.Finish(lane)
        temp_lanes.append(lane)

        write_buffer(builder, outputFile, createNew)
        createNew = False



if __name__ == "__main__":

    parser = argparse.ArgumentParser(description='Perform assessment on data serialized by the Veritas LidarPerception module.')

    parser.add_argument('--inputDir', type=str, help='Directory containing serialized data')
    parser.add_argument('--outputDir', type=str, help='Directory containing serialized data')
    parser.add_argument('--plotLanes', help='Flag to plot lane segments', action='store_true')

    args = parser.parse_args()

    inputDir = args.inputDir
    outputDir = args.outputDir

    inputFileLeft = os.path.join(inputDir, "lane-left.json")
    inputFileRight = os.path.join(inputDir, "lane-right.json")
    outputFile = os.path.join(outputDir, "lanes.fb")

    laneSegments = getLinesFromJson(inputFileLeft, inputFileRight)
    outputFlatbuffer(laneSegments, outputFile)

    if (args.plotLanes):
        plotLines(laneSegments)
