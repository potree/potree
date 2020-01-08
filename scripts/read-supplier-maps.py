import json
import sys, os
import utm
import pdb
import argparse

sys.path.append(os.path.join(sys.path[0], '..', '..', 'build', 'DataSchemas', 'include', 'DataSchemas'))

import flatbuffers
from Flatbuffer.GroundTruth import Lanes, Lane, Vec3
import numpy as np

LANE_NAME = 'I-75-North-Unknown-Lane'


def getLinesFromJson(filename):
	map_data = json.loads(open(filename, 'r').read())
	long_vec = map_data[LANE_NAME]['Center-Line']['long']
	lat_vec = map_data[LANE_NAME]['Center-Line']['lat']

	spine_vec = [-1]*len(long_vec)

	for ind in range(len(long_vec)):
		easting, northing, _, _ = utm.from_latlon(lat_vec[ind], long_vec[ind]) #zone, isNorth
		spine_vec[ind] = [easting, northing, 1000]

	map_data[LANE_NAME]['spine'] = spine_vec

	# print(map_data)
	return map_data


def outputFlatbuffer(lane, output_file):
    createNew = True

    helper =  __import__("convert-lanes-json-to-flatbuffer")

    builder = flatbuffers.Builder(1024)

    spines = helper.create_vector(builder, np.array(lane['spine']), 'spine')

    # Start Lane:
    Lane.LaneStart(builder)

    # Add Spine:
    Lane.LaneAddSpine(builder, spines)    

    lane = Lane.LaneEnd(builder)
    builder.Finish(lane)

    helper.write_buffer(builder, output_file, createNew)


if __name__ == "__main__":

    parser = argparse.ArgumentParser(description='Convert supplier map json into flatbuffer file.')
    parser.add_argument('--inputFile', type=str, help='Path to input supplier lane json file')
    parser.add_argument('--outputFile', type=str, help='Path to output supplier lane json file')

    args = parser.parse_args()

    lane = getLinesFromJson(args.inputFile)
    outputFlatbuffer(lane[LANE_NAME], args.outputFile)

# filename = "/home/akumar/Downloads/I-75-North_copy.json" 