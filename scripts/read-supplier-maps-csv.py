import json
import sys, os
import utm
import pdb
import argparse

sys.path.append(os.path.join(sys.path[0], '..', '..', 'build', 'DataSchemas', 'include', 'DataSchemas'))

import flatbuffers
from Flatbuffer.GroundTruth import Lanes, Lane, Vec3
import numpy as np

import matplotlib.pyplot as plt
import csv


def getLineFromCsv(map_data, filename, lane_key):
    lat_vec = []
    long_vec = []
    alt_vec = []

    with open(filename) as csv_file:
        csv_reader = csv.reader(csv_file, delimiter=",")
        line_count = 0
        for row in csv_reader:
            if line_count != 0:
                lat_vec.append(float(row[0]))
                long_vec.append(float(row[1]))
                alt_vec.append(float(row[2]))

            line_count += 1

    coord_vec = [-1]*len(long_vec)

    for ind in range(len(long_vec)):
        easting, northing, _, _ = utm.from_latlon(lat_vec[ind], long_vec[ind]) #zone, isNorth
        coord_vec[ind] = [easting, northing, alt_vec[ind]]

    map_data[lane_key] = coord_vec

    plt.plot(lat_vec, long_vec)
    plt.axis('equal')
    plt.show()

    # print(map_data)
    return map_data


def outputFlatbuffer(lane, output_file):
    createNew = True

    helper =  __import__("convert-lanes-json-to-flatbuffer")

    builder = flatbuffers.Builder(1024)

    if lane['spine'] is not None:
        spines = helper.create_vector(builder, np.array(lane['spine']), 'spine')

    if lane['left'] is not None:
        lefts = helper.create_vector(builder, np.array(lane['left']), 'left')

    if lane['right'] is not None:
        rights = helper.create_vector(builder, np.array(lane['right']), 'right')

    # Start Lane:
    Lane.LaneStart(builder)

    if lane['spine'] is not None:
        Lane.LaneAddSpine(builder, spines)

    if lane['left'] is not None:
        Lane.LaneAddLeft(builder, lefts)

    if lane['right'] is not None:
        Lane.LaneAddRight(builder, rights)

    lane = Lane.LaneEnd(builder)
    builder.Finish(lane)

    helper.write_buffer(builder, output_file, createNew)


if __name__ == "__main__":

    parser = argparse.ArgumentParser(description='Convert supplier map json into flatbuffer file.')
    parser.add_argument('--inputFileSpine', type=str, help='Path to input supplier lane spine csv file')
    parser.add_argument('--inputFileLeft', type=str, help='Path to input supplier lane left csv file')
    parser.add_argument('--inputFileRight', type=str, help='Path to input supplier lane right csv file')
    parser.add_argument('--outputFile', type=str, help='Path to output supplier lane json file')

    args = parser.parse_args()

    lane = {'spine': None, 'left': None, 'right': None}
    lane = getLineFromCsv(lane, args.inputFileSpine, 'spine')
    outputFlatbuffer(lane, args.outputFile)

# filename = "/home/akumar/Downloads/I-75-North_copy.json" 