var $path = require('path'),
	$glob = require('glob'),
	$extend = require('extend'),
	$case = require('change-case'),
	$ext = require('replace-ext'),
	$diff = require('object-diff'),
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

		$glob.sync('**/@(' + methods.join('|') + ').js', {
			nocase: true,
			cwd: opts.root
		}).forEach(function(file) {
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

		if (db && opts.dbRoot) {
			var routes = [];
			app._router.stack
				.forEach(function(route) {
					if (route.route) {
						Object.keys(route.route.methods).forEach(function(method) {
							if (route.route.methods[method]) {
								routes.push($path.join(route.route.path, method));
							}
						});
					}
				});

			opts.dbRoot = $path.join(process.cwd(), $path.normalize(opts.dbRoot));

			app.db = db;

			$glob('**/schema.js', {
				nocase: true,
				cwd: opts.dbRoot
			}, function(err, files) {
				if (!err) {
					function modelCallback(res, next) {
						return function(err, result) {
							if (!err) {
								res.json(result);
								next();
							} else {
								res.status(500).send(err);
							}
						}
					}
					files.forEach(function(file) {
						var name = $case.pascal($path.dirname(file)),
							path = $path.join(opts.dbRoot, file),
							schema = new db.Schema(require(path)),
							model = db.model(name, schema),
							uri = $path.join(apiRoot, model.collection.name),
							paramName = name.toLowerCase() + 'Id',
							paramKey = ':' + paramName;

						if (routes.indexOf($path.join(uri, 'get')) < 0) {
							app.get(uri, function(req, res, next) {
								model.find({}, modelCallback(res, next));
							});
						}

						if (routes.indexOf($path.join(uri, paramKey, 'get')) < 0) {
							app.get($path.join(uri, paramKey), function(req, res, next) {
								res.json(req[name]);
								next();
							});
						}

						if (routes.indexOf($path.join(uri, 'post')) < 0) {
							app.post(uri, function(req, res, next) {
								model.create(req.body, modelCallback(res, next));
							});
						}

						if (routes.indexOf($path.join(uri, paramKey, 'put')) < 0) {
							app.put($path.join(uri, paramKey), function(req, res, next) {
								model.findByIdAndUpdate(req.params[paramName], {
									$set: $diff(req.params[paramName], req.body)
								}, modelCallback(res, next));
							});
						}

						if (routes.indexOf($path.join(uri, paramKey, 'delete')) < 0) {
							app.delete($path.join(uri, paramKey), function(req, res, next) {
								model.findByIdAndRemove(req.params[paramName], modelCallback(res, next));
							});
						}
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

					var params = Object.keys(app._router.params);
					
					Object.keys(app.db.models).forEach(function(modelName) {
						var paramKey = modelName.toLowerCase() + 'Id';
						if (params.indexOf(paramKey) < 0) {
							app.param(paramKey, function(req, res, next, val) {
								db.model(modelName).findById(val, function(err, result) {
									if (!err) {
										req[modelName] = result;
										next();
									} else {
										req.state(500).send(err);
									}
								});
							});
						}
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