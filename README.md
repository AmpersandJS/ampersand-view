# strictview

A set of common helpers and conventions for using as a base view for backbone applications.

It adds: 

1. Simple declarative property/template bindings without needing to include a template engine that does it for you. Which keeps your code with your code, you template as a simple function that returns an HTML string and your payload light.
2. A pattern for easily including the view's base element into render. Rather than having to specify tag type and attributes in javascript in the view definition you can just include that in your template like everything else.
3. A way to render a collection of models within an element in the view, each with their own view, preserving order, and doing proper cleanup when the main view is removed.


## Install

```
npm install strictview
```

## Usage

### Basics

Nothing special is required, just use `StrictView` in the same way as you would Backbone.View:

```js
var MyView = StrictView.extend({
    initialize: function () { ... }, 
    render: function () { ... }
});
```

### Declarative Bindings

```js
var MyView = StrictView.extend({
    textBindings: {
        'name': '.cssSelector' 
    },
    render: function () {

    }
});
```


## license

MIT
