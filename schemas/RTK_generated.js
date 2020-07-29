// automatically generated by the FlatBuffers compiler, do not modify

/**
 * @const
 * @namespace
 */
var Flatbuffer = Flatbuffer || {};

/**
 * @const
 * @namespace
 */
Flatbuffer.RTK = Flatbuffer.RTK || {};

/**
 * @constructor
 */
Flatbuffer.RTK.UTM = function() {
  /**
   * @type {flatbuffers.ByteBuffer}
   */
  this.bb = null;

  /**
   * @type {number}
   */
  this.bb_pos = 0;
};

/**
 * @param {number} i
 * @param {flatbuffers.ByteBuffer} bb
 * @returns {Flatbuffer.RTK.UTM}
 */
Flatbuffer.RTK.UTM.prototype.__init = function(i, bb) {
  this.bb_pos = i;
  this.bb = bb;
  return this;
};

/**
 * @returns {number}
 */
Flatbuffer.RTK.UTM.prototype.x = function() {
  return this.bb.readFloat64(this.bb_pos);
};

/**
 * @param {number} value
 * @returns {boolean}
 */
Flatbuffer.RTK.UTM.prototype.mutate_x = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 0);

  if (offset === 0) {
    return false;
  }

  this.bb.writeFloat64(this.bb_pos + offset, value);
  return true;
};

/**
 * @returns {number}
 */
Flatbuffer.RTK.UTM.prototype.y = function() {
  return this.bb.readFloat64(this.bb_pos + 8);
};

/**
 * @param {number} value
 * @returns {boolean}
 */
Flatbuffer.RTK.UTM.prototype.mutate_y = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 8);

  if (offset === 0) {
    return false;
  }

  this.bb.writeFloat64(this.bb_pos + offset, value);
  return true;
};

/**
 * @returns {number}
 */
Flatbuffer.RTK.UTM.prototype.z = function() {
  return this.bb.readFloat64(this.bb_pos + 16);
};

/**
 * @param {number} value
 * @returns {boolean}
 */
Flatbuffer.RTK.UTM.prototype.mutate_z = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 16);

  if (offset === 0) {
    return false;
  }

  this.bb.writeFloat64(this.bb_pos + offset, value);
  return true;
};

/**
 * @returns {number}
 */
Flatbuffer.RTK.UTM.prototype.roll = function() {
  return this.bb.readFloat64(this.bb_pos + 24);
};

/**
 * @param {number} value
 * @returns {boolean}
 */
Flatbuffer.RTK.UTM.prototype.mutate_roll = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 24);

  if (offset === 0) {
    return false;
  }

  this.bb.writeFloat64(this.bb_pos + offset, value);
  return true;
};

/**
 * @returns {number}
 */
Flatbuffer.RTK.UTM.prototype.pitch = function() {
  return this.bb.readFloat64(this.bb_pos + 32);
};

/**
 * @param {number} value
 * @returns {boolean}
 */
Flatbuffer.RTK.UTM.prototype.mutate_pitch = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 32);

  if (offset === 0) {
    return false;
  }

  this.bb.writeFloat64(this.bb_pos + offset, value);
  return true;
};

/**
 * @returns {number}
 */
Flatbuffer.RTK.UTM.prototype.yaw = function() {
  return this.bb.readFloat64(this.bb_pos + 40);
};

/**
 * @param {number} value
 * @returns {boolean}
 */
Flatbuffer.RTK.UTM.prototype.mutate_yaw = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 40);

  if (offset === 0) {
    return false;
  }

  this.bb.writeFloat64(this.bb_pos + offset, value);
  return true;
};

/**
 * @returns {number}
 */
Flatbuffer.RTK.UTM.prototype.zone = function() {
  return this.bb.readInt32(this.bb_pos + 48);
};

/**
 * @param {number} value
 * @returns {boolean}
 */
Flatbuffer.RTK.UTM.prototype.mutate_zone = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 48);

  if (offset === 0) {
    return false;
  }

  this.bb.writeInt32(this.bb_pos + offset, value);
  return true;
};

/**
 * @returns {boolean}
 */
Flatbuffer.RTK.UTM.prototype.northP = function() {
  return !!this.bb.readInt8(this.bb_pos + 52);
};

