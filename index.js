var $path = require('path'),
	$glob = require('glob').sync,
	$case = require('change-case'),
	$express = require('express'),
	$util = require('util'),
	$random = require('random-ext'),
	$ext = require('replace-ext'),
	_ = require('lodash'),
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
	],
	dbRoutes = {},
	routerConfigured = false,
	authConfigured = false,
	dbConfigured = false;

exports = module.exports = function(app, db, passport) {
	var $this = this;
	
	this.app = app || $express();
	this.db = db || null;
	this.passport = passport || require('passport');

	this.routes = {};
	this.authFn = $this.passport.authenticate(
		[ 'basic', 'bearer'],
		{ session: false });
	this.clientAuthFn = $this.passport.authenticate(
		'client-basic',
		{ session : false });
	this.bearerAuthFn = $this.passport.authenticate(
		'bearer',
		{ session: false });

	this.getHandlers = function() {
		return $this.app._router.stack.map(function(item) {
			return item.handle.name;
		});
	}

	this.addRoute = function(method, uri, auth, fn) {
		if (uri !== '/') {
			uri = uri.replace(/\/$/, '');
		}

		$this.routes[uri] = $this.routes[uri] || {};
		$this.routes[uri][method] = {
			auth: auth,
			fn: fn
		};
	};

	return {
		router: routerFactory.bind($this),
		auth: authFactory.bind($this),
		db: dbFactory.bind($this)
	};
};

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

function randomStr(min, max) {
	max = max || min;

	return $random.restrictedString([
		$random.CHAR_TYPE.UPPERCASE,
		$random.CHAR_TYPE.LOWERCASE,
		$random.CHAR_TYPE.NUMERIC,
	], min, max);
}

function routerFactory(opts) {
	var $this = this,
		$bodyParser = require('body-parser');

	routerConfigured = true;

	opts = _.extend({
		root: './api',
		paramPrefix: ':'
	}, opts || {});

	opts.root = $path.resolve(process.cwd(), opts.root);
	opts.paramPrefix = _.escapeRegExp(opts.paramPrefix);
	opts.paramPrefix = new RegExp(opts.paramPrefix, 'g');

	var Router = $express.Router(),
		handlers = $this.getHandlers(),
		routes = {};

	if (!_.contains(handlers, 'jsonParser')) {
		$this.app.use($bodyParser.json());
	}

	if (!_.contains(handlers, 'urlencodedParser')) {
		$this.app.use($bodyParser.urlencoded({
			extended: true
		}));
	}

	$glob('**/@(' + methods.join('|') + ').js', {
		nocase: true,
		cwd: opts.root
	}).forEach(function(file) {
		var path = $path.join(opts.root, file),
			m = ('/' + file).match(/^(.*\/)(.+)\.js$/),
			args = [],
			uri, method, route, routeFn, auth;

		if (m && m[1] && m[2]) {
			routeFn = require(path);
			auth = routeFn.$auth;
			delete routeFn.$auth;

			uri = m[1].replace(opts.paramPrefix, ':');
			method = m[2].toLowerCase();

			$this.addRoute(method, uri, auth, routeFn);

		}
	});
	
	$this.addRoute('options', '/', false, function(req, res, next) {
		var endpoints = [],
			path;

		Router.stack.forEach(function(item) {
			if (item.route) {
				path = item.route.path;
				item.route.stack.forEach(function(route) {
					endpoints.push({
						path: path,
						method: route.method
					});
				});
			}
		})
		res.json(endpoints);
	});

	_.forEach($this.routes, function(routes, uri) {
		var router = Router.route(uri);
		_.forEach(routes, function(route, method) {
			if (
				_.isFunction(router[method]) &&
				(
					_.isFunction(route.fn) ||
					_.isArray(route.fn)
				)
			) {
				var args = [route.fn];

				if (route.auth) {
					if (
						authConfigured &&
						$this.passport
					) {
						if (_.isFunction(route.auth)) {
							args.unshift(route.auth);
						} else {
							args.unshift($this.authFn);
						}
					} else {
						throw new Error('lazy-rest: auth must be configured for ' + method + ': ' + uri);
					}
				}

				router[method].apply(router, args);
			}
		});
	});

	return Router;
};

