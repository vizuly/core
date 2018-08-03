module.exports = function (grunt) {
	
	var coreExportsHeader = "(function (global, factory) { " +
			" typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) : " +
			" typeof define === 'function' && define.amd ? define(['exports'], factory) : " +
			"	(factory((global.vizuly2 = global.vizuly2 || {}))); " +
		  " } (this, (function (exports) { 'use strict';";
	
	var coreExportsFooter = "\n Object.keys(vizuly2).forEach(function (key) { " +
	    "exports[key] = vizuly2[key]" +
	    "});\n" +
	    " Object.defineProperty(exports, '__esModule', { value: true });" +
			"})));";
	
		
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		exec: {
			version_bump_patch: {
				command: "grunt version:project:patch"
			},
			version_bump_minor: {
				command: "grunt version:project:minor"
			}
		},
		version: {
			all: {
				options: {
					prefix: '@version\\s*'
				},
				src: ['test/*.js','src/**/*.js']
			},
			project: {
				src: ['package.json']
			}
			// Bump version
			// $ grunt version:project:patch
		},
		copy: {
			site_lib: {
				expand: true,
				cwd: 'dist/',
				src: ['**'],
				dest: '../dist/lib/'
			},
			viz_lib: {
				expand: true,
				cwd: 'dist/',
				src: ['**'],
				dest: '../viz/lib/'
			},
			viz_commercial_lib: {
				expand: true,
				cwd: 'dist/',
				src: ['**'],
				dest: '../viz-commercial/lib/'
			}
		},
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n',
				mangle: {
					reserved: ['vizuly2', 'd3', 'd3v3']
				},
				toplevel: true
			},
			
		}
	});
	
	grunt.loadNpmTasks('grunt-exec');
	grunt.loadNpmTasks('grunt-version');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-concat');
	
	grunt.config(['uglify', 'viz_core_min'], {
		options: {
			banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n' + coreExportsHeader,
			footer: coreExportsFooter,
			mangle: {
				reserved: ['vizuly2', 'd3']
			},
			beautify: false,
			toplevel: true
		},
		files: {
			'dist/vizuly2_core.min.js': ['src/*.js', 'src/svg/*.js', 'lib/d3v3_LegacyFunctions.js']
		}
	})
	
	
	// grunt.config(['uglify', 'viz_core'], {
	// 	options: {
	// 		banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n' + coreExportsHeader,
	// 		footer: coreExportsFooter,
	// 		mangle: false,
	// 		beautify: true,
	// 		toplevel: true
	// 	},
	// 	files: {
	// 		'lib/vizuly2_core.js': ['src/*.js', 'src/svg/*.js']
	// 	}
	// })
	
	grunt.registerTask('viz_core', ['exec:version_bump_patch', 'version', 'uglify:viz_core_min','copy:site_lib', 'copy:viz_lib', 'copy:viz_commercial_lib']);
	
	
};