/**
 * @param {boolean} value
 * @returns {boolean}
 */
Flatbuffer.RTK.UTM.prototype.mutate_northP = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 52);

  if (offset === 0) {
    return false;
  }

  this.bb.writeInt8(this.bb_pos + offset, value);
  return true;
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} roll
 * @param {number} pitch
 * @param {number} yaw
 * @param {number} zone
 * @param {boolean} northP
 * @returns {flatbuffers.Offset}
 */
Flatbuffer.RTK.UTM.createUTM = function(builder, x, y, z, roll, pitch, yaw, zone, northP) {
  builder.prep(8, 56);
  builder.pad(3);
  builder.writeInt8(+northP);
  builder.writeInt32(zone);
  builder.writeFloat64(yaw);
  builder.writeFloat64(pitch);
  builder.writeFloat64(roll);
  builder.writeFloat64(z);
  builder.writeFloat64(y);
  builder.writeFloat64(x);
  return builder.offset();
};

/**
 * @constructor
 */
Flatbuffer.RTK.Vec3 = function() {
  /**
   * @type {flatbuffers.ByteBuffer}
   */
  this.bb = null;

  /**
   * @type {number}
   */
  this.bb_pos = 0;
};

/**
 * @param {number} i
 * @param {flatbuffers.ByteBuffer} bb
 * @returns {Flatbuffer.RTK.Vec3}
 */
Flatbuffer.RTK.Vec3.prototype.__init = function(i, bb) {
  this.bb_pos = i;
  this.bb = bb;
  return this;
};

/**
 * @returns {number}
 */
Flatbuffer.RTK.Vec3.prototype.x = function() {
  return this.bb.readFloat64(this.bb_pos);
};

/**
 * @param {number} value
 * @returns {boolean}
 */
Flatbuffer.RTK.Vec3.prototype.mutate_x = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 0);

  if (offset === 0) {
    return false;
  }

  this.bb.writeFloat64(this.bb_pos + offset, value);
  return true;
};

/**
 * @returns {number}
 */
Flatbuffer.RTK.Vec3.prototype.y = function() {
  return this.bb.readFloat64(this.bb_pos + 8);
};

/**
 * @param {number} value
 * @returns {boolean}
 */
Flatbuffer.RTK.Vec3.prototype.mutate_y = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 8);

  if (offset === 0) {
    return false;
  }

  this.bb.writeFloat64(this.bb_pos + offset, value);
  return true;
};

/**
 * @returns {number}
 */
Flatbuffer.RTK.Vec3.prototype.z = function() {
  return this.bb.readFloat64(this.bb_pos + 16);
};

/**
 * @param {number} value
 * @returns {boolean}
 */
Flatbuffer.RTK.Vec3.prototype.mutate_z = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 16);

  if (offset === 0) {
    return false;
  }

  this.bb.writeFloat64(this.bb_pos + offset, value);
  return true;
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {flatbuffers.Offset}
 */
Flatbuffer.RTK.Vec3.createVec3 = function(builder, x, y, z) {
  builder.prep(8, 24);
  builder.writeFloat64(z);
  builder.writeFloat64(y);
  builder.writeFloat64(x);
  return builder.offset();
};

/**
 * @constructor
 */
Flatbuffer.RTK.Pose = function() {
  /**
   * @type {flatbuffers.ByteBuffer}
   */
  this.bb = null;

  /**
   * @type {number}
   */
  this.bb_pos = 0;
};

/**
 * @param {number} i
 * @param {flatbuffers.ByteBuffer} bb
 * @returns {Flatbuffer.RTK.Pose}
 */
Flatbuffer.RTK.Pose.prototype.__init = function(i, bb) {
  this.bb_pos = i;
  this.bb = bb;
  return this;
};

/**
 * @param {flatbuffers.ByteBuffer} bb
 * @param {Flatbuffer.RTK.Pose=} obj
 * @returns {Flatbuffer.RTK.Pose}
 */
Flatbuffer.RTK.Pose.getRootAsPose = function(bb, obj) {
  return (obj || new Flatbuffer.RTK.Pose).__init(bb.readInt32(bb.position()) + bb.position(), bb);
};

/**
 * @returns {number}
 */
Flatbuffer.RTK.Pose.prototype.lat = function() {
  var offset = this.bb.__offset(this.bb_pos, 4);
  return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0.0;
};