function authFactory(opts) {
	var $this = this,
		handlers = $this.getHandlers();

	authConfigured = true;

	if (routerConfigured) {
		throw new Error('lazy-rest: auth must be configured before router');
	}

	if (!dbConfigured || !$this.db) {
		throw new Error('lazy-rest: db must be configured before auth');
	}

	opts = _.extend({
		sessionSecret: 'Super Secret Session Key',
		UserSchema: {},
		ClientSchema: {},
		TokenSchema: {},
		CodeSchema: {}
	}, opts || {});

	$this.passport = require('./auth/config')($this.passport, opts);

	if (!_.contains(handlers, 'session')) {
		$this.app.use(require('express-session')({
			secret: opts.sessionSecret,
			saveUninitialized: true,
			resave: true
		}));
	}

	oauth2 = require('./auth/oauth2');

	$this.addRoute('get', '/authorize', true, oauth2.authorization);
	$this.addRoute('post', '/authorize', true, oauth2.decision);
	$this.addRoute('get', '/callback', false, function(req, res, next) {
		res.json(req.query);
	});
	$this.addRoute('post', '/token', $this.clientAuthFn, oauth2.token);

	$this.addRoute('post', '/users', false, function(req, res, next) {
		req.app.db.model('User')
			.create(req.body, modelCallback(res, next));
	});
	$this.addRoute('get', '/users', true, function(req, res, next) {
		req.app.db.model('User')
			.apiQuery(req.query, modelCallback(res, next));
	});

	$this.addRoute('post', '/clients', true, function(req, res, next) {
		req.body.userId = req.user._id;

		req.body.id = randomStr(32);
		req.body.secret = randomStr(48);

		req.app.db.model('Client')
			.create(req.body, modelCallback(res, next));
	});
	$this.addRoute('get', '/clients', true, function(req, res, next) {
		req.app.db.model('Client')
			.find({ userId: req.user._id }, modelCallback(res, next));
	});

	return $this.passport.initialize();
};

function dbFactory(opts) {
	var $this = this,
		$apiQuery = require('mongoose-api-query'),
		$mongo = require('mongoose'),
		mongoUrl;

	dbConfigured = true;

	if (routerConfigured) {
		throw new Error('lazy-rest: db must be configured before router');
	}

	if (authConfigured) {
		throw new Error('lazy-rest: db must be configured before auth');
	}

	opts = _.extend({
		root: './db',
		host: '127.0.0.1',
		db: 'lazy-rest',
		port: 27017,
		options: {}
	}, opts || {});

	opts.root = $path.resolve(process.cwd(), opts.root);

	mongoUrl = 'mongodb://' + opts.host + ':' + opts.port + '/' + opts.db;

	$this.db = $this.db || $mongo.connect(mongoUrl);

	$mongo.connection = $this.db;

	$this.app.db = $this.db;

	$glob('{**/schema.js,*.js}', {
		nocase: true,
		cwd: opts.root
	}).forEach(function(file) {
		var name = $case.pascal($path.dirname(file)),
			path = $path.join(opts.root, file),
			definition = require(path),
			disable, auth, schema, model, uri, paramName, paramKey;

		if (!name) {
			name = $case.pascal($ext(file, ''));
		}

		if (_.isFunction(definition)) {
			definition = definition(app);
		}

		if (definition instanceof $mongo.Schema) {
			schema = definition;
		} else {
			auth = definition.$auth || false;
			delete definition.$auth;
			disable = definition.$disable || [];
			delete definition.$disable;

			schema = new $mongo.Schema(definition);
		}

		schema.plugin($apiQuery);

		model = $this.db.model(name, schema);
		uri = '/' + model.collection.name;
		paramName = name.toLowerCase() + 'Id';
		paramKey = ':' + paramName,
		paramUri = $path.join(uri, paramKey);

		function isAuth(method) {
			return auth === true || _.contains(auth, method);
		}

		function isEnabled(method) {
			return !_.contains(disable, method);
		}

		if (isEnabled('get')) {
			if (isEnabled('query')) {
				$this.addRoute('get', uri, isAuth('get'), function(req, res, next) {
					model.apiQuery(req.query, modelCallback(res, next));
				});
			}

			if (isEnabled('getOne')) {
				$this.addRoute('get', paramUri, isAuth('get'), function(req, res, next) {
					model.findById(req.params[paramName], modelCallback(res, next));
				});
			}
		}

		if (isEnabled('post')) {
			$this.addRoute('post', uri, isAuth('post'), function() {
				model.create(req.body, modelCallback(res,next));
			});
		}

		if (isEnabled('put')) {
			$this.addRoute('put', paramUri, isAuth('put'), function(req, res, next) {
				model.findByIdAndUpdate(req.params[paramName], {
					$set: req.body
				}, modelCallback(res, next));
			});
		}

		if (isEnabled('delete')) {
			$this.addRoute('delete', paramUri, isAuth('delete'), function(req, res, next) {
				model.findByIdAndRemove(req.params[paramName], modelCallback(res, next));
			});
		}
	});

	return function(req, res, next) {
		next();
	};
};