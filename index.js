var path = require('path'),
	fs = require('fs'),
	glob = require('glob'),
	extend = require('extend');

function LazyRest(app, opts) {

	function isFunction(obj) {
		return !!(obj && obj.constructor && obj.call && obj.apply);
	}

	opts = extend(true, {
		methods: [
			'get',
			'head',
			'post',
			'put',
			'delete',
			'trace',
			'options',
			'connect',
			'patch'
		],
		path: './api'
	}, opts || {});

	opts.path = path.join(process.cwd(), path.normalize(opts.path));

	glob('**/@(' + opts.methods.join('|') + ').js', {
		nocase: true,
		cwd: opts.path
	},
	function(err, filePaths) {
		if (!err) {
			filePaths.forEach(function(filePath) {
				var fullPath = path.join(opts.path, filePath),
					m = ('/' + filePath).match(/^(.*\/)(.+)\.js$/);

				if (m) {
					if (m[1] !== '/') {
						m[1] = m[1].replace(/\/$/, '');
					}
					if (isFunction(app[m[2]])) {
						app[(m[2].toLowerCase())](m[1], require(fullPath)(app));
					} else {
						console.error(m[2] + ' is not a valid method of an Express app.');
					}
				} else {
					console.error('An error occurred while attempting to load ' + fullPath);
				}

			});
		} else {
			console.error('An error occurred while attempting to load ' + opts.api);
		}
	});
}

module.exports = LazyRest;