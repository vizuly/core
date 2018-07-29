//Legacy v3 code, some of these functions are more utilitarian than v4+

var d3v3 = {};

d3v3.layout = {};

d3v3.svg = {};

d3v3.functor = function (v) {
	return typeof v === "function" ? v : function () {
		return v;
	};
}

d3v3.merge = function (arrays) {
	var n = arrays.length,
	 m,
	 i = -1,
	 j = 0,
	 merged,
	 array;
	
	while (++i < n) j += arrays[i].length;
	merged = new Array(j);
	
	while (--n >= 0) {
		array = arrays[n];
		m = array.length;
		while (--m >= 0) {
			merged[--j] = array[m];
		}
	}
	
	return merged;
};


// Copies a variable number of methods from source to target.
d3v3.rebind = function (target, source) {
	var i = 1, n = arguments.length, method;
	while (++i < n) target[method = arguments[i]] = d3v3_rebind(target, source, source[method]);
	return target;
};

// Method is assumed to be a standard D3 getter-setter:
// If passed with no arguments, gets the value.
// If passed with arguments, sets the value and returns the target.
function d3v3_rebind(target, source, method) {
	return function () {
		var value = method.apply(source, arguments);
		return value === source ? target : value;
	};
}


d3v3.layout.hierarchy = function () {
	var sort = d3v3_layout_hierarchySort,
	 children = d3v3_layout_hierarchyChildren,
	 value = d3v3_layout_hierarchyValue;
	
	function hierarchy(root) {
		var stack = [root],
		 nodes = [],
		 node;
		
		root.depth = 0;
		
		while ((node = stack.pop()) != null) {
			nodes.push(node);
			if ((childs = children.call(hierarchy, node, node.depth)) && (n = childs.length)) {
				var n, childs, child;
				while (--n >= 0) {
					stack.push(child = childs[n]);
					child.parent = node;
					child.depth = node.depth + 1;
				}
				if (value) node.value = 0;
				node.children = childs;
			} else {
				if (value) node.value = +value.call(hierarchy, node, node.depth) || 0;
				delete node.children;
			}
		}
		
		d3v3_layout_hierarchyVisitAfter(root, function (node) {
			var childs, parent;
			if (sort && (childs = node.children)) childs.sort(sort);
			if (value && (parent = node.parent)) parent.value += node.value;
		});
		
		return nodes;
	}
	
	hierarchy.sort = function (x) {
		if (!arguments.length) return sort;
		sort = x;
		return hierarchy;
	};
	
	hierarchy.children = function (x) {
		if (!arguments.length) return children;
		children = x;
		return hierarchy;
	};
	
	hierarchy.value = function (x) {
		if (!arguments.length) return value;
		value = x;
		return hierarchy;
	};
	
	// Re-evaluates the `value` property for the specified hierarchy.
	hierarchy.revalue = function (root) {
		if (value) {
			d3v3_layout_hierarchyVisitBefore(root, function (node) {
				if (node.children) node.value = 0;
			});
			d3v3_layout_hierarchyVisitAfter(root, function (node) {
				var parent;
				if (!node.children) node.value = +value.call(hierarchy, node, node.depth) || 0;
				if (parent = node.parent) parent.value += node.value;
			});
		}
		return root;
	};
	
	return hierarchy;
};

// A method assignment helper for hierarchy subclasses.
function d3v3_layout_hierarchyRebind(object, hierarchy) {
	d3v3.rebind(object, hierarchy, "sort", "children", "value");
	
	// Add an alias for nodes and links, for convenience.
	object.nodes = object;
	object.links = d3v3_layout_hierarchyLinks;
	
	return object;
}

// Pre-order traversal.
function d3v3_layout_hierarchyVisitBefore(node, callback) {
	var nodes = [node];
	while ((node = nodes.pop()) != null) {
		callback(node);
		if ((children = node.children) && (n = children.length)) {
			var n, children;
			while (--n >= 0) nodes.push(children[n]);
		}
	}
}

// Post-order traversal.
function d3v3_layout_hierarchyVisitAfter(node, callback) {
	var nodes = [node], nodes2 = [];
	while ((node = nodes.pop()) != null) {
		nodes2.push(node);
		if ((children = node.children) && (n = children.length)) {
			var i = -1, n, children;
			while (++i < n) nodes.push(children[i]);
		}
	}
	while ((node = nodes2.pop()) != null) {
		callback(node);
	}
}

