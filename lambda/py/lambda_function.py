import json
import update_lanes
import os
import sys
import parser
import argparse
import json
import boto3
import logging
from botocore.exceptions import ClientError
import flatbuffers
import Lanes
import Lane
import Vec3
import PointValidity
import PointAnnotationStatus
import numpy as np
from shapely.geometry import LineString, Point, MultiPoint, box
from shapely.ops import nearest_points
from scipy.spatial import cKDTree
from io import BytesIO


def lambda_handler(event, context):
    update_lanes.getUpdatedSpine(event)
    return {
        'statusCode': 200
    }

