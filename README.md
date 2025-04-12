# init-roll

Framework for project creation and migration. Power your `create-xxx` or `@xxx/create-xxx` packages.

## Install

```bash
npm install --save-dev init-roll
```

## Usage

```js
import { init } from 'init-roll';

init('/path/to/template', '/path/to/project', {
  // template parameters
  name: 'foobar',
  description: 'This is foobar',
});
```

## Template writting guides

### \*.delete

If you created `webpack.config.js.delete` file, then `webpack.config.js` will be deleted. This is a
convenient way to clean up conflict files and folders.

You can also use [EJS] syntax in template names, for example `src/<%= name %>.delete`.

### \*.default

If you created `src/foobar.js.default` template (support [EJS] template syntax):

- If `src/foobar.js` doesn't exist, it will be created with content compiled from the template
- If `src/foobar.js` exists, nothing will happen

You can also use [EJS] syntax in template names, for example `src/<%= name %>.default`.

### \*.override

If you created `src/foobar.js.override` template (support [EJS] template syntax), it will be compiled
to `src/foobar.js` and override existing file.

You can also use [EJS] syntax in template names, for example `src/<%= name %>.override`.

## \*.merge.json

When deal with `package.json`, you can use `/path/to/template/package.merge.json` to merge template data with existing data. You can also use EJS template syntax in `*.merge.json`.

```json
{
  <% if (esmOnly) { %>
  "type": "module",
  "main": "esm/index.js",
  <% } else { %>
  "main": "cjs/index.js",
  "module": "esm/index.js",
  <% } %>
  "bin": "cjs/<%= name %>.js"
}
```

## \*.delete.json

If you want to remove conflict keys in `package.json` file, create `/path/to/template/package.delete.json`, which contains keys you want to delete and values are `null`.

```json
{
  "husky": null,
  "devDependencies": {
    "@babel/core": null,
    "webpack": null
  }
}
```

[EJS]: https://ejs.co/
