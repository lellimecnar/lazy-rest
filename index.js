var $path = require('path'),
	$glob = require('glob'),
	$extend = require('extend'),
	$case = require('change-case'),
	$ext = require('replace-ext'),
	methods = [
		'checkout',
		'connect',
		'copy',
		'delete',
		'get',
		'head',
		'lock',
		'merge',
		'mkactivity',
		'mkcol',
		'move',
		'm-search',
		'notify',
		'options',
		'patch',
		'post',
		'propfind',
		'proppatch',
		'purge',
		'put',
		'report',
		'search',
		'subscribe',
		'trace',
		'unlock',
		'unsubscribe'
	];

function isFn(obj) {
	return !!(obj && obj.constructor && obj.call && obj.apply);
}

exports = module.exports = function(app, db) {
	if (!app) {
		throw new TypeError('Express app required');
	}

	db = db || null;

	return function(apiRoot, opts) {
		apiRoot = apiRoot || '/api';
		opts = opts || {};

		if (typeof apiRoot !== 'string') {
			opts = apiRoot;
			apiRoot = '/api';
		}

		apiRoot = '/' + apiRoot.replace(/^\/|\/$/g, '');

		opts = $extend(true, {
			root: './api',
			dbRoot: './db',
			paramPrefix: ':'
		}, opts);

		opts.root = $path.join(process.cwd(), $path.normalize(opts.root));
		opts.paramPrefix = opts.paramPrefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
		opts.paramRegex = new RegExp(opts.paramPrefix, 'g');

		$glob('**/@(' + methods.join('|') + ').js', {
			nocase: true,
			cwd: opts.root
		}, function(err, files) {
			if (!err) {
				files.forEach(function(file) {
					var path = $path.join(opts.root, file),
						m = ('/' + file).match(/^(.*\/)(.+)\.js$/);

					if (m) {
						route = $path.join(apiRoot, m[1]);
						method = m[2].toLowerCase();

						if (route !== '/') {
							route = route.replace(/\/$/, '');
						}

						if (isFn(app[method])) {
							if (opts.paramPrefix !== ':') {
								route = route.replace(opts.paramRegex, ':');
							}
							app[method](route, require(path));
						}
					}
				});
			}
		});

		if (db && opts.dbRoot) {
			opts.dbRoot = $path.join(process.cwd(), $path.normalize(opts.dbRoot));

			app.db = db;

			$glob('**/schema.js', {
				nocase: true,
				cwd: opts.dbRoot
			}, function(err, files) {
				if (!err) {
					files.forEach(function(file) {
						var name = $case.pascal($path.dirname(file)),
							path = $path.join(opts.dbRoot, file),
							schema = new db.Schema(require(path));

						db.model(name, schema);
					});
				}
			});

			$glob('**/params/*.js', {
				nocase: true,
				cwd: opts.dbRoot
			}, function(err, files) {
				if (!err) {
					files.forEach(function(file) {
						var name = $case.pascal($path.dirname($path.dirname(file))),
							path = $path.join(opts.dbRoot, file),
							key = $ext($path.basename(file), '');

						app.param(key, function(req, res, next, val) {
							var model = db.model(name);
							require(path)(req, res, next, val, model);
						});
					});
				}
			});
		}

		return function(req, res, next) {
			// For possible future use...
			next();
		};
	};
};