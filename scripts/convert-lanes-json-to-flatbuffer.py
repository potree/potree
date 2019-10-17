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
from shapely.geometry import LineString, Point, MultiPoint, box
from shapely.ops import nearest_points
from scipy.spatial import cKDTree


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

def get_heading(pt1, pt2):
    p1 = np.array(pt1).transpose()
    p2 = np.array(pt2).transpose()
    delta = p2-p1
    heading = np.arctan2(delta[1], delta[0])
    return heading

def min_angle(theta, bounds=[-np.pi, np.pi]):
    while theta < bounds[0]:
        theta += 2*np.pi
    while theta > bounds[1]:
        theta -= 2*np.pi
    return theta

def min_angle_diff(theta1, theta2, bounds=[-np.pi, np.pi]):
    delta = theta2 - theta1
    return min_angle(delta)

def normalize_vector(vector):
    vector = np.array(vector)
    return vector / np.linalg.norm(vector)


def find_plane_line_intersection(plane_pt, plane_normal, line_pt, line_direction):
    plane_normal = normalize_vector(plane_normal)
    line_direction = normalize_vector(line_direction)

    alpha = np.dot(plane_normal, plane_pt) - np.dot(plane_normal, line_pt) / np.dot(plane_normal, line_direction)
    return line_pt + alpha * line_direction

def getLinesFromJson(inputFileLeft, inputFileRight, upsampleValue, verbose):
    laneChangeNNRange = 5 # meters
    rightLaneNeighborPointsQueryNumber = 10 # number of neighbors
    laneChangeHeadingThresh = np.pi/4 # Radians
    prevPointSuppressionRadius = .1 # meters

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

    # Upsample the points
    if (upsampleValue):
        upsample(laneLefts, laneRights, upsampleValue)

    # Compute Spine Vertices (using left lane as reference):
    rightLine = LineString(laneRights) # Create shapely linestring for right line
    kdtree = cKDTree(laneRights) # Create KD-Tree for right lane points as well
    lastIdx = len(laneLefts)-1
    for ii in range(lastIdx+1):
        p = laneLefts[ii]
        pt = Point(p)
        projPt = rightLine.interpolate(rightLine.project(pt))
        minLine = LineString([pt, projPt]) # Shortest line from pt to right line
        spinePt = minLine.interpolate(minLine.length/2)

        if ii != 0 and ii != lastIdx:
            lastPt = Point(laneLefts[ii-1])
            nextPt = Point(laneLefts[ii+1])
            lastHeading = get_heading(lastPt, pt)
            nextHeading = get_heading(pt, nextPt)

            leftHeadingDelta = min_angle_diff(lastHeading, nextHeading)

            if np.abs(leftHeadingDelta) > laneChangeHeadingThresh:

                if verbose:
                    print("Lane Change Detected: \n\tii: {}\theading: {}\tpos: {}".format(ii, leftHeadingDelta, p))
                    print("\tLast Left Heading: {}".format(lastHeading))
                    print("\tNext Left Heading: {}".format(nextHeading))

                # Get idxs of nearby right points
                dists_nn, idxs_nn = kdtree.query(p, rightLaneNeighborPointsQueryNumber)
                if verbose:
                    print("\tRight Point Idxs (Before): {}".format(idxs_nn))
                    print("\tRight Point Dists (Before): {}".format(dists_nn))
                filterer = dists_nn <= laneChangeNNRange
                dists_nn = dists_nn[filterer]
                idxs_nn = idxs_nn[filterer]
                idxs_nn_min = max(idxs_nn.min()-1, 0)
                idxs_nn_max = min(idxs_nn.max()+2, len(laneRights))

                idxs_nn = np.arange(idxs_nn_min, idxs_nn_max) # Closed set of points approximately within laneChangeNNRange of pt

                if len(idxs_nn) < 3:
                    print("Not Enough Neighbors for pt: [idx: {}, pos: {}]".format(ii, p))
                    continue

                # Find closest lane change point in right line:
                rightPts = np.array(laneRights)[idxs_nn]
                rightPtDeltas = np.diff(rightPts, axis=0)
                rightHeadings = np.arctan2(rightPtDeltas[:,1], rightPtDeltas[:,0])
                rightHeadingDeltas = np.array([min_angle(x) for x in np.diff(rightHeadings)])
                # rightHeadingDeltas = np.diff(rightHeadings)

                if rightHeadingDeltas.shape[0] == 0:
                    print("No RightHeadingDeltas for pt: [idx: {}, pos: {}]".format(ii, p))
                    continue

                leftRightHeadingDeltaSimilarity = np.abs(rightHeadingDeltas-leftHeadingDelta)
                bestRightHeadingIdx = leftRightHeadingDeltaSimilarity.argmin() + 1
                rightPtIdx = idxs_nn[bestRightHeadingIdx] # +1 inside []

                if verbose:
                    print("\tRight Point Idxs (After): {}".format(idxs_nn))
                    print("\tRight Heading Diffs: {}".format(rightHeadingDeltas))
                    print("\tRight Heading Diffs: {}".format(leftRightHeadingDeltaSimilarity))
                    print("\tBest Right Heading Idx: {}".format(bestRightHeadingIdx))
                    print("\trightPtIdx: {}".format(rightPtIdx))

                # Simple Solution (Just Compute Spine Point using the Right Lane Change Point and append):
                rightPt = Point(laneRights[rightPtIdx])
                minLine = LineString([pt, rightPt])
                spinePt2 = minLine.interpolate(minLine.length/2)

                p1 = np.array(laneSpines[-1][:2])
                p2 = np.array(spinePt2.xy).flatten()

                if np.linalg.norm((p2-p1)) > prevPointSuppressionRadius: # If spine point is farther than thresh from previous point append
                    laneSpines.append([spinePt2.x, spinePt2.y, spinePt2.z])


        # Don't append lane spine if duplicate (within 10cm of last) or if going backwards:
        def should_append(spinePt):

            if len(laneSpines) < 1:
                return True

            p1 = np.array(laneSpines[-1])[:2]
            p2 = np.array(spinePt.xy).flatten()

            if np.linalg.norm(p2-p1) < prevPointSuppressionRadius:
                print("Skipping lane spine point-- too close to existing spine point")
                return False
            else:
                if len(laneSpines) >=2:
                    p0 = np.array(laneSpines[-2])[:2]

                    v1 = (p1-p0)[:2]
                    v2 = (p2-p1)[:2]

                    magV1 = np.linalg.norm(v1)
                    magV2 = np.linalg.norm(v2)

                    cosHeading = np.dot(v1, v2)/(magV1 * magV2)

                    if np.abs(cosHeading - (-1)) < .1:
                        print("Skipping lane spine point -- going backwards")
                        return False
                    else:
                        return True
                else:
                    return True


        if should_append(spinePt):
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

