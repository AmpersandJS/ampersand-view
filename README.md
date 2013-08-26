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
    // set a `template` property of your view. This can either be
    // a function that returns an HTML string or just a string if 
    // no logic is required.
    template: myTemplateFunction, 
    textBindings: {
        // the model property: the css selector
        name: 'li a' 
    },
    render: function () {
        // method for rendering the view's template and binding all
        // the model properties as described by `textBindings` above.
        // You can also bind other attributes, and if you're using
        // strictmodel, you can bind derived properties too.
        this.renderAndBind({what: 'some context object for the template'});
    }
});
```

Binding types:

`classBindings`: Maintains a class on the element according to the following rules:
    1. **If the bound property is a boolean**: the name of the property will be used as the name of the class. The class will be on the element when true, and removed when the propety is false.
    2. **If the property is a string**: the current value of the property will be used as the class name. When the property value changes the previous class will be removed and be replaced by the current value. No other classes on that element will be disturbed.

`textBindings`: Maintains the current value of the property as the text content of the element specified by the selector.

`htmlBindings`: Just like `textBindings` except html is not escaped.

`srcBindings`: Binds to the `src` attribute (useful for avatars, etc).

`hrefBindings`: Binds to the `href` attribute.

`inputBindings`: Binds to the `input` value.

`attributeBindings`: Lets you create other arbitrary attributes bindings. For examlpe:
    
    this would bind the model's `id` attribute to the `data-id` attribute of the span element.
    ```js
    var View = StrictView.extend({
        template: '<li><span></span></li>',
        attributeBindings: {
            // model property name : [ 'css selctor', 'attribute name']
            id: ['span', 'data-thing']
        }
    });
    ```

### rendering collections

StrictView includes a `renderCollection` method that works as follows:

```js
// some view for individual items in the collection
var ItemView = StrictView.extend({ ... });

// the main view
var MainView = StrictView.extend({
    template: '<section class="page"><ul class="itemContainer"></ul></section>',
    render: function (opts) {
        // render our template as usual
        this.renderAndBind();
        
        // call renderCollection with these arguments:
        // 1. collection
        // 2. which view to use for each item in the list
        // 3. which element within this view to use as the container
        // 4. options object (not required):
        //      {
        //          // function used to determine if model should be included
        //          filter: function (model) {},
        //          // boolean to specify reverse rendering order
        //          reverse: false,
        //          // view options object (just gets passed to item view's `initialize` method)
        //          viewOptions: {}
        //      }
        this.renderCollection(this.collection, ItemView, this.$('.itemContainer')[0], opts);
        return this;
    }  
})
```

That will maintain this collection within that container element. Including proper handling of add, remove, sort, reset, etc. You can optionally specify a filter function or choose to reverse the collection when rendering.

Also, when the parent view gets `.remove()`'ed any event handlers registered by the individual item views will be properly removed as well. 

Each item view will only be `.render()`'ed once (unless you change that within the item view itself).


## test coverage?

Why yes! So glad you asked :)  

Open `test/test.html` in a browser to run the QUnit tests.


## license

MIT