function d3v3_layout_hierarchyChildren(d) {
	return d.children;
}

function d3v3_layout_hierarchyValue(d) {
	return d.value;
}

function d3v3_layout_hierarchySort(a, b) {
	return b.value - a.value;
}

// Returns an array source+target objects for the specified nodes.
function d3v3_layout_hierarchyLinks(nodes) {
	return d3v3.merge(nodes.map(function (parent) {
		return (parent.children || []).map(function (child) {
			return {source: parent, target: child};
		});
	}));
}


d3v3.layout.pack = function () {
	var hierarchy = d3v3.layout.hierarchy().sort(d3v3_layout_packSort),
	 padding = 0,
	 size = [1, 1],
	 radius;
	
	function pack(d, i) {
		var nodes = hierarchy.call(this, d, i),
		 root = nodes[0],
		 w = size[0],
		 h = size[1],
		 r = radius == null ? Math.sqrt : typeof radius === "function" ? radius : function () {
			 return radius;
		 };
		
		// Recursively compute the layout.
		root.x = root.y = 0;
		d3v3_layout_hierarchyVisitAfter(root, function (d) {
			d.r = +r(d.value);
		});
		d3v3_layout_hierarchyVisitAfter(root, d3v3_layout_packSiblings);
		
		// When padding, recompute the layout using scaled padding.
		if (padding) {
			var dr = padding * (radius ? 1 : Math.max(2 * root.r / w, 2 * root.r / h)) / 2;
			d3v3_layout_hierarchyVisitAfter(root, function (d) {
				d.r += dr;
			});
			d3v3_layout_hierarchyVisitAfter(root, d3v3_layout_packSiblings);
			d3v3_layout_hierarchyVisitAfter(root, function (d) {
				d.r -= dr;
			});
		}
		
		// Translate and scale the layout to fit the requested size.
		d3v3_layout_packTransform(root, w / 2, h / 2, radius ? 1 : 1 / Math.max(2 * root.r / w, 2 * root.r / h));
		
		return nodes;
	}
	
	pack.size = function (_) {
		if (!arguments.length) return size;
		size = _;
		return pack;
	};
	
	pack.radius = function (_) {
		if (!arguments.length) return radius;
		radius = _ == null || typeof _ === "function" ? _ : +_;
		return pack;
	};
	
	pack.padding = function (_) {
		if (!arguments.length) return padding;
		padding = +_;
		return pack;
	};
	
	return d3v3_layout_hierarchyRebind(pack, hierarchy);
};

function d3v3_layout_packSort(a, b) {
	return a.value - b.value;
}

function d3v3_layout_packInsert(a, b) {
	var c = a._pack_next;
	a._pack_next = b;
	b._pack_prev = a;
	b._pack_next = c;
	c._pack_prev = b;
}

function d3v3_layout_packSplice(a, b) {
	a._pack_next = b;
	b._pack_prev = a;
}

function d3v3_layout_packIntersects(a, b) {
	var dx = b.x - a.x,
	 dy = b.y - a.y,
	 dr = a.r + b.r;
	return 0.999 * dr * dr > dx * dx + dy * dy; // relative error within epsilon
}

