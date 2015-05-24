module.exports = function(customSchema) {
	var _ = require('lodash'),
		$mongoose = require('mongoose'),
		db = $mongoose.connection,
		TokenSchema;

	if (!customSchema || _.isPlainObject(customSchema)) {
		TokenSchema = new $mongoose.Schema(_.extend({
			value: { type: String, required: true },
			userId: { type: String, required: true },
			clientId: { type: String, required: true }
		}, customSchema || {}));
	} else if (customSchema instanceof $mongoose.Schema) {
		TokenSchema = customSchema;
	} else {
		throw new Error('lazy-rest: invalid schema for Token');
	}

	return db.model('Token', TokenSchema);
}