def plotLines(laneSegments, verbose):
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


    spinePts = np.array(laneSpines)
    spinePtDeltas = np.diff(spinePts, axis=0)
    spineHeadings = np.arctan2(spinePtDeltas[:,1], spinePtDeltas[:,0])
    spineHeadingDeltas = np.diff(spineHeadings)

    laneChangeIdxs = np.abs(spineHeadingDeltas) > np.pi/4
    laneChangeIdxs = np.hstack([[False], laneChangeIdxs, [False]])

    print(laneSpines.shape)
    fig = plt.figure(figsize=[10,10])

    if verbose:
        for ii in range(laneLefts.shape[0]):
            plt.annotate(str(ii), laneLefts[ii,:2])
        for ii in range(laneRights.shape[0]):
            plt.annotate(str(ii), laneRights[ii,:2])


    plt.plot(laneLefts[:,0], laneLefts[:,1], label="Left Lane")
    plt.plot(laneRights[:,0], laneRights[:,1], label="Right Lane")
    plt.plot(laneSpines[:,0], laneSpines[:,1], label="Lane Spine")
    plt.scatter(laneLefts[:,0], laneLefts[:,1])
    plt.scatter(laneRights[:,0], laneRights[:,1])
    plt.scatter(laneSpines[:,0], laneSpines[:,1])
    plt.plot(laneSpines[laneChangeIdxs,0], laneSpines[laneChangeIdxs,1], 'rD', label="Lane Changes")
    plt.axis('equal')
    plt.legend()
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
        Lane.LaneAddId(builder, 0)

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

def multipoint_index(multipoint, point):
    for i in range(len(multipoint)):
        if (point.x == multipoint[i].x and point.y == multipoint[i].y):
            return i

    return None

