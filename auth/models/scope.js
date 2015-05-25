module.exports = function(customSchema) {
	var _ = require('lodash'),
		$mongoose = require('mongoose'),
		db = $mongoose.connection,
		ScopeSchema;

	if (!customSchema || _.isPlainObject(customSchema)) {
		ScopeSchema = new $mongoose.Schema(_.extend({
			key: { 
				type: String,
				required: true
			},
			description: { 
				type: String,
				required: true
			}
		}, customSchema || {}));
	} else if (customSchema instanceof $mongoose.Schema) {
		ScopeSchema = customSchema;
	} else {
		throw new Error('lazy-rest: invalid schema for Scope');
	}

	return db.model('Scope', ScopeSchema);
}