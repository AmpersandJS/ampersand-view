# ampersand-view

A set of common helpers and conventions for using as a base view for ampersand.js apps.

What does it do?

1. Gives you a proven pattern for managing/binding the contents of an element.
2. Simple declarative property/template bindings without needing to include a template engine that does it for you. This keeps your logic out of your templates and lets you use a string of HTML as a fully dynamic template or just a simple function that returns an HTML string.
3. The view's base element is replaced (or created) during a render. So, rather than having to specify tag type and attributes in javascript in the view definition you can just include that in your template like everything else.
4. A way to render a collection of models within an element in the view, each with their own view, preserving order, and doing proper cleanup when the main view is removed.
5. A simple way to render sub-views that get cleaned up when the parent view is removed.

<!-- starthide -->
Part of the [Ampersand.js toolkit](http://ampersandjs.com) for building clientside applications.
<!-- endhide -->

## Install

```
npm install ampersand-view
```

## Usage

### Basics

Nothing special is required, just use `AmpersandView` in the same way as you would Backbone.View:

```javascript
var MyView = AmpersandView.extend({
    initialize: function () { ... }, 
    render: function () { ... }
});
```

### Declarative Bindings

```javascript
var MyView = AmpersandView.extend({
    // set a `template` property of your view. This can either be
    // a function that returns an HTML string or just a string if 
    // no logic is required.
    template: '<li><a><span class="userName"></span></a></li>', 
    // Simple declarative bindings
    // The key is the name of the model property
    bindings: {
        // the value is a selector, by default a text binding is assumed
        // this would keep the model's `name` attribute in the span, even
        // if it's changed.
        name: '.userName',
        
        // If the `active` property is a boolean the class 
        // will be added/removed based on the boolean property.
        // But, if the `active` property were a string, the previous
        // value would be removed and the new one added from the class
        // list without affecting other classes that may alreay be there.
        active: ['li', 'class'],
        
        // If you've got a boolean property, you can also specify a third
        // item in the array. It will be used to determine what the class
        // is that will be toggled. This way your property name can be 
        // different than the class. 
        isActive: ['li', 'class', 'active'], // will toggle the 'active' class
        
        // If you prefer, you *can* also bind to the whole class list. Which
        // will wipe out all existing classes.
        myClasses: ['li', 'classList'],

        // As you might have guessed, you can bind to any attribute you want
        userUrl: ['a', 'href'],

        // This works for boolean attributes. The following would add and remove 
        // the entire `checked` attribute (assuming the property value was a boolean)
        selected: ['input', 'checked']

        // If you really need to, you can even bind the same attribute to different
        // types of things with different options. If "superActive" was a string, the following would put
        // the text value of it, inside `.userName` and add it as a class on the `li`.
        superActive: [
            // the *only* restriction here is that if you pass an array of binding
            // declarations for a single property, each sub-item must also be an
            // array.
            ['.userName'],
            ['li', 'class'],
            // you can even get crazy... this would bind both
            // data attributes to both the li and .username elements
            ['li, .username', 'data-attribute1 data-attribute2'],
        ]        
    },
    render: function () {
        // method for rendering the view's template and binding all
        // the model properties as described by `textBindings` above.
        // You can also bind other attributes, and if you're using
        // ampersand-model, you can bind derived properties too.
        this.renderAndBind({what: 'some context object for the template'});
    }
});
```


### What about two-way bindings?

Note that these are all one-way bindings. People love to talk about the feature of two-way bindings, but from my experience, the vast majority of the time it's not actually something that you want. Why make two different ways of doing the same thing? The most common two-way bindings that people do are for form elements, which, is super easy to do with the events hash. Plus, then it's very easy to configure exactly when you want the user action to actually change the model.

Having said that, we may enable it anyway, in a future release, that's still up for discussion.


### handling subviews

Often you want to render some other subview within a view. The trouble is that when you remove the parent view, you also want to remove all the subviews.

AmpersandView has two convenience method for handling this that's also used by `renderCollection` to do cleanup.

It looks like this:

```javascript
var AmpersandView = require('ampersand-view');

// This can be *anything* with a `remove` method
// and an `el` property... such as another ampersand-view
// instance.
// But you could very easily write other little custom views
// that followed the same conventions. Such as custom dialogs, etc.
var SubView = require('./my-sub-view');

module.exports = AmpersandView.extend({
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

Note that this is a fork of Backbone's view so most of the public methods/properties here still exist: http://backbonejs.org/#View

### .template

The `.template` is a property for the view prototype. It should either be a string of HTML or a function that returns a string of HTML. It isn't required, but it is used as a default for calling `renderAndBind` and `renderWithTemplate`.

The important thing to note is that the *HTML should not have more than one root element*. This is because the view code assumes that it has one and only one root element that becomes the `.el` property of the instantiated view.

### .autoRender

The `.autoRender` property lets you optionally specify that the view should just automatically render with all the defaults. This requires that you at minimum specify a [template](#template) string of function.

By setting `autoRender: true` the view will simply call `.renderAndBind` for you (after your `initialize` method if present). So for simple views, if you've got a few bindings and a template your whole view could just be really and declarative like this:


```js
var AmpersandView = require('ampersand-view');


module.exports = AmpersandView.extend({
    autoRender: true,
    template: '<div><span id="username"></span></div>',
    bindings: {
        name: '#username'
    } 
});
```

**Note:** if you are using a template function (and not a string) the template function will get called with a context argument that looks like this:

```js
this.renderAndBind({
    model: this.model,
    collection: this.collection
}, this.template);
```

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
var ItemView = AmpersandView.extend({ ... });

// the main view
var MainView = AmpersandView.extend({
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
var view = AmpersandView.extend({
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
var view = AmpersandView.extend({
    template: '<li><a></a></li>',
    bindings: {
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
var view = AmpersandView.extend({
    template: '<li><img role="avatar" src="/user.png"/></li>',
    render: function () {
        this.renderAndBind();

        // cache an element for easy reference by other methods
        this.imgEl = this.getByRole('avatar');
    } 
});
```

## Changelog

- 1.6.3 [diff](https://github.com/HenrikJoreteg/ampersand-view/compare/v1.6.2...v1.6.3) - Move throw statment for too many root elements inside non `<body>` case.
- 1.6.2 [diff](https://github.com/HenrikJoreteg/ampersand-view/compare/v1.6.1...v1.6.2) - Make `getByRole` work even if `role` attribute is on the root element. Throws an error if your view template contains more than one root element.
- 1.6.1 [diff](https://github.com/HenrikJoreteg/ampersand-view/compare/v1.6.0...v1.6.1) - Make sure renderSubview registers the subview first, so it has a `.parent` before it calls `.render()` on the subview.
- 1.6.0 [diff](https://github.com/HenrikJoreteg/ampersand-view/compare/v1.5.0...v1.6.0) - Adding `getByRole` method
- 1.5.0 - Adding bower.json, adding missing dev dependencies, other small bugfixes.
- 1.4.1 - Removing elements without using jQuery's `.empty()` in renderCollection. (fixes: https://github.com/HenrikJoreteg/ampersand-view/issues/13)
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