/**
 * @param {number} value
 * @returns {boolean}
 */
Flatbuffer.RTK.Pose.prototype.mutate_lat = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 4);

  if (offset === 0) {
    return false;
  }

  this.bb.writeFloat64(this.bb_pos + offset, value);
  return true;
};

/**
 * @returns {number}
 */
Flatbuffer.RTK.Pose.prototype.lon = function() {
  var offset = this.bb.__offset(this.bb_pos, 6);
  return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0.0;
};

/**
 * @param {number} value
 * @returns {boolean}
 */
Flatbuffer.RTK.Pose.prototype.mutate_lon = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 6);

  if (offset === 0) {
    return false;
  }

  this.bb.writeFloat64(this.bb_pos + offset, value);
  return true;
};

/**
 * @returns {number}
 */
Flatbuffer.RTK.Pose.prototype.alt = function() {
  var offset = this.bb.__offset(this.bb_pos, 8);
  return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0.0;
};

/**
 * @param {number} value
 * @returns {boolean}
 */
Flatbuffer.RTK.Pose.prototype.mutate_alt = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 8);

  if (offset === 0) {
    return false;
  }

  this.bb.writeFloat64(this.bb_pos + offset, value);
  return true;
};

/**
 * @returns {number}
 */
Flatbuffer.RTK.Pose.prototype.roll = function() {
  var offset = this.bb.__offset(this.bb_pos, 10);
  return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0.0;
};

/**
 * @param {number} value
 * @returns {boolean}
 */
Flatbuffer.RTK.Pose.prototype.mutate_roll = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 10);

  if (offset === 0) {
    return false;
  }

  this.bb.writeFloat64(this.bb_pos + offset, value);
  return true;
};

/**
 * @returns {number}
 */
Flatbuffer.RTK.Pose.prototype.pitch = function() {
  var offset = this.bb.__offset(this.bb_pos, 12);
  return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0.0;
};

/**
 * @param {number} value
 * @returns {boolean}
 */
Flatbuffer.RTK.Pose.prototype.mutate_pitch = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 12);

  if (offset === 0) {
    return false;
  }

  this.bb.writeFloat64(this.bb_pos + offset, value);
  return true;
};

/**
 * @returns {number}
 */
Flatbuffer.RTK.Pose.prototype.yaw = function() {
  var offset = this.bb.__offset(this.bb_pos, 14);
  return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0.0;
};

/**
 * @param {number} value
 * @returns {boolean}
 */
Flatbuffer.RTK.Pose.prototype.mutate_yaw = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 14);

  if (offset === 0) {
    return false;
  }

  this.bb.writeFloat64(this.bb_pos + offset, value);
  return true;
};

/**
 * @returns {number}
 */
Flatbuffer.RTK.Pose.prototype.rollRate = function() {
  var offset = this.bb.__offset(this.bb_pos, 16);
  return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0.0;
};

/**
 * @param {number} value
 * @returns {boolean}
 */
Flatbuffer.RTK.Pose.prototype.mutate_rollRate = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 16);

  if (offset === 0) {
    return false;
  }

  this.bb.writeFloat64(this.bb_pos + offset, value);
  return true;
};

/**
 * @returns {number}
 */
Flatbuffer.RTK.Pose.prototype.pitchRate = function() {
  var offset = this.bb.__offset(this.bb_pos, 18);
  return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0.0;
};

/**
 * @param {number} value
 * @returns {boolean}
 */
Flatbuffer.RTK.Pose.prototype.mutate_pitchRate = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 18);

  if (offset === 0) {
    return false;
  }

  this.bb.writeFloat64(this.bb_pos + offset, value);
  return true;
};

/**
 * @returns {number}
 */
Flatbuffer.RTK.Pose.prototype.yawRate = function() {
  var offset = this.bb.__offset(this.bb_pos, 20);
  return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0.0;
};

/**
 * @param {number} value
 * @returns {boolean}
 */
Flatbuffer.RTK.Pose.prototype.mutate_yawRate = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 20);

  if (offset === 0) {
    return false;
  }

  this.bb.writeFloat64(this.bb_pos + offset, value);
  return true;
};

/**
 * @param {Flatbuffer.RTK.Vec3=} obj
 * @returns {Flatbuffer.RTK.Vec3|null}
 */
