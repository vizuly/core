/*
 Copyright (c) 2016, BrightPoint Consulting, Inc.
 
 MIT LICENSE:
 
 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 documentation files (the 'Software'), to deal in the Software without restriction, including without limitation
 the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
 and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 
 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
 Software.
 
 THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 IN THE SOFTWARE.
 */

// @version 2.2.78


/**
 * The `vizuly2.core.component` is a factory method used to create vizuly components. All vizuly components use this factory method
 * to instantiate their public properties, styles, and events.  This factory performs the following functions.  All methods described below
 * are common across all vizuly components.
 *
 *   - Appends a DIV container to the parent DOM object being passed in and assigns it an unique runtime id.   This DIV container is accessed
 *   via the `viz.selection()` function.
 *
 *   - Binds all public property accessors to the components scope variable.  This properties can then be accessed internally by the component via
 *   `scope.myProperty`.   External access to these properties can be accessed via `viz.myProp()` to retreive the current value, and `viz.myProp(newValue)`
 *   to set a new value.   These properties can be either static values or dynamic functions.
 *
 *   - Creates dynamic functors and accessors for all styles.  Styles can be accessed external to the component
 *   via the `viz.style(myStyleName)` call or set via the `viz.style(myStyleName, myStyleValue)`.  Runtime styles can be cleared
 *   by passing a null value via `viz.style(myStyleName, null)`
 *
 *
 *   - Creates universal component lifecycle events (`initialized, validated, measured, updated, styled`)
 *
 *   - Creates a event dispatcher for all custom events being passed in.
 *
 *   - Creates change events and associated watchers for all public component properties
 *
 * @class
 * @param {DOMElement} parent - Container element that will render the component.
 * @param {Object} scope - The scope variable to be referenced by the component.
 * @param {Object} styles - The style object collection for the component
 * @param {Array} events - An array of component specific event names to be used by the component.
 *
 */
