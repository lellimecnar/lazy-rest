# lazy-rest

Create a simple REST API using just your folder structure to create endpoints.

## Installation
```
npm install lazy-rest
```

## Configuration
Requiring `lazy-rest` will return a function. Simply pass your Express app into this function, and your API will be ready to go.

```node
var express = require('express'),
	lazyRest = require('lazy-rest'),
	app = express();

lazyRest(app);

app.listen(8080);
```

Optionally, you can also supply `lazy-rest` with an option object:

```node
lazyRest(app, {
	methods: [
		'get',
		'post',
		'put'
	],
	path: './path/to/api/dirs'
});
```

###`methods`
An array of HTTP methods to match against filenames.

Available methods:

`get`
`head`
`post`
`put`
`delete`
`trace`
`options`
`connect`
`patch`


###`path`
The relative path where your API folder structure can be found.

Defaults to `./api`