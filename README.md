# human-view

A set of common helpers and conventions for using as a base view for humanjs / backbone applications.

<!---starthide-->
<p class="docLink">Part of the <a href="http://docs.humanjavascript.com/#all_human_view">Human JavaScript toolkit</a></p>
<!---endhide-->

It adds: 

1. Simple declarative property/template bindings without needing to include a template engine that does it for you. Which keeps your code with your code and your template as a simple function that returns an HTML string, and your payload light.
2. A pattern for easily including the view's base element into render. Rather than having to specify tag type and attributes in javascript in the view definition you can just include that in your template like everything else.
3. A way to render a collection of models within an element in the view, each with their own view, preserving order, and doing proper cleanup when the main view is removed.
4. A simple way to render sub-views that get cleaned up when the parent view is removed.


## Install

```
npm install human-view
```

## Usage

### Basics

Nothing special is required, just use `HumanView` in the same way as you would Backbone.View:

```javascript
var MyView = HumanView.extend({
    initialize: function () { ... }, 
    render: function () { ... }
});
```

### Declarative Bindings

```javascript
var MyView = HumanView.extend({
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
        // human-model, you can bind derived properties too.
        this.renderAndBind({what: 'some context object for the template'});
    }
});
```

#### Binding types:

* `classBindings`: Maintains a class on the element according to the following rules:
    1. **If the bound property is a boolean**: the name of the property will be used as the name of the class. The class will be on the element when true, and removed when the propety is false.
    2. **If the property is a string**: the current value of the property will be used as the class name. When the property value changes the previous class will be removed and be replaced by the current value. No other classes on that element will be disturbed.
* `textBindings`: Maintains the current value of the property as the text content of the element specified by the selector.
* `htmlBindings`: Just like `textBindings` except html is not escaped.
* `srcBindings`: Binds to the `src` attribute (useful for avatars, etc).
* `hrefBindings`: Binds to the `href` attribute.
* `inputBindings`: Binds to the `input` value.
* `attributeBindings`: Lets you create other arbitrary attributes bindings. For example, this would bind the model's `id` attribute to the `data-id` attribute of the span element:

```javascript
var View = HumanView.extend({
    template: '<li><span></span></li>',
    attributeBindings: {
        // <model_property>: [ '<css-selector>', '<attribute-name>']
        id: ['span', 'data-thing']
    }
});
```

### handling subviews

Often you want to render some other subview within a view. The trouble is that when you remove the parent view, you also want to remove all the subviews.

HumanView has two convenience method for handling this that's also used by `renderCollection` to do cleanup.

It looks like this:

```javascript
var HumanView = require('human-view');

// This can be *anything* with a `remove` method
// and an `el` property... such as another human-view
// instance.
// But you could very easily write other little custom views
// that followed the same conventions. Such as custom dialogs, etc.
var SubView = require('./my-sub-view');

module.exports = HumanView.extend({
    render: function () {
        // this takes a view instance and either an element, or element selector 
        // to draw the view into.
        this.renderSubview(new Subview(), '.someElementSelector');

        // There's an even lower level api that `renderSubview` usees
        // that will do nothing other than call `remove` on it when
        // the parent view is removed.
        this.registerSubview(new Subview());
    }
})
```

**registerSubview also, stores a reference to the parent view on the subview as `.parent`**


## API Reference 

Note that we're simply extending Backbone.View here, so all the methods/properties here still exist: http://backbonejs.org/#View

### .template

The `.template` is a property for the view prototype. It should either be a string of HTML or a function that returns a string of HTML. It isn't required, but it is used as a default for calling `renderAndBind` and `renderWithTemplate`.

The important thing to note is that the *HTML should not have more than one root element*. This is because the vieww code assumes that it has one and only one root element that becomes the `.el` property of the instantiated view.

### .renderCollection(collection, ItemView, containerEl, [viewOptions])

* `collection` {Backbone Collection} The instantiated collection we wish to render.
* `itemViewClass` {View Constructor} The view constructor that will be instantiated for each model in the collection. This view will be instantiated with a reference to the model and collection and the item view's `render` method will be called with an object containing a reference to the containerElement as follows: `.render({containerEl: << element >>})`.
* `containerEl` {Element} The element that should hold the collection of views.
* `viewOptions` {Object} [optional] Additional options 
    * `viewOptions` {Object} Options object that will get passed to the `initialize` method of the individual item views.
    * `filter` {Function} [optional] Function that will be used to determine if a model should be rendered in this collection view. It will get called with a model and you simply return `true` or `false`.
    * `reverse` {Boolean} [optional] Convenience for reversing order in which the items are rendered.

This method will maintain this collection within that container element. Including proper handling of add, remove, sort, reset, etc. 

Also, when the parent view gets `.remove()`'ed any event handlers registered by the individual item views will be properly removed as well. 

Each item view will only be `.render()`'ed once (unless you change that within the item view itself).

