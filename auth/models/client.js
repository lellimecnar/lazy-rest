var $mongoose = require('mongoose'),
	db = $mongoose.connection;

var ClientSchema = new $mongoose.Schema({
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
	}
});

module.exports = db.model('Client', ClientSchema);