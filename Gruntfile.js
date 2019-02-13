module.exports = function(grunt) {
    'use strict';

    var pkg = grunt.file.readJSON('package.json');
	var parse = require('gitignore-globs');
	var ga = require('gitattributes-globs');
	var ignored_gitignore = parse('.gitignore', { negate: true } ).map(function(value) {
		return value.replace(/^!\//,'!');
	});
    var ignored_gitattributes = ga( '.gitattributes', { negate: true } ).map(function(value) {
		return value.replace(/^!\//,'!');
    });
	var config = {};

    config.pkg = pkg;

	config.clean = {
		main: [
			'<%= wp_deploy.deploy.options.build_dir %>'
		]
	};

	config.copy = {
		main: {
			src: [
				'**',
				'!.*',
				'!.git/**',
				'!<%= wp_deploy.deploy.options.assets_dir %>/**',
				'!<%= wp_deploy.deploy.options.build_dir %>/**',
				'!readme.md',
				ignored_gitignore,
				ignored_gitattributes
			],
			dest: '<%= wp_deploy.deploy.options.build_dir %>/'
		}
	};

	config.gitstatus = {
		require_clean: {
			options: {
				callback: function( result ) {
					result.forEach(function(status){
						if ( 'M' === status.code[1] ) {
							grunt.fail.fatal('Git working directory not clean.');
						}
					});
				}
			}
		}
	};

	config.version = {
		main: {
			options: {
				prefix: 'Version:[\\s]+'
			},
			src: [
				'<%= pkg.name %>.php'
			]
		},
		readme: {
			options: {
				prefix: 'Stable tag:[\\s]+'
			},
			src: [
				'readme.txt'
			]
		},
		pkg: {
			src: [
				'package.json'
			]
		}
	};

	config.wp_deploy = {
		deploy: {
			options: {
				svn_user: 'johnbillion',
				plugin_slug: '<%= pkg.name %>',
				build_dir: 'build',
				assets_dir: 'assets-wp-repo'
			}
		}
	};

    config.wp_readme_to_markdown = {
		convert: {
			files: {
				'readme.md': 'readme.txt'
			},
			options: {
				'screenshot_url': 'assets-wp-repo/{screenshot}.png',
				'post_convert': function( readme ) {
					// Banner
					if ( grunt.file.exists( 'assets-wp-repo/banner-1544x500.png' ) ) {
						readme = readme.replace( '**Contributors:**', '![Banner Image](assets-wp-repo/banner-1544x500.png)\n\n**Contributors:**' );
					}

					// Badges
					readme = grunt.template.process( pkg.readme_badges.join( '\n' ) ) + '\n\n' + readme;

					return readme;
				}
			}
		}
	};

	config.gitcommit = {
		version: {
			options: {
				message: 'Version <%= grunt.file.readJSON("package.json").version %>'
			},
			files: {
				src: [
					Object.keys(config.version).map(function(key){
						return config.version[ key ].src;
					}),
					'readme.md'
				]
			}
		}
	};

	config.gittag = {
		version: {
			options: {
				tag: '<%= grunt.file.readJSON("package.json").version %>'
			}
		}
	};

    require('load-grunt-tasks')(grunt);

	grunt.initConfig(config);

	grunt.registerTask('bump', function(version) {
		if ( ! version ) {
			grunt.fail.fatal( 'No version specified. Usage: bump:major, bump:minor, bump:patch, bump:x.y.z' );
		}

		grunt.task.run([
			'gitstatus:require_clean',
			'version::' + version,
			'wp_readme_to_markdown',
			'gitcommit:version',
			'gittag:version'
		]);
	});

	grunt.registerTask('build', [
		'clean',
		'copy'
	]);

	grunt.registerTask('deploy', [
		'build',
		'wp_deploy'
	]);

};