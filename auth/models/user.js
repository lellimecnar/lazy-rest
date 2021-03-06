module.exports = function(customSchema) {
	var _ = require('lodash'),
		$mongoose = require('mongoose'),
		$apiQuery = require('mongoose-api-query'),
		db = $mongoose.connection,
		bcrypt = require('bcrypt-nodejs'),
		UserSchema;

	if (!customSchema || _.isPlainObject(customSchema)) {
		UserSchema = new $mongoose.Schema(_.extend({
				username: {
					type: String,
					unique: true,
					required: true
				},
				password: {
					type: String,
					required: true
				}
			}, customSchema || {}));
	} else if (customSchema instanceof $mongoose.Schema) {
		UserSchema = customSchema;
	} else {
		throw new Error('lazy-rest: invalid schema for User');
	}

	UserSchema.pre('save', function(callback) {
		var user = this;

		if (!user.isModified('password')) return callback();

		bcrypt.genSalt(5, function(err, salt) {
			if (err) return callback(err);

			bcrypt.hash(user.password, salt, null, function(err, hash) {
				if (err) return callback(err);
				user.password = hash;
				callback();
			});
		});
	});

	UserSchema.methods.verifyPassword = function(password, cb) {
		bcrypt.compare(password, this.password, function(err, isMatch) {
			if (err) return cb(err);
			cb(null, isMatch);
		});
	};

	UserSchema.plugin($apiQuery);

	return db.model('User', UserSchema);
};