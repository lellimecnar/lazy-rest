# lazy-rest

Create a simple REST API using just your folder structure to create endpoints.

## Usage

Requiring lazy-rest will return a function. Simply pass your Express app into this function, and your API will be ready to go.

```js
var express = require('express'),
	lazyRest = require('lazy-rest'),
	app = express();

lazyRest(app);

app.listen(8080);
```

By default, lazy-rest will look in `./api` for your endpoints, but you can set a custom path by passing an additional config object:

```js
lazyRest(app, {
	path: './path/to/api/dirs'
});
```

### Folder Structure

Lazy-rest will search recursively in your API path for any JavaScript files with names that match HTTP methods supported by Express.

For example: `./api/path/to/endpoint/get.js` will create a REST endpoint using the GET method with a URI of `/path/to/endpoint`.

###### `get.js`
```js
module.exports = function(app) {
	return function(req, res, next) {
		res.json({msg: 'This endpoint works!!!'});
	};
};
```

#### Note about parameters:
Express allows for named parameters in your URIs, using the `:paramName` syntax. On *nix systems, this isn't a problem, since you can create directories with `:` in the name just fine, but this character isn't allowed in Windows. On systems where `:` is illegal, you can assign any substitute character using the `paramChar` option:

```js
lazyRest(app, {
	paramChar: '$'
});
```

With that option, `./api/endpoint/path/$pathId/get.js` will become `GET /endpoint/path/:pathId`.

#### Available Methods

`checkout`, `connect`, `copy`, `delete`, `get`, `head`, `lock`, `merge`, `mkactivity`, `mkcol`, `move`, `m-search`, `notify`, `options`, `patch`, `post`, `propfind`, `proppatch`, `purge`, `put`, `report`, `search`, `subscribe`, `trace`, `unlock`, `unsubscribe`

For a complete and up-to-date list, see the Express documentation for [`app.METHOD()`](http://expressjs.com/api.html#app.METHOD)

## MongoDB Integration

Lazy-rest will also look in `./db` for Mongoose configuration files, which integrate seamlessly with lazy-rest. You just need to pass your Mongoose database connection as an option to lazy-rest:

```js
var mongoose = require('mongoose'),
	db = mongoose.connect('mongodb://localhost:27017/my-sweet-database');

lazyRest(app, {
	db: db,
	dbPath: './relative/path/to/db/files' // defaults to ./db
})
```

Each directory in `dbPath` will translate into a model and collection. The name of the directory will become the model name, and will be pluralized by Mongoose to create the collection name.

For example: `/dir/name/schema.js` will contain the schema definition for a model named `DirName`, and will interface with a MongoDB collection called `dirnames`.

###### `schema.js`
```js
module.exports = {
	firstName: String,
	lastname: String,
	dob: Date,
	email: String
};
```

`/dir/name/params.js` can export an object which will map parameter names in your REST endpoints to functions. This is typically used to automatically retrieve a record when it's ID is passed in the URI.

For example:

###### `params.js`
```js
module.exports = {
	specialId: function(req, res, next, val, model, db) {
		model.findById(val, function(err, item) {
			if (!err) {
				req.specialResult = item;
			}
			next();
		});
	}
};
```

When an endpoint which contains the `:specialId` param, this function will be called, and `req.specialResult` will be populated for use in your endpoint function.