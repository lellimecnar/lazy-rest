# lazy-rest

Create a simple REST API using just your folder structure to create endpoints.

## `lazyRest(app, [db, opts])`

| argument | description                       |
|----------|-----------------------------------|
| `app`    | Your Express app                  |
| `db`     | Your Mongoose database connection |
| `opts`   | An optional configuration object  |
|----------|-----------------------------------|

### Available options

| option      | type     | default | description                                                                                        |
|-------------|----------|---------|----------------------------------------------------------------------------------------------------|
| `path`      | `String` | `./api` | The relative path for lazy-rest to look for endpoints.                                             |
| `dbPath`    | `String` | `./db`  | The relative path for lazy-rest to look for Mongoose configuration.                                |
| `paramChar` | `String` | `:`     | The character to precede named parameters in folder names. Useful when `:` is an illegal character |
|-------------|----------|---------|----------------------------------------------------------------------------------------------------|

## Usage

```js
var express = require('express'),
	lazyRest = require('lazy-rest'),
	app = express(),
	mongoose = require('mongoose'),
	db = mongoose.connect('mongodb://localhost:27017/my-sweet-database');

lazyRest(app, db, {
})

lazyRest(app, db, {
	path: './relative/path/to/endpoints',
	dbPath: './relative/path/to/db/files'
});

app.listen(8080);
```

The example above will:

1. Search for endpoint files in `./relative/path/to/endpoints`
1. Create Express routes based on the files found
	1. Route URIs are created from the paths
	1. HTTP methods are determined from the filenames
	1. The function exported by each file is passed to Express as that route's controller
1. Search for files in `./relative/path/to/db/files` called `schema.js` and `params.js`
	1. The path of each file is converted, using PascalCase into a model name
	1. The object exported by `schema.js` becomes the schema definition for the model
	1. The object exported by `params.js` is parsed for named parameter keys
		1. The function for each key is run whenever an endpoint containing that named parameter is requested

### Folder Structure

Lazy-rest will search recursively in your API path for any JavaScript files with names that match HTTP methods supported by Express.

**For example:** `./api/path/to/endpoint/get.js` will create a REST endpoint using the GET method with a URI of `/path/to/endpoint`.

###### `get.js`
```js
module.exports = function(app) {
	return function(req, res, next) {
		res.json({msg: 'This endpoint works!!!'});
	};
};
```

Each directory in `dbPath` will translate into a model and collection. The name of the directory will become the model name, and will be pluralized by Mongoose to create the collection name.

**For example:** `/dir/name/schema.js` will contain the schema definition for a model named `DirName`, and will interface with a MongoDB collection called `dirnames`.

###### `schema.js`
```js
module.exports = {
	firstName: String,
	lastname: String,
	dob: Date,
	email: String
};
```

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

#### Available Methods

* `checkout`
* `connect`
* `copy`
* `delete`
* `get`
* `head`
* `lock`
* `merge`
* `mkactivity`
* `mkcol`
* `move`
* `m-search`
* `notify`
* `options`
* `patch`
* `post`
* `propfind`
* `proppatch`
* `purge`
* `put`
* `report`
* `search`
* `subscribe`
* `trace`
* `unlock`
* `unsubscribe`

For a complete and up-to-date list, see the Express documentation for [`app.METHOD()`](http://expressjs.com/api.html#app.METHOD)

#### Note about parameters:
Express allows for named parameters in your URIs, using the `:paramName` syntax. On systems where `:` is an illegal character, you can assign any substitute character using the `paramChar` option:

```js
lazyRest(app, db, {
	paramChar: '$'
});
```

With that option, `./api/endpoint/path/$pathId/get.js` will become `GET /endpoint/path/:pathId`.