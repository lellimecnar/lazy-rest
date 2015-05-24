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

server.grant($oauth2orize.grant.code(function(client, redirectUri, user, ares, callback) {
	var code = new Code({
			value: uid(16),
			clientId: client._id,
			redirectUri: redirectUri,
			userId: user._id
		});

	code.save(function(err) {
		if (err) { return callback(err); }

		callback(null, code.value);
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

			var token = new Token({
				value: uid(256),
				clientId: authCode.clientId,
				userId: authCode.userId
			});

			token.save(function (err) {
				if (err) { return callback(err); }

				callback(null, token);
			});
		});
	});
}));


exports.authorization = [
	server.authorization(function(clientId, redirectUri, done) {
		Client.findOne(clientId, function (err, client) {
			if (err) { return done(err); }
			if (!client) { return done(null, false); }
			return done(null, client, redirectUri);
		});
	}),
	function(req, res){
		var user = _.cloneDeep(req.user)._doc,
			client = _.cloneDeep(req.oauth2.client)._doc;

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
			client: client
		});
	}
];

exports.decision = [
	server.decision()
];

exports.token = [
	server.token(),
	server.errorHandler()
];

function uid (len) {
	var buffer = [],
		chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
		charlen = chars.length;

	_.forEach(_.range(1, len), function(i) {
		buffer.push(_.sample(chars));
	});

	console.log(buffer.join(''));

	return buffer.join('');
};