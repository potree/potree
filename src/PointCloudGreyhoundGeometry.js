Potree.PointCloudGreyhoundGeometry = function(){
	this.spacing = 0;
	this.boundingBox = null;
	this.root = null;
	this.numNodesLoading = 0;
	this.nodes = null;
	this.pointAttributes = {};
	this.hierarchyStepSize = -1;
	this.loader = null;
    this.schema = null;

	this.baseDepth = null;
	this.offset = null;
	this.projection = null;
	this.tightBoundingBox = null;

	this.boundingSphere = null;
	this.tightBoundingSphere = null;

	//the serverURL will contain the base URL of the greyhound server. f.e. http://dev.greyhound.io/resource/autzen/
	this.serverURL = null;
};
