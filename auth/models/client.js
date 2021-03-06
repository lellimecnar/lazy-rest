module.exports = function(customSchema) {
	var _ = require('lodash'),
		$mongoose = require('mongoose'),
		$valid = require('mongoose-validator'),
		db = $mongoose.connection,
		ClientSchema;

	if (!customSchema || _.isPlainObject(customSchema)) {
		ClientSchema = new $mongoose.Schema(_.extend({
			name: { 
				type: String,
				unique: true,
				required: true
			},
			id: { 
				type: String,
				required: true
			},
			secret: { 
				type: String,
				required: true
			},
			userId: { 
				type: String,
				required: true
			},
			domains: [{
				type: String,
				required: true,
				validate: $valid({
					validator: 'isURL',
					message: 'Domains must be valid URLs'
				})
			}]
		}, customSchema || {}));
	} else if (customSchema instanceof $mongoose.Schema){
		ClientSchema = customSchema;
	} else {
		throw new Error('lazy-rest: invalid schema for Client');
	}

	return db.model('Client', ClientSchema);
};