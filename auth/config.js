module.exports = function($passport, opts) {
	$passport = $passport || require('passport');
	opts = opts || {};

	var BasicStrategy = require('passport-http').BasicStrategy,
		BearerStrategy = require('passport-http-bearer').Strategy,
		User = require('./models/user')(opts.UserSchema),
		Client = require('./models/client')(opts.ClientSchema),
		Token = require('./models/token')(opts.TokenSchema),
		Code = require('./models/code')(opts.CodeSchema),
		Scope = require('./models/scope')(opts.ScopeSchema);

	$passport.use(opts.basic || new BasicStrategy(
	  function(username, password, callback) {
	    User.findOne({ username: username }, function (err, user) {
	      if (err) { return callback(err); }

	      // No user found with that username
	      if (!user) { return callback(null, false); }

	      // Make sure the password is correct
	      user.verifyPassword(password, function(err, isMatch) {
	        if (err) { return callback(err); }

	        // Password did not match
	        if (!isMatch) { return callback(null, false); }

	        // Success
	        return callback(null, user);
	      });
	    });
	  }
	));

	$passport.use('client-basic', opts.clientBasic || new BasicStrategy(
	  function(username, password, callback) {
	    Client.findOne({ id: username }, function (err, client) {
	      if (err) { return callback(err); }

	      // No client found with that id or bad password
	      if (!client || client.secret !== password) { return callback(null, false); }

	      // Success
	      return callback(null, client);
	    });
	  }
	));

	$passport.use(opts.bearer || new BearerStrategy(
	  function(accessToken, callback) {
	    Token.findOne({value: accessToken }, function (err, token) {
	      if (err) { return callback(err); }

	      // No token found
	      if (!token) { return callback(null, false); }

	      User.findOne({ _id: token.userId }, function (err, user) {
	        if (err) { return callback(err); }

	        // No user found
	        if (!user) { return callback(null, false); }

	        // Simple example with no scope
	        callback(null, user, { scope: token.scope });
	      });
	    });
	  }
	));

	return $passport;
};