def upsample_single(lane1, lane2, threshold):
    # Create a shapely line string for lane2
    lane2Line = LineString(lane2)

    # Loop through points in lane1
    for i in range(len(lane1)):
        # Get the closest point on lane2
        projection = lane2Line.interpolate(lane2Line.project(Point(lane1[i])))

        # Create bounds in which to check for a neighbor
        bounds = projection.buffer(threshold)

        # Check if the nearest neighbor to the projection point is within the bounds
        points = MultiPoint(lane2)
        nearestPoint = nearest_points(projection, points)[1]
        if (not bounds.contains(nearestPoint)):
            # Insert the new neighbor at the correct index
            index = multipoint_index(points, nearestPoint)
            if (lane2Line.project(nearestPoint, normalized=True) < lane2Line.project(projection, normalized=True)):
                index = index + 1

            lane2.insert(index, [projection.x, projection.y, projection.z])


def upsample(leftPoints, rightPoints, threshold):
    upsample_single(leftPoints, rightPoints, threshold)
    upsample_single(rightPoints, leftPoints, threshold)
    print("Left size after upsample:", len(leftPoints))
    print("Right size after upsample:", len(rightPoints))
    #assert len(leftPoints) == len(rightPoints)


def check_lane_spine(laneSegments):
    # import pdb
    # pdb.set_trace()
    leftLine = LineString(laneSegments[0]["left"])
    spineLine = LineString(laneSegments[0]["spine"])
    rightLine = LineString(laneSegments[0]["right"])

    left_dists = []
    right_dists = []
    distance_steps = np.linspace(0, spineLine.length, spineLine.length+1)
    for d in distance_steps:
        pt = spineLine.interpolate(d)

        projPt = leftLine.interpolate(leftLine.project(pt))
        minLine = LineString([pt, projPt]) # Shortest line from pt to right line
        left_dists.append(minLine.length)

        projPt = rightLine.interpolate(rightLine.project(pt))
        minLine = LineString([pt, projPt]) # Shortest line from pt to right line
        right_dists.append(minLine.length)

    # plt.subplots(21, sharex=True)
    ax = plt.subplot(211)
    plt.title("Spine Distance to Nearest Lane Boundary")
    plt.xlabel("Distance along spine")
    plt.ylabel("Distance to Lane Boundary")
    plt.plot(distance_steps/spineLine.length, left_dists, label="Right Lane Boundary")
    plt.plot(distance_steps/spineLine.length, right_dists, label="Left Lane Boundary")
    plt.legend()
    plt.grid(True)

    plt.subplot(212, sharex=ax)
    plt.title("Spine Distance to Right vs Left Discrepancy")
    plt.xlabel("Distance along spine")
    plt.ylabel("Distance to Lane Boundary")
    plt.plot(distance_steps/spineLine.length, np.array(right_dists) - np.array(left_dists), label="")
    plt.grid(True)

    plt.legend()
    plt.show()




if __name__ == "__main__":

    parser = argparse.ArgumentParser(description='Perform assessment on data serialized by the Veritas LidarPerception module.')

    parser.add_argument('--inputDir', type=str, help='Directory containing serialized data')
    parser.add_argument('--outputDir', type=str, help='Directory containing serialized data')
    parser.add_argument('--plotLanes', help='Flag to plot lane segments', action='store_true')
    parser.add_argument('--checkSpine', help='Flag to plot lane spine distances', action='store_true')
    parser.add_argument('--verbose', help='Flag to display debug messages', action='store_true')
    parser.add_argument('--upsample', help='The upsamle threshold. If this flag is not set, no upsample will be performed', required=False, type=float)

    args = parser.parse_args()

    inputDir = args.inputDir
    outputDir = args.outputDir if args.outputDir else args.inputDir

    inputFileLeft = os.path.join(inputDir, "lane-left.json")
    inputFileRight = os.path.join(inputDir, "lane-right.json")
    outputFile = os.path.join(outputDir, "lanes.fb")

    laneSegments = getLinesFromJson(inputFileLeft, inputFileRight, args.upsample, args.verbose)
    outputFlatbuffer(laneSegments, outputFile)

    if (args.checkSpine):
        check_lane_spine(laneSegments)

    if (args.plotLanes):
        plotLines(laneSegments, args.verbose)
