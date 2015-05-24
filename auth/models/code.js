module.exports = function(customSchema) {
	var _ = require('lodash'),
		$mongoose = require('mongoose'),
		db = $mongoose.connection,
		CodeSchema;


	if (! customSchema || _.isPlainObject(customSchema)) {
		CodeSchema = new $mongoose.Schema(_.extend({
			value: {
				type: String,
				required: true
			},
			redirectUri: {
				type: String,
				required: true
			},
			userId: {
				type: String,
				required: true
			},
			clientId: {
				type: String,
				required: true
			}
		}, customSchema || {}));
	} else if (customSchema instanceof $mongoose.Schema) {
		CodeSchema = customSchema;
	} else {
		throw new Error('lazy-rest: invalid schema for Code');
	}

	return db.model('Code', CodeSchema);
}