function d3v3_layout_packSiblings(node) {
	if (!(nodes = node.children) || !(n = nodes.length)) return;
	
	var nodes,
	 xMin = Infinity,
	 xMax = -Infinity,
	 yMin = Infinity,
	 yMax = -Infinity,
	 a, b, c, i, j, k, n;
	
	function bound(node) {
		xMin = Math.min(node.x - node.r, xMin);
		xMax = Math.max(node.x + node.r, xMax);
		yMin = Math.min(node.y - node.r, yMin);
		yMax = Math.max(node.y + node.r, yMax);
	}
	
	// Create node links.
	nodes.forEach(d3v3_layout_packLink);
	
	// Create first node.
	a = nodes[0];
	a.x = -a.r;
	a.y = 0;
	bound(a);
	
	// Create second node.
	if (n > 1) {
		b = nodes[1];
		b.x = b.r;
		b.y = 0;
		bound(b);
		
		// Create third node and build chain.
		if (n > 2) {
			c = nodes[2];
			d3v3_layout_packPlace(a, b, c);
			bound(c);
			d3v3_layout_packInsert(a, c);
			a._pack_prev = c;
			d3v3_layout_packInsert(c, b);
			b = a._pack_next;
			
			// Now iterate through the rest.
			for (i = 3; i < n; i++) {
				d3v3_layout_packPlace(a, b, c = nodes[i]);
				
				// Search for the closest intersection.
				var isect = 0, s1 = 1, s2 = 1;
				for (j = b._pack_next; j !== b; j = j._pack_next, s1++) {
					if (d3v3_layout_packIntersects(j, c)) {
						isect = 1;
						break;
					}
				}
				if (isect == 1) {
					for (k = a._pack_prev; k !== j._pack_prev; k = k._pack_prev, s2++) {
						if (d3v3_layout_packIntersects(k, c)) {
							break;
						}
					}
				}
				
				// Update node chain.
				if (isect) {
					if (s1 < s2 || (s1 == s2 && b.r < a.r)) d3v3_layout_packSplice(a, b = j);
					else d3v3_layout_packSplice(a = k, b);
					i--;
				} else {
					d3v3_layout_packInsert(a, c);
					b = c;
					bound(c);
				}
			}
		}
	}
	
	// Re-center the circles and compute the encompassing radius.
	var cx = (xMin + xMax) / 2,
	 cy = (yMin + yMax) / 2,
	 cr = 0;
	for (i = 0; i < n; i++) {
		c = nodes[i];
		c.x -= cx;
		c.y -= cy;
		cr = Math.max(cr, c.r + Math.sqrt(c.x * c.x + c.y * c.y));
	}
	node.r = cr;
	
	// Remove node links.
	nodes.forEach(d3v3_layout_packUnlink);
}

function d3v3_layout_packLink(node) {
	node._pack_next = node._pack_prev = node;
}

function d3v3_layout_packUnlink(node) {
	delete node._pack_next;
	delete node._pack_prev;
}

function d3v3_layout_packTransform(node, x, y, k) {
	var children = node.children;
	node.x = x += k * node.x;
	node.y = y += k * node.y;
	node.r *= k;
	if (children) {
		var i = -1, n = children.length;
		while (++i < n) d3v3_layout_packTransform(children[i], x, y, k);
	}
}

function d3v3_layout_packPlace(a, b, c) {
	var db = a.r + c.r,
	 dx = b.x - a.x,
	 dy = b.y - a.y;
	if (db && (dx || dy)) {
		var da = b.r + c.r,
		 dc = dx * dx + dy * dy;
		da *= da;
		db *= db;
		var x = 0.5 + (db - da) / (2 * dc),
		 y = Math.sqrt(Math.max(0, 2 * da * (db + dc) - (db -= dc) * db - da * da)) / (2 * dc);
		c.x = a.x + x * dx + y * dy;
		c.y = a.y + x * dy - y * dx;
	} else {
		c.x = a.x + db;
		c.y = a.y;
	}
}


d3v3.svg.diagonal = function () {
	var source = function (d) {
		 return d.source
	 },
	 target = function (d) {
		 return d.target
	 },
	 projection = function (d) {
		 return [d.x, d.y];
	 }
	
	function diagonal(d, i) {
		var p0 = source.call(this, d, i),
		 p3 = target.call(this, d, i),
		 m = (p0.y + p3.y) / 2,
		 p = [p0, {x: p0.x, y: m}, {x: p3.x, y: m}, p3];
		p = p.map(projection);
		return "M" + p[0] + "C" + p[1] + " " + p[2] + " " + p[3];
	}
	
	diagonal.source = function (x) {
		if (!arguments.length) return source;
		source = d3v3.functor(x);
		return diagonal;
	};
	
	diagonal.target = function (x) {
		if (!arguments.length) return target;
		target = d3v3.functor(x);
		return diagonal;
	};
	
	diagonal.projection = function (x) {
		if (!arguments.length) return projection;
		projection = x;
		return diagonal;
	};
	
	return diagonal;
};

d3v3.svg.diagonal.radial = function () {
	var diagonal = d3v3.svg.diagonal(),
	 projection = function (d) {
		 return [d.x, d.y];
	 },
	 projection_ = diagonal.projection;
	
	diagonal.projection = function (x) {
		return arguments.length ?
		 projection_(function (x) {
		 	projection = x;
			 return function () {
				 var d = projection.apply(this, arguments),
					r = d[0],
					a = d[1] - halfπ;
				 return [r * Math.cos(a), r * Math.sin(a)];
			 };
		 })
		 : projection;
	};
	
	return diagonal;
};

vizuly2.d3v3 = d3v3;

