module.exports = function(opts) {
	var $oauth2orize = require('oauth2orize'),
		_ = require('lodash'),
		$mongoose = require('mongoose'),
		db = $mongoose.connection,
		User = db.model('User'),
		Client = db.model('Client'),
		Token = db.model('Token'),
		Code = db.model('Code'),

		server = $oauth2orize.createServer();

	server.serializeClient(function(client, callback) {
		return callback(null, client._id);
	});

	server.deserializeClient(function(id, callback) {
		Client.findById(id, function (err, client) {
			if (err) { return callback(err); }
			return callback(null, client);
		});
	});

	server.grant($oauth2orize.grant.code(function(client, redirectUri, user, data, callback) {
		var scope = (data.scope || []).join('|').split(/[|, ]+/),
			val = uid(16);

		Code.create({
			value: val,
			clientId: client._id,
			redirectUri: redirectUri,
			userId: user._id,
			scope: scope
		}, function(err) {
			if (err) { return callback(err); }

			callback(null, val);
		});
	}));

	server.exchange($oauth2orize.exchange.code(function(client, code, redirectUri, callback) {
		Code.findOne({ value: code }, function (err, authCode) {
			if (err) { return callback(err); }
			if (
				_.isUndefined(authCode) ||
				client._id.toString() !== authCode.clientId ||
				redirectUri !== authCode.redirectUri
			) {
				return callback(null, false);
			}

			authCode.remove(function (err) {
				if(err) { return callback(err); }

				Token.create({
					value: uid(256),
					clientId: authCode.clientId,
					userId: authCode.userId,
					scope: authCode.scope
				}, function (err, token) {
					if (err) { return callback(err); }

					callback(null, token);
				});
			});
		});
	}));

	function uid (len) {
		var buffer = [],
			chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
			charlen = chars.length;

		_.forEach(_.range(1, len), function(i) {
			buffer.push(_.sample(chars));
		});

		return buffer.join('');
	}

	return {
		authorization: [
			server.authorization(function(clientId, redirectUri, scope, done) {
				Client.findOne(clientId, function (err, client) {
					if (err) { return done(err); }
					if (!client) { return done(null, false); }

					// TODO: Make sure hostname of redirectUri matches client domains
					
					// if (client['app_domains'].indexOf(url.parse(redirectUri).hostname) < 0) {
					// 	err = new Error('Redirect URI does not match registered redirect URI');
					// 	err.name = 'Error';
					// 	err.status = 400;
					// 	err.code = 400;
					// }

					return done(null, client, redirectUri);
				});
			}),
			function(req, res){
				var user = _.cloneDeep(req.user)._doc,
					client = _.cloneDeep(req.oauth2.client)._doc,
					scope = req.oauth2.req.scope.join(',').split(/[|, ]+/).join('|');

				// TODO: Add scope definitions to output

				delete user._id;
				delete user.__v;
				delete user.password;

				delete client._id;
				delete client.__v;
				delete client.secret;
				delete client.userId;

				res.json({
					transactionId: req.oauth2.transactionID,
					user: user,
					client: client,
					scope: scope
				});
			}
		],
		decision: [
			server.decision(function(req, done) {
				var scope = (req.body.scope || 'profile').split('|');
				return done(null, {scope: scope});
			})
		],
		token: [
			server.token(),
			server.errorHandler()
		]
	}
};