vizuly2.core.component = function (parent, scope) {
	
	var d3 = vizuly2.d3;
	
	var resizeTimer;
	var resizeDelay = 50;
	var parentBounds;
	
	if (typeof parent === 'string') {
		parent = d3.select(parent).node();
	}
	
	//We set the primary scope properties
	scope.parent = parent;
	scope.id = vizuly2.util.guid();
	scope.selection = d3.select(parent).append('div').attr('id', 'div_' + scope.id).style('width', '100%').style('height', '100%');
	scope.initialized = false;
	scope.size = null;
	
	var _defaultStyles = scope.styles, _styles = {};
	
	var nullableProps = ['dataTipRenderer'];
	
	// Adding our dispatch event that the viz will use for any attached callbacks.
	/** @lends vizuly2.core.component.events */
	var args = [
		/**
		 * Fires after component `initialize()` method has been called.
		 * @event vizuly2.core.component.initialized
		 * @type {VizulyEvent}
		 * @param {VizulyComponent} - viz - The viz that emited the event
		 */
	 'initialized',
		/**
		 * Fires after component `validate()` method has been called.
		 * @event vizuly2.core.component.validated
		 * @type {VizulyEvent}
		 * @param {VizulyComponent} - viz - The viz that emited the event
		 */
	 'validated',
		/**
		 * Fires after component `measure()` method has been called
		 * @event vizuly2.core.component.measured
		 * @type {VizulyEvent}
		 * @param {VizulyComponent} - viz - The viz that emited the event
		 */
	 'measured',
		/**
		 * Fires after component `update()` method has been called.
		 * @event vizuly2.core.component.updated
		 * @type {VizulyEvent}
		 * @param {VizulyComponent} - viz - The viz that emited the event
		 */
	 'updated',
		/**
		 * Fires after component `applyStyles()` method has been called.
		 * @event vizuly2.core.component.styled
		 * @type {VizulyEvent}
		 * @param {VizulyComponent} - viz - The viz that emited the event
		 */
		'styled'
	];
	

	// Property (from the 'props' array) '_change' events
	// This way anyone can listen for any specific (like data) viz property changes
	Object.getOwnPropertyNames(scope.properties).forEach(function (val, idx, array) {
		args.push(val + '_change');
	});
	
	// Add any custom events that the component may need.
	if (scope.events && scope.events.length > 0) {
		scope.events.forEach(function (d) {
			args.push(d);
		})
	}
	
	// Sets up all of our dispatch calls by attaching a vizuly2.d3.dispatch to the scope variable
	// For more info on dispatch, see here: https://github.com/mbostock/vizuly2.d3.wiki/Internals#vizuly2.d3.dispatch
	scope.dispatch = d3.dispatch.apply(this, args);
	
	//For each property in our 'props' array create a callback if the property value has changed.
	function setProps(component, scope, props) {
		Object.getOwnPropertyNames(props).forEach(function (val, idx, array) {
			if (typeof (scope[val]) == 'undefined') {
				scope[val] = props[val];
				component[val] = function (_) {
					if (!arguments.length) {
						return scope[val];
					}
					else {
						var oldVal = scope[val];
						scope[val] = _;
						if (scope[val] !== oldVal) {
							scope.dispatch.apply(val + '_change', this, [scope[val], oldVal]);  //Broadcast for public events
						}
					}
					return component;
				}
			}
		});
		
	};
	

	function onResize() {
		if (resizeTimer !=null) return;
		parentBounds = parentBounds || scope.selection.node().getBoundingClientRect();
		resizeTimer = setTimeout(function () {
			var bounds = scope.selection.node().getBoundingClientRect();
			if (component.update && (bounds.width != parentBounds.width || bounds.height != parentBounds.height)) {
				if (component.duration) {
					var duration = component.duration();
					component.duration(0).update().duration(duration)
				}
				else {
					component.update();
				}
				scope.dispatch
			}
			parentBounds = bounds;
			resizeTimer = null;
		}, resizeDelay)
	}

	var component = function () {
		setProps(component, scope, scope.properties);
		return component;
	};
	
	//Attach our component to the disptach object so we have it later on any event
	scope.dispatch.component = component();
	
	/**
	 *  Returns a unique identifier that has been auto generated at instantiation.   This ensures that multiple components of the same type
	 *  will have a unique DOM id
	 *  @memberOf vizuly2.core.component
	 *  @alias id
	 *  @example
	 *
	 *  // Returns the viz parent DIV element
	 *  document.getElementById(viz.id());
	 *
	 *  // Alternatively you can also use
	 *  viz.selection();
	 *
	 */
	component.id = function () {
		return scope.id;
	}
	
	/**
	 *  Returns a d3.selection of the component's DIV container that was created at component instantiation.
	 *  @memberOf vizuly2.core.component
	 *  @alias selection
	 */
	component.selection = function () {
		return scope.selection;
	};
	
	/**
	 *  Used to set, retrieve and clear runtime styles
	 *  @memberOf vizuly2.core.component
	 *  @alias style
	 *  @param {String} style - Name of the style
	 *  @param {Function} value - Value of the style
	 *  @example
	 *  // Retrieves a current style value (either runtime style of default style)
	 *  viz.style('myStyleName');
	 *
	 *  // Sets a new style value
	 *  viz.style('myStyleName', myStyleValue);
	 *
	 *  // Clears a runtime style (default styles will still be active)
	 *  viz.style('myStyleName', null);
	 */
	component.style = function (style, value) {
		if (arguments.length < 2) {
			if (_styles[style]) {
				return _styles[style]
			}
			else if (scope.styles[style]) {
				return scope.styles[style]
			}
			else {
				return null;
			}
		}
		_styles[style] = value;
		return component;
	}
	
	/**
	 *  Used to apply a collection of styles at one time
	 *  @memberOf vizuly2.core.component
	 *  @alias applyStyles
	 *  @param {String} styles - A style collection object
	 *  @example
	 *  var blueStyles =
	 *   {
	 *     'background-color-top': '#021F51',
	 *     'background-color-bottom': '#039FDB',
	 *     'value-label-color': '#FFF',
	 *     'x-axis-label-color': '#FFF',
	 *     'y-axis-label-color': '#FFF',
	 *   	 'bar-fill': '#02C3FF',
	 *   	 'axis-stroke': '#FFF',
	 *   	 'bar-radius': 0
	 *   }
	 *
	 *  viz.applyStyles(blueStyles);
	 */
	component.applyStyles = function (styles) {
		Object.keys(scope.styles).forEach(function (key) {
			component.style(key, styles[key])
		})
		return component;
	}
	
	/**
	 *  Used to clear all runtime styles and set all styles back to components default style settings.
	 *  @memberOf vizuly2.core.component
	 *  @alias clearStyles
	 */
	component.clearStyles = function () {
		Object.keys(scope.styles).forEach(function (key) {
			component.style(key, null)
		})
		return component;
	}
	
	/**
	 *  Used by the component at runtime to get the current value for a given style.   This can be either the default style
	 *  or runtime applied styles.
	 *
	 *  The value returned could be either a static value, or a result of a dynamic function that calculates the style at runtime.
	 *  @memberOf vizuly2.core.component
	 *  @alias getStyle
	 *  @param {String} style - Name of the style
	 *  @param {Array} args - Any arguments that need to be passed to the style functor
	 *  @example
	 *
	 *  // This sets all '.vz-bar' elements with a fill matching the 'bar-fill-color' style
	 *  selection
	 *  .selectAll('.vz-bar')
	 *  .style('fill', function (d,i) { return viz.getStyle('bar-fill-color',arguments); });
	 *
	 */
	component.getStyle = function (style, args) {
		if (_styles[style] != null) {
			return typeof _styles[style] === 'function' ? _styles[style].apply(component, args) : _styles[style];
		}
		else if (scope.styles[style] != null) {
			return typeof scope.styles[style] === 'function' ? scope.styles[style].apply(component, args) : scope.styles[style];
		}
		else {
			return null
		}
	}
	
	/**
	 *  Used to set listeners to component events.  Passing a null listener value will clear the event listener
	 *
	 *  *Note*: You can use event namespaces (D3.dispatch) to set multiple listeners for a single event
	 *
	 *  @memberOf vizuly2.core.component
	 *  @alias on
	 *  @param {String} event of event to be listened for
	 *  @param {Function} listener function used to capture emited event
	 *  @example
	 *
	 *  // Sets a listener to the update event
	 *  viz.on('update', myListenerFunction);
	 *
	 *  // Sets two namespace specific listener to a mouseover event
	 *  viz.on('mouseover.module_1', myModule1ListenerFunction);
	 *  viz.on('mouseover.module_2', myModule2ListenerFunction);
	 *
	 *  // Clears the event listener for the update event
	 *  viz.on('update', null);
	 */
	component.on = function (event, listener) {
		scope.dispatch.on(event, listener);
		return component;
	};
	
	/**
	 *  Used to capture any component property change events.
	 *  @memberOf vizuly2.core.component
	 *  @alias onChange
	 *  @param {String} Property name of change event to be listened for
	 *  @param {Function} Listener function used to capture emited event
	 *  @example
	 *
	 *  // Listens for any changes to the data property
	 *  viz.onChange('data', myListenerFunction);
	 */
	component.onChange = function (event, listener) {
		var namespaceEvent = event.split('.');
		var eventName = namespaceEvent[0] + '_change' + (namespaceEvent.length > 1 ? '.' + namespaceEvent[1] : '');
		scope.dispatch.on(eventName, listener);
		return component;
	};
	
	/**
	 *  Validates that all public properties (passed in *props* param) have non null values.
	 *
	 *  This method is usually called internally from a vizuly2.core.component measure function.
	 *  @memberOf vizuly2.core.component
	 *  @alias validate
	 */
	component.validate = function () {
		if (scope.initialized == false && scope.initialize) {
			scope.initialize();
			scope.initialized = true;
		}
		
		if (invalid) return;
		
		var invalid = []
		Object.getOwnPropertyNames(scope.properties).forEach(function (val) {
			if (!scope[val] && Number(scope[val] != 0) && nullableProps.indexOf(val) < 0) {
				invalid.push(val);
			}
		})
		if (invalid.length > 0) {
			throw new Error('vizuly2.util.component.validate(): ' + invalid.concat() + ' need to be declared');
		}
		
		//We disptach a 'validate' event so we can hook in callbacks before other work is done.
		scope.dispatch.apply('validated', this);
	}
	
	/**
	 *  Used to set listeners to multiple events at once.
	 *
	 *  This method is usually called internally from a vizuly2.core.component to set listeners for style specific methods.
	 *  @memberOf vizuly2.core.component
	 *  @alias applyCallbacks
	 *  @example
	 *  var stylesCallbacks = [
	 *    {on: 'updated.styles', callback: applyStyles},
	 *    {on: 'mouseover.styles', callback: styles_onMouseOver},
	 *    {on: 'mouseout.styles', callback: styles_onMouseOut}
	 *  ];
	 *
	 *  viz.applyCallbacks(stylesCallbacks);
	 */
	component.applyCallbacks = function (callbacks) {
		callbacks.forEach(function (d) {
			scope.dispatch.on(d.on, d.callback);
		});
	}
	
	/**
	 *  Used internally by components to display a data tip.  This is usually called on a `mouseover` event.
	 *
	 *  @memberOf vizuly2.core.component
	 *  @alias showDataTip
	 *  @param {DOMElement} e - The target element that triggered the call
	 *  @param {Object} d - The datum associated with the triggering event
	 *  @param {Number} i - The index associated with the datum
	 *  @param {Number} j - Optional - The series (if one exists) asscoiated with the datum
	 */
	component.showDataTip = function (e, d, i, j) {
		
		if (!scope.dataTipRenderer || scope.dataTipRenderer == null) return;
		
		var bounds = e.getBoundingClientRect();
		
		var w = 150;
		var h = 70;
		
		var dataTip = d3.select('body')
		 .append('div')
		 .attr('class','vz-data-tip')
		 .style('display','none');
		
		var x = bounds.left;
		var y = bounds.top + window.pageYOffset;
		
		var tipPosition = scope.dataTipRenderer.apply(component,[dataTip, e, d, i, j, x, y]);
		
		if (tipPosition == false) return;
		
		if (tipPosition && typeof tipPosition === 'object' && tipPosition.constructor === Array) {
			x = tipPosition[0];
			y = tipPosition[1];
		}
	
		var tipBounds = dataTip.nodes()[0].getBoundingClientRect();
		w = tipBounds.width;
		h = tipBounds.height;
		
		dataTip
		 .style('left', (x) ? x + 'px' : (bounds.left + bounds.width/2 - w/2) + 'px')
		 .style('top', (y) ? y + 'px' : (bounds.top + window.pageYOffset - h - 10) + 'px')
		
		dataTip.style('display', 'block');
		
	}
	
	/**
	 *  Used by internally components to remove a data tip.  This is usually called on a `mouseout` event.
	 *
	 *  @memberOf vizuly2.core.component
	 *  @alias removeDataTip
	 */
	component.removeDataTip = function() {
		d3.select('.vz-data-tip').remove();
	}
	
	/**
	 *  Returns the parent DOM element the component appended to.
	 *
	 *  @memberOf vizuly2.core.component
	 *  @alias parent
	 */
	component.parent = function () {
		return scope.parent;
	}
	
	/**
	 *  Returns a size object based on the components internal measure function with absolute pixel values.
	 *  This is helpful for applying styles/decorations after the component has rendered and you want to know
	 *  specific measurements of the component.
	 *
	 *  @memberOf vizuly2.core.component
	 *  @alias size
	 *
	 * @example
	 * size.top
	 * size.left
	 * size.height
	 * size.width
	 */
	component.size = function () {
		return scope.size;
	}
	
	/**
	 *  This function can be used to dynamically update a component when the window is resized.
	 *  Typically this is used when the `viz.size()` or `viz.width()` is set to a percentage.
	 *  A default delay of 50 milliseconds is used to buffer resize events and prevent the component from repeatedly updating
	 *  while the user is resizing the window.  This delay can be modified as seen in the `delay` parameter below.
	 *
	 *  @memberOf vizuly2.core.component
	 *  @alias updateOnResize
	 *  @param {Boolean} resize - A `true` value will call viz.update() when the user resizes the window.  A `false` value will cancel the resize.
	 *  @param {Number} delay - Optional.  The time in milliseconds to wait between resize events before calling `viz.update()`
	 *
	 *  @example
	 *  // Sets the width of the component to 100% and uses the resizeOnUpdate with a 100ms delay buffer.
	 *  viz.width('100%').updateOnResize(true, 100);
	 */
	component.updateOnResize = function (resize, delay) {
		if (resize === true) {
			d3.select(window).on('resize.component_' + scope.id, onResize);
			if (delay) {
				resizeDelay = delay;
			}
		}
		else {
			d3.select(window).on('resize.component_' + scope.id, null)
			resizeDelay = 50;
		}
		return component;
	}
	
	
	/**
	 *  Removes the component from the DOM and removes all event listeners.
	 *  Typically this is called when a page programmer is removing the component from memory
	 *  and wants to free the component up for garbage collection by the browser.
	 *
	 *  @memberOf vizuly2.core.component
	 *  @alias destroy
	 */
	component.destroy = function () {
		scope.selection.remove();
		scope.selection = null;
		args.forEach(function (arg) {
			scope.dispatch.on(arg,null);
		});
		scope.dispatch=null;
		scope = null;
	}
	
	//Return our finished component.
	return scope.dispatch.component;
};