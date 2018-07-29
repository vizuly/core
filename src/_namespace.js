/*
 Copyright (c) 2016, BrightPoint Consulting, Inc.

 MIT LICENSE:

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
 and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 IN THE SOFTWARE.
 */

// @version 2.1.66

// This contains all vizuly2.namespaces and enumerators.

/**
 * @namespace vizuly
 */
var vizuly2 = {};

vizuly2.d3 =  window.d3v4 || window.d3;

if (!vizuly2.d3) {
	console.log('WARNING - No D3 library found for vizuly2!  Please load D3 library first.')
}
else {
	if (Number(vizuly2.d3.version.substr(0,1)) < 4) {
		console.log('WARNING - Your D3 Library v' + vizuly2.d3.version + ' is not compatible with this version of Vizuly.   Please use D3 v4.0.0 or higher.')
	}
}

/**
 * @namespace vizuly2.core
 */
vizuly2.core = {}

vizuly2.viz = {};

// Various layout enumerations implement by vizuly2.core.components
/**
 * @namespace vizuly2.viz
 */
vizuly2.viz.layout = {};

vizuly2.viz.layout.CLUSTERED = "CLUSTERED";
vizuly2.viz.layout.STACKED = "STACKED";
vizuly2.viz.layout.OVERLAP = "OVERLAP";
vizuly2.viz.layout.STREAM = "STREAM";

/**
 * @namespace vizuly2.svg
 */
vizuly2.svg = {};

vizuly2.ui = {};

vizuly2.assets = {};


