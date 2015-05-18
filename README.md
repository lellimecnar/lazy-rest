# lazy-rest

Create a simple REST API using just your folder structure to create endpoints.

### `lazyRest(app, [db])([apiRoot, opts])`

### Arguments

| argument  | description                                              |
|-----------|----------------------------------------------------------|
| `app`     | Your Express app                                         |
| `db`      | Your Mongoose database                                   |
| `apiRoot` | A path to prefix to your endpoints. Defaults to `'/api'` |
| `opts`    | Optional configuration object. See below.                |

### Available options

| option        | type     | default   | description                                                                                         |
|---------------|----------|-----------|-----------------------------------------------------------------------------------------------------|
| `root`        | `String` | `"./api"` | The relative path for lazy-rest to look for endpoints.                                              |
| `dbRoot`      | `String` | `"./db"`  | The relative path for lazy-rest to look for Mongoose configuration.                                 |
| `paramPrefix` | `String` | `":"`     | The character to precede named parameters in folder names. Useful when `:` is an illegal character. |

## Usage

```js
var express = require('express'),
	app = express(),
	mongoose = require('mongoose'),
	db = mongoose.connect('mongodb://localhost:27017/my-sweet-db'),
	lazyRest = require('lazy-rest')(app, db);

app.use(lazyRest('/api/v1', {
	root: './relative/path/to/api/files',
	dbRoot: './relative/path/to/db/files',
	paramPrefix: '$'
}));

app.listen(8080);
```

The example above will:

1. Search for endpoint files in `opt.root`
1. Create Express routes based on the files found
	1. Route URIs are created from the paths, with `apiRoot` prepended (defaults to `"/api"`)
	1. HTTP methods are determined from the filenames
	1. The function exported by each file is passed to Express as that route's controller
1. Search for js files in `opt.dbRoot` called `schema.js`
	1. The path of each file is converted, using PascalCase into a model name
	1. The object exported by `schema.js` is used to create the schema definition for the model
1. Search directories called `params` for js files
	1. The model name is converted from the parent directory to match the schema from above
	1. The filenames of each js file is used as the parameter key
	1. The function exported for each key is run whenever an endpoint containing that named parameter is requested

### Example

###### `get.js`
```js
module.exports = function(req, res, next) {
	res.json({msg: 'This endpoint works!!!'});
};
```

###### `schema.js`
```js
module.exports = {
	firstName: String,
	lastname: String,
	dob: Date,
	email: String
};
```

###### `params/specialId.js`
```js
module.exports = function(req, res, next, val, model) {
	model.findById(val, function(err, item) {
		if (!err) {
			req.specialResult = item;
		}
		next();
	});
};
```

#### Available HTTP Methods

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

With that option, `./api/endpoint/path/$pathId/get.js` will become `GET /api/endpoint/path/:pathId`.