Flatbuffer.RTK.Pose.prototype.vel = function(obj) {
  var offset = this.bb.__offset(this.bb_pos, 22);
  return offset ? (obj || new Flatbuffer.RTK.Vec3).__init(this.bb_pos + offset, this.bb) : null;
};

/**
 * @param {Flatbuffer.RTK.Vec3=} obj
 * @returns {Flatbuffer.RTK.Vec3|null}
 */
Flatbuffer.RTK.Pose.prototype.acc = function(obj) {
  var offset = this.bb.__offset(this.bb_pos, 24);
  return offset ? (obj || new Flatbuffer.RTK.Vec3).__init(this.bb_pos + offset, this.bb) : null;
};

/**
 * @returns {number}
 */
Flatbuffer.RTK.Pose.prototype.timestamp = function() {
  var offset = this.bb.__offset(this.bb_pos, 26);
  return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0.0;
};

/**
 * @param {number} value
 * @returns {boolean}
 */
Flatbuffer.RTK.Pose.prototype.mutate_timestamp = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 26);

  if (offset === 0) {
    return false;
  }

  this.bb.writeFloat64(this.bb_pos + offset, value);
  return true;
};

/**
 * @returns {boolean}
 */
Flatbuffer.RTK.Pose.prototype.isValid = function() {
  var offset = this.bb.__offset(this.bb_pos, 28);
  return offset ? !!this.bb.readInt8(this.bb_pos + offset) : false;
};

/**
 * @param {boolean} value
 * @returns {boolean}
 */
Flatbuffer.RTK.Pose.prototype.mutate_isValid = function(value) {
  var offset = this.bb.__offset(this.bb_pos, 28);

  if (offset === 0) {
    return false;
  }

  this.bb.writeInt8(this.bb_pos + offset, value);
  return true;
};

/**
 * @param {Flatbuffer.RTK.UTM=} obj
 * @returns {Flatbuffer.RTK.UTM|null}
 */
Flatbuffer.RTK.Pose.prototype.utm = function(obj) {
  var offset = this.bb.__offset(this.bb_pos, 30);
  return offset ? (obj || new Flatbuffer.RTK.UTM).__init(this.bb_pos + offset, this.bb) : null;
};

/**
 * @param {flatbuffers.Builder} builder
 */