#### Example:

```javascript
// some view for individual items in the collection
var ItemView = HumanView.extend({ ... });

// the main view
var MainView = HumanView.extend({
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

### .registerSubview(viewInstance)

* viewInstance {Object} Any object with a "remove" method, typically an instantiated view. But doesn't have to be, it can be anything with a remove method. The remove method doesn't have to actually remove itself from the DOM (since the parent view is being removed anyway), it is generally just used for unregistering any handler that it set up.

### .renderSubview(viewInstance, containerEl)

* viewInstance {Object} Any object with a `.remove()`, `.render()` and an `.el` property that is the DOM element for that view. Typically this is just an instantiated view. 
* containerEl {Element | String | jQueryElement} This can either be an actual DOM element or a CSS selector string such as `.container`. If a string is passed human view runs `this.$("YOUR STRING")` to try to grab the element that should contain the sub view.

This method is just sugar for the common use case of instantiating a view and putting in an element within the parent.

It will:

1. fetch your container (if you gave it a selector string)
2. register your subview so it gets cleaned up if parent is removed and so `view.parent` will be available when your subview's `render` method gets called
3. call the subview's `render()` method
4. append it to the container
5. return the subview

#### Example:

```js
var view = HumanView.extend({
    template: '<li><div class="container"></div></li>',
    render: function () {
        this.renderAndBind();

        ...

        var model = this.model;
        this.renderSubview(new SubView({
            model: model
        }), '.container');

        ... 

    } 
});
```

### .renderAndBind([context], [template])

* `context` {Object | null} [optional] The context that will be passed to the template function, usually `{model: this.model}`.
* `template` {Function | String} [optional] A function that returns HTML or a string of HTML.

This is shortcut for the default rendering you're going to do in most every render method, which is: use the template property of the view to replace `this.el` of the view and re-register all handlers from the event hash and any other binding as described above.

#### Example:

```js
var view = HumanView.extend({
    template: '<li><a></a></li>',
    textBindings: {
        'name': 'a'
    },
    events: {
        'click a': 'handleLinkClick'
    },
    render: function () {
        // this does everything
        // 1. renders template
        // 2. registers delegated click handler
        // 3. inserts and binds the 'name' property
        //    of the view's `this.model` to the <a> tag.
        this.renderAndBind();
    }
});

```


### .renderWithTemplate([context], [template])

* `context` {Object | null} The context object that will be passed to the template function if it's a function.
* `template` {Function | String} [optional] template function that returns a string of HTML or a string of HTML. If it's not passed, it will default to the `template` property in the view.

This is shortcut for doing everything we need to do to render and fully replace current root element with the template that our view is wanting to render. In typical backbone view approaches you never replace the root element. But from our experience, it's nice to see the *entire* html structure represented by that view in the template code. Otherwise you end up with a lot of wrapper elements in your DOM tree.

### .getByRole(name)

* `name` {String} The name of the 'role' attribute we're searching for.

This is for convenience and also to encourage the use of the `role` attribute for grabbing elements from the view. Using roles to select elements in your view makes it much less likely that designers and JS devs accidentally break each other's code. This will work even if the `role` attribute is on the view's root `el`.

#### Example:

```js
var view = HumanView.extend({
    template: '<li><img role="avatar" src="/user.png"/></li>',
    render: function () {
        this.renderAndBind();

        // cache an element for easy reference by other methods
        this.imgEl = this.getByRole('avatar');
    } 
});
```

## Changelog

- 1.6.2 [diff](https://github.com/HenrikJoreteg/human-view/compare/v1.6.1...v1.6.2) - Make `getByRole` work even if `role` attribute is on the root element. Throws an error if your view template contains more than one root element.
- 1.6.1 [diff](https://github.com/HenrikJoreteg/human-view/compare/v1.6.0...v1.6.1) - Make sure renderSubview registers the subview first, so it has a `.parent` before it calls `.render()` on the subview.
- 1.6.0 [diff](https://github.com/HenrikJoreteg/human-view/compare/v1.5.0...v1.6.0) - Adding `getByRole` method
- 1.5.0 - Adding bower.json, adding missing dev dependencies, other small bugfixes.
- 1.4.1 - Removing elements without using jQuery's `.empty()` in renderCollection. (fixes: https://github.com/HenrikJoreteg/human-view/issues/13)
- 1.4.0 - Adding `parent` reference to subviews registered via registerSubview

<!---starthide-->

## Test coverage?

Why yes! So glad you asked :)  

Open `test/test.html` in a browser to run the QUnit tests.

## Like this?

Follow [@HenrikJoreteg](http://twitter.com/henrikjoreteg) on twitter and check out my recently released book: [human javascript](http://humanjavascript.com) which includes a full explanation of this as well as a whole bunch of other stuff for building awesome single page apps. 

## license

MIT

<!---endhide-->
