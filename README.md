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

## Write EJS templates

`/path/to/template/src/index.ts.ejs` will be compiled to `/path/to/project/src/index.ts`. You can use [EJS](https://ejs.co/) template syntax.

```ejs
export function <%= name %>() {
  //
}
```

You can also use EJS syntax in file names, for example `/path/to/template/src/<%= name %>.ts.ejs`.

## Delete conflict files

If you created `/path/to/template/webpack.config.js.delete` file, then `/path/to/project/webpack.config.js` will be deleted when initializing. This is a convenient way to clean up conflict files and folders.

## Merge JSON files

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

## Delete JSON keys

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