Flatbuffer.RTK.Pose.startPose = function(builder) {
  builder.startObject(14);
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {number} lat
 */
Flatbuffer.RTK.Pose.addLat = function(builder, lat) {
  builder.addFieldFloat64(0, lat, 0.0);
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {number} lon
 */
Flatbuffer.RTK.Pose.addLon = function(builder, lon) {
  builder.addFieldFloat64(1, lon, 0.0);
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {number} alt
 */
Flatbuffer.RTK.Pose.addAlt = function(builder, alt) {
  builder.addFieldFloat64(2, alt, 0.0);
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {number} roll
 */
Flatbuffer.RTK.Pose.addRoll = function(builder, roll) {
  builder.addFieldFloat64(3, roll, 0.0);
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {number} pitch
 */
Flatbuffer.RTK.Pose.addPitch = function(builder, pitch) {
  builder.addFieldFloat64(4, pitch, 0.0);
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {number} yaw
 */
Flatbuffer.RTK.Pose.addYaw = function(builder, yaw) {
  builder.addFieldFloat64(5, yaw, 0.0);
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {number} rollRate
 */
Flatbuffer.RTK.Pose.addRollRate = function(builder, rollRate) {
  builder.addFieldFloat64(6, rollRate, 0.0);
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {number} pitchRate
 */
Flatbuffer.RTK.Pose.addPitchRate = function(builder, pitchRate) {
  builder.addFieldFloat64(7, pitchRate, 0.0);
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {number} yawRate
 */
Flatbuffer.RTK.Pose.addYawRate = function(builder, yawRate) {
  builder.addFieldFloat64(8, yawRate, 0.0);
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {flatbuffers.Offset} velOffset
 */
Flatbuffer.RTK.Pose.addVel = function(builder, velOffset) {
  builder.addFieldStruct(9, velOffset, 0);
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {flatbuffers.Offset} accOffset
 */
Flatbuffer.RTK.Pose.addAcc = function(builder, accOffset) {
  builder.addFieldStruct(10, accOffset, 0);
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {number} timestamp
 */
Flatbuffer.RTK.Pose.addTimestamp = function(builder, timestamp) {
  builder.addFieldFloat64(11, timestamp, 0.0);
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {boolean} isValid
 */
Flatbuffer.RTK.Pose.addIsValid = function(builder, isValid) {
  builder.addFieldInt8(12, +isValid, +false);
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {flatbuffers.Offset} utmOffset
 */
Flatbuffer.RTK.Pose.addUtm = function(builder, utmOffset) {
  builder.addFieldStruct(13, utmOffset, 0);
};

/**
 * @param {flatbuffers.Builder} builder
 * @returns {flatbuffers.Offset}
 */
Flatbuffer.RTK.Pose.endPose = function(builder) {
  var offset = builder.endObject();
  return offset;
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {number} lat
 * @param {number} lon
 * @param {number} alt
 * @param {number} roll
 * @param {number} pitch
 * @param {number} yaw
 * @param {number} rollRate
 * @param {number} pitchRate
 * @param {number} yawRate
 * @param {flatbuffers.Offset} velOffset
 * @param {flatbuffers.Offset} accOffset
 * @param {number} timestamp
 * @param {boolean} isValid
 * @param {flatbuffers.Offset} utmOffset
 * @returns {flatbuffers.Offset}
 */
Flatbuffer.RTK.Pose.createPose = function(builder, lat, lon, alt, roll, pitch, yaw, rollRate, pitchRate, yawRate, velOffset, accOffset, timestamp, isValid, utmOffset) {
  Flatbuffer.RTK.Pose.startPose(builder);
  Flatbuffer.RTK.Pose.addLat(builder, lat);
  Flatbuffer.RTK.Pose.addLon(builder, lon);
  Flatbuffer.RTK.Pose.addAlt(builder, alt);
  Flatbuffer.RTK.Pose.addRoll(builder, roll);
  Flatbuffer.RTK.Pose.addPitch(builder, pitch);
  Flatbuffer.RTK.Pose.addYaw(builder, yaw);
  Flatbuffer.RTK.Pose.addRollRate(builder, rollRate);
  Flatbuffer.RTK.Pose.addPitchRate(builder, pitchRate);
  Flatbuffer.RTK.Pose.addYawRate(builder, yawRate);
  Flatbuffer.RTK.Pose.addVel(builder, velOffset);
  Flatbuffer.RTK.Pose.addAcc(builder, accOffset);
  Flatbuffer.RTK.Pose.addTimestamp(builder, timestamp);
  Flatbuffer.RTK.Pose.addIsValid(builder, isValid);
  Flatbuffer.RTK.Pose.addUtm(builder, utmOffset);
  return Flatbuffer.RTK.Pose.endPose(builder);
}

/**
 * @constructor
 */
Flatbuffer.RTK.Poses = function() {
  /**
   * @type {flatbuffers.ByteBuffer}
   */
  this.bb = null;

  /**
   * @type {number}
   */
  this.bb_pos = 0;
};

/**
 * @param {number} i
 * @param {flatbuffers.ByteBuffer} bb
 * @returns {Flatbuffer.RTK.Poses}
 */
Flatbuffer.RTK.Poses.prototype.__init = function(i, bb) {
  this.bb_pos = i;
  this.bb = bb;
  return this;
};

/**
 * @param {flatbuffers.ByteBuffer} bb
 * @param {Flatbuffer.RTK.Poses=} obj
 * @returns {Flatbuffer.RTK.Poses}
 */
Flatbuffer.RTK.Poses.getRootAsPoses = function(bb, obj) {
  return (obj || new Flatbuffer.RTK.Poses).__init(bb.readInt32(bb.position()) + bb.position(), bb);
};

/**
 * @param {number} index
 * @param {Flatbuffer.RTK.Pose=} obj
 * @returns {Flatbuffer.RTK.Pose}
 */
Flatbuffer.RTK.Poses.prototype.poses = function(index, obj) {
  var offset = this.bb.__offset(this.bb_pos, 4);
  return offset ? (obj || new Flatbuffer.RTK.Pose).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
};

/**
 * @returns {number}
 */
Flatbuffer.RTK.Poses.prototype.posesLength = function() {
  var offset = this.bb.__offset(this.bb_pos, 4);
  return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
};

/**
 * @param {flatbuffers.Builder} builder
 */
Flatbuffer.RTK.Poses.startPoses = function(builder) {
  builder.startObject(1);
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {flatbuffers.Offset} posesOffset
 */
Flatbuffer.RTK.Poses.addPoses = function(builder, posesOffset) {
  builder.addFieldOffset(0, posesOffset, 0);
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {Array.<flatbuffers.Offset>} data
 * @returns {flatbuffers.Offset}
 */
Flatbuffer.RTK.Poses.createPosesVector = function(builder, data) {
  builder.startVector(4, data.length, 4);
  for (var i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]);
  }
  return builder.endVector();
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {number} numElems
 */
Flatbuffer.RTK.Poses.startPosesVector = function(builder, numElems) {
  builder.startVector(4, numElems, 4);
};

/**
 * @param {flatbuffers.Builder} builder
 * @returns {flatbuffers.Offset}
 */
Flatbuffer.RTK.Poses.endPoses = function(builder) {
  var offset = builder.endObject();
  return offset;
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {flatbuffers.Offset} offset
 */
Flatbuffer.RTK.Poses.finishPosesBuffer = function(builder, offset) {
  builder.finish(offset);
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {flatbuffers.Offset} posesOffset
 * @returns {flatbuffers.Offset}
 */
Flatbuffer.RTK.Poses.createPoses = function(builder, posesOffset) {
  Flatbuffer.RTK.Poses.startPoses(builder);
  Flatbuffer.RTK.Poses.addPoses(builder, posesOffset);
  return Flatbuffer.RTK.Poses.endPoses(builder);
}

/**
 * @constructor
 */
Flatbuffer.RTK.FullPose = function() {
  /**
   * @type {flatbuffers.ByteBuffer}
   */
  this.bb = null;

  /**
   * @type {number}
   */
  this.bb_pos = 0;
};

/**
 * @param {number} i
 * @param {flatbuffers.ByteBuffer} bb
 * @returns {Flatbuffer.RTK.FullPose}
 */
Flatbuffer.RTK.FullPose.prototype.__init = function(i, bb) {
  this.bb_pos = i;
  this.bb = bb;
  return this;
};

/**
 * @param {flatbuffers.ByteBuffer} bb
 * @param {Flatbuffer.RTK.FullPose=} obj
 * @returns {Flatbuffer.RTK.FullPose}
 */
Flatbuffer.RTK.FullPose.getRootAsFullPose = function(bb, obj) {
  return (obj || new Flatbuffer.RTK.FullPose).__init(bb.readInt32(bb.position()) + bb.position(), bb);
};

/**
 * @param {Flatbuffer.RTK.Pose=} obj
 * @returns {Flatbuffer.RTK.Pose|null}
 */
Flatbuffer.RTK.FullPose.prototype.pose = function(obj) {
  var offset = this.bb.__offset(this.bb_pos, 4);
  return offset ? (obj || new Flatbuffer.RTK.Pose).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
};

/**
 * @param {flatbuffers.Builder} builder
 */
Flatbuffer.RTK.FullPose.startFullPose = function(builder) {
  builder.startObject(1);
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {flatbuffers.Offset} poseOffset
 */
Flatbuffer.RTK.FullPose.addPose = function(builder, poseOffset) {
  builder.addFieldOffset(0, poseOffset, 0);
};

/**
 * @param {flatbuffers.Builder} builder
 * @returns {flatbuffers.Offset}
 */
Flatbuffer.RTK.FullPose.endFullPose = function(builder) {
  var offset = builder.endObject();
  return offset;
};

/**
 * @param {flatbuffers.Builder} builder
 * @param {flatbuffers.Offset} poseOffset
 * @returns {flatbuffers.Offset}
 */
Flatbuffer.RTK.FullPose.createFullPose = function(builder, poseOffset) {
  Flatbuffer.RTK.FullPose.startFullPose(builder);
  Flatbuffer.RTK.FullPose.addPose(builder, poseOffset);
  return Flatbuffer.RTK.FullPose.endFullPose(builder);
}

// Exports for ECMAScript6 Modules
export {Flatbuffer};