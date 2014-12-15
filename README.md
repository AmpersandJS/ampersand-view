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

<!-- starthide -->

## Browser support

[![browser support](https://ci.testling.com/ampersandjs/ampersand-view.png)
](https://ci.testling.com/ampersandjs/ampersand-view)
<!-- endhide -->

## Install

```
npm install ampersand-view
```

## API Reference

Note that this is a fork of Backbone's view so most of the public methods/properties here still exist: [http://backbonejs.org/#View](http://backbonejs.org/#View).

### extend `AmpersandView.extend([properties])`

Get started with views by creating a custom view class. Ampersand views have a sane default render function, which you don't necessarily have to override, but you probably will wish to specify a [`template`](http://ampersandjs.com/docs#ampersand-view-template), your declarative [event handlers](http://ampersandjs.com/docs#ampersand-view-events) and your [view bindings](http://ampersandjs.com/docs#ampersand-view-bindings).

```javascript
var PersonRowView = AmpersandView.extend({
    template: "<li> <span data-hook='name'></span> <span data-hook='age'></span> <a data-hook='edit'>edit</a> </li>",

    events: {
        "click [data-hook=edit]": "edit"
    },

    bindings: {
        "model.name": {
            type: 'text',
            hook: 'name'
        },

        "model.age": {
            type: 'text',
            hook: 'age'
        }
    },

    edit: function () {
        //...
    }
});
```

### template `AmpersandView.extend({ template: "<div><input></div>" })`

The `.template` is a property for the view prototype. It should either be a string of HTML or a function that returns a string of HTML or a DOM element. It isn't required, but it is used as a default for calling `renderWithTemplate`.

The important thing to note is that __*the returned string/HTML should not have more than one root element*__. This is because the view code assumes that it has one and only one root element that becomes the `.el` property of the instantiated view.

For more information about creating, and compiling templates, [read the templating guide](http://ampersandjs.com/learn/templates).

### autoRender `AmpersandView.extend({ autoRender: true })`

The `.autoRender` property lets you optionally specify that the view should just automatically render with all the defaults. This requires that you at minimum specify a [template](http://ampersandjs.com/docs#ampersand-view-template) string or function.

By setting `autoRender: true` the view will simply call `.renderWithTemplate` for you (after your `initialize` method if present). So for simple views, if you've got a few bindings and a template your whole view could just be really declarative like this:

```javascript
var AmpersandView = require('ampersand-view');


module.exports = AmpersandView.extend({
    autoRender: true,
    template: '<div><span id="username"></span></div>',
    bindings: {
        name: '#username'
    }
});
```

**Note:** if you are using a template function (and not a string) the template function will get called with a context argument that looks like this, giving you access to `.model`, `.collection` and any other props you have defined on the view from the template.

```javascript
this.renderWithTemplate(this, this.template);
```

### events `AmpersandView.extend({ events: { /* ...events hash... */ } })`

The events hash allows you to specify declarative callbacks for DOM events within the view. This is much clearer and less complex than calling `el.addEventListener('click', ...)` everywhere.

* Events are written in the format `{"event selector": "callback"}`.
* The callback may either be the name of a method on the view, or an actual function.
* Omitting the `selector` causes the event to be bound to the view's root element (`this.el`).
* The events property may also be defined as a function that returns an *events* hash, to make it easier to programmatically define your events, as well as inherit them from parent views.

Using the events hash has a number of benefits over manually binding events during the `render` call:

* All attached callbacks are bound to the view before being handed off to the event handler, so when the callbacks are invoked, `this` continues to refer to the view object.
* All event handlers are delegated to the view's root el, meaning elements changed when the view is updated don't need to be unbound and rebound.
* All events handlers are cleanly removed when the view is [removed](http://ampersandjs.com/docs#ampersand-view-remove).

```
var DocumentView = AmpersandView.extend({

  events: {
    //bind to a double click on the root element
    "dblclick"                : "open",

    //bind to a click on an element with both 'icon' and 'doc' classes
    "click .icon.doc"         : "select",

    "contextmenu .icon.doc"   : "showMenu",
    "click .show_notes"       : "toggleNotes",
    "click .title .lock"      : "editAccessLevel",
    "mouseover .title .date"  : "showTooltip"
  },

  open: function() {
    window.open(this.model.viewer_url);
  },

  select: function() {
    this.model.selected = true;
  },

  //...

});
```

Note that the `events` definition is not merged with the superclass definition. If you want to merge
`events` from a superclass, you have to do it explicitly:
```
var SuperheroRowView = PersonRowView.extend({
  events: _.extend({}, PersonRowView.prototype.events, {
    'click [data-hook=edit-secret-identitiy]': 'editSecretIdentity'
  })
});
```

### bindings

The bindings hash gives you a declarative way of specifying which elements in your view should be updated when the view's model is changed.

For a full reference of available binding types see the [ampersand-dom-bindings](http://ampersandjs.com/docs#ampersand-dom-bindings) section.

For example, with a model like this:

```javascript
var Person = AmpersandModel.extend({
    props: {
        name: 'string',
        age: 'number',
        avatarURL: 'string'
    },
    session: {
        selected: 'boolean'
    }
});
```

and a template like this:

```html
<!-- templates.person -->
<li>
  <img data-hook="avatar">
  <span data-hook="name"></span>
  age: <span data-hook="age"></span>
</li>
```

you might have a binding hash in your view like this:

```javascript
var PersonView = AmpersandView.extend({
    templates: templates.person,

    bindings: {
        'model.name': {
            type: 'text',
            hook: 'name'
        },

        'model.age': '[data-hook=age]', //shorthand of the above

        'model.avatarURL': {
            type: 'attribute',
            name: 'src',
            hook: 'avatar'
        },

        //no selector, selects the root element
        'model.selected': {
            type: 'booleanClass',
            name: 'active' //class to toggle
        }
    }
});
```

Note that the `bindings` definition is not merged with the superclass definition. If you want to merge
`bindings` from a superclass, you have to do it explicitly:
```
var SuperheroRowView = PersonRowView.extend({
  bindings: _.extend({}, PersonRowView.prototype.bindings, {
    'model.secretIdentity': '[data-hook=secret-identity]'
  })
});
```

### el `view.el`

All rendered views have a single DOM node which they manage, which is acessible from the `.el` property on the view. Allowing you to insert it into the DOM from the parent context.

```
var view = new PersonView({ model: me });
view.render();

document.querySelector('#viewContainer').appendChild(view.el);
```

### constructor `new AmpersandView([options])`

The default `AmpersandView` constructor accepts an optional `options` object, and:

* Attaches the following options directly to the instantiated view, overriding the defaults: `model`, `collection`, `el`.
* Sets up event bindings defined in the `events` hash.
* Sets up the model bindings defined in the `bindings` hash.
* Initializes any subviews defined in the `subviews` hash.
* Calls `initialize` passing it the options hash.
* Renders the view, if `autoRender` is true and a template is defined.

Typical use-cases for the options hash:
* To initialize a view with an `el` _already_ in the DOM, pass it as an option: `new AmpersandView({ el: existingElement })`.
* To perform extra work when initializing a new view, override the `initialize` function in the extend call, rather than modifying the constructor, it's easier.

### initialize `new AmpersandView([options])`

Called by the default view constructor after the view is initialized. Overwrite initialize in your views to perform some extra work when the view is initialized. Initially it's a noop:

```javascript
var MyView = AmpersandView.extend({
    initialize: function (options) {
        console.log("The options are:", options);
    }
});

var view = new MyView({ foo: 'bar' });
//=> logs 'The options are: {foo: "bar"}'
```

If you want to extend the `initialize` function of a superclass instead of redefining it completely, you can 
explicitly call the `initialize` of the superclass at the right time:
```
var SuperheroRowView = PersonRowView.extend({
  initialize: function () {
    PersonRowView.prototype.initialize.apply(this, arguments);
    doSomeOtherStuffHere();
  })
});
```

### render `view.render()`

Render is a part of the [Ampersand View conventions](http://ampersandjs.com/learn/view-conventions). You can override the default view method when extending AmpersandView if you wish, but as part of the conventions, calling render should:

* Create a `this.el` property if the view doesn't already have one, and populate it with your view template
* or if the view already has a `this.el` attribute, render should either populate it with your view template, or create a new element and replace the existing `this.el` if it's in the DOM tree.
* Not be a problem if it's called more than once.


The default render looks like this:

```javascript
render: function () {
    this.renderWithTemplate(this);
    return this;
}
```

If you want to extend the `render` function of a superclass instead of redefining it completely, you can 
explicitly call the `render` of the superclass at the right time:
```
var SuperheroRowView = PersonRowView.extend({
  render: function () {
    PersonRowView.prototype.render.apply(this, arguments);
    doSomeOtherStuffHere();
  })
});
```

### renderCollection `view.renderCollection(collection, ItemView, containerEl, [viewOptions])`

* `collection` {Backbone Collection} The instantiated collection we wish to render.
* `ItemView` {View Constructor | Function} The view constructor that will be instantiated for each model in the collection or a function that will return an instance of a given constructor. `options` object is passed as a first argument to a function, which can be used to access `options.model` and determine which view should be instantiated. This view will be used with a reference to the model and collection and the item view's `render` method will be called with an object containing a reference to the containerElement as follows: `.render({containerEl: << element >>})`.
* containerEl {Element | String} This can either be an actual DOM element or a CSS selector string such as `.container`. If a string is passed ampersand-view runs `this.query('YOUR STRING')` to try to grab the element that should contain the collection of views. If you don't supply a `containerEl` it will default to `this.el`.
* `viewOptions` {Object} [optional] Additional options 
    * `viewOptions` {Object} Options object that will get passed to the `initialize` method of the individual item views.
    * `filter` {Function} [optional] Function that will be used to determine if a model should be rendered in this collection view. It will get called with a model and you simply return `true` or `false`.
    * `reverse` {Boolean} [optional] Convenience for reversing order in which the items are rendered.

This method will maintain this collection within that container element. Including proper handling of add, remove, sort, reset, etc.

Also, when the parent view gets `.remove()`'ed any event handlers registered by the individual item views will be properly removed as well.

Each item view will only be `.render()`'ed once (unless you change that within the item view itself).

The collection view instance will be returned from the function.

#### Example:

```javascript
// some views for individual items in the collection
var ItemView = AmpersandView.extend({ ... });
var AlternativeItemView = AmpersandView.extend({ ... });

// the main view
var MainView = AmpersandView.extend({
    template: '<section class="page"><ul class="itemContainer"></ul></section>',
    render: function (opts) {
        // render our template as usual
        this.renderWithTemplate(this);

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
        // returns the collection view instance
        var collectionView = this.renderCollection(this.collection, ItemView, this.el.querySelector('.itemContainer'), opts);
        return this;
    }
});

// alternative main view
var AlternativeMainView = AmpersandView.extend({
    template: '<section class="sidebar"><ul class="itemContainer"></ul></section>',
    render: function (opts) {
        this.renderWithTemplate(this);
        this.renderCollection(this.collection, function (options) {
            if (options.model.isAlternative) {
                return new AlternativeItemView(options);
            }

            return new ItemView(options);
        }, this.el.querySelector('.itemContainer'), opts);
        return this;
    }
});
```

### renderWithTemplate `view.renderWithTemplate([context], [template])`

* `context` {Object | null} [optional] The context that will be passed to the template function, usually it will be passed the view itself, so that `.model`, `.collection` etc are available.
* `template` {Function | String} [optional] A function that returns HTML or a string of HTML.

This is shortcut for the default rendering you're going to do in most every render method, which is: use the template property of the view to replace `this.el` of the view and re-register all handlers from the event hash and any other binding as described above.

```javascript
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
        this.renderWithTemplate();
    }
});
```

### query `view.query('.classname')`

Runs a [`querySelector`](https://developer.mozilla.org/en-US/docs/Web/API/document.querySelector) scoped within the view's current element (`view.el`), returning the first matching element in the dom-tree.

notes: 
- It will also match agains the root element.
- It will return the root element if you pass `''` as the selector.
- If no match is found it returns `undefined`

```javascript
var view = AmpersandView.extend({
    template: '<li><img class="avatar" src=""></li>',
    render: function () {
        this.renderWithTemplate(this);

        // cache an element for easy reference by other methods
        this.imgEl = this.query(".avatar");

        return this;
    }
});
```

### queryByHook `view.queryByHook('hookname')`

A convenience method for retrieving an element from the current view by it's `data-hook` attribute. Using this approach is a nice way to separate javascript view hooks/bindings from class/id selectors that are being used by CSS.

notes: 
- It also works if you're using multiple space-separated hooks. So something like `<img data-hook="avatar user-image"/>` would still match for `queryByHook('avatar')`.
- It simply uses `.query()` under the hood. So `.queryByHook('avatar')` is equivalent to `.query('[data-hook~=avatar]')` 
- It will also match to root elements.
- If no match is found it returns `undefined`.

```javascript
var view = AmpersandView.extend({
    template: '<li><img class='avatar-rounded' data-hook="avatar" src=""></li>',
    render: function () {
        this.renderWithTemplate(this);

        // cache an element for easy reference by other methods
        this.imgEl = this.queryByHook('avatar');

        return this;
    }
});
```

### queryAll `view.queryAll('.classname')`

Runs a [`querySelectorAll`](https://developer.mozilla.org/en-US/docs/Web/API/document.querySelectorAll) scoped within the view's current element (`view.el`), returning an array of all matching elements in the dom-tree.

notes:
- It will also include the root element if it matches the selector.
- It returns a real `Array` not a DOM collection.

### queryAllByHook `view.queryAllByHook('hookname')`

Uses `queryAll` method with a given `data-hook` attribute to retrieve all matching elements scoped within the view's current element (`view.el`), returning an array of all matching elements in the dom-tree or an empty array if no results has been found.

### cacheElements `view.cacheElements(hash)`
A shortcut for adding reference to specific elements within your view for access later. This is avoids excessive DOM queries and makes it easier to update your view if your template changes.

In your `render` method. Use it like so:

```javascript
render: function () {
  this.renderWithTemplate(this);

  this.cacheElements({
    pages: '#pages',
    chat: '#teamChat',
    nav: 'nav#views ul',
    me: '#me',
    cheatSheet: '#cheatSheet',
    omniBox: '[data-hook=omnibox]'
  });

  return this;
}
```

Then later you can access elements by reference like so: `this.pages`, or `this.chat`.

### listenToAndRun `view.listenToAndRun(object, eventsString, callback)`
Shortcut for registering a listener for a model and also triggering it right away.


### remove `view.remove()`

Removes a view from the DOM, and calls `stopListening` to remove any bound events that the view has `listenTo`'d.

### registerSubview `view.registerSubview(viewInstance)`

* viewInstance {Object} Any object with a "remove" method, typically an instantiated view. But doesn't have to be, it can be anything with a remove method. The remove method doesn't have to actually remove itself from the DOM (since the parent view is being removed anyway), it is generally just used for unregistering any handler that it set up.

### renderSubview `view.renderSubview(viewInstance, containerEl)`

* viewInstance {Object} Any object with a `.remove()`, `.render()` and an `.el` property that is the DOM element for that view. Typically this is just an instantiated view.
* containerEl {Element | String} This can either be an actual DOM element or a CSS selector string such as `.container`. If a string is passed ampersand-view runs `this.query('YOUR STRING')` to try to grab the element that should contain the sub view. If you don't supply a `containerEl` it will default to `this.el`.

This method is just sugar for the common use case of instantiating a view and putting in an element within the parent.

It will:

1. fetch your container (if you gave it a selector string)
2. register your subview so it gets cleaned up if parent is removed and so `view.parent` will be available when your subview's `render` method gets called
3. call the subview's `render()` method
4. append it to the container
5. return the subview

```javascript
var view = AmpersandView.extend({
    template: '<li><div class="container"></div></li>',
    render: function () {
        this.renderWithTemplate();

        //...

        var model = this.model;
        this.renderSubview(new SubView({
            model: model
        }), '.container');

        //...

    }
});
```

### subviews `view.subviews`

You can declare subviews that you want to render within a view, much like you would bindings. Useful for cases where the data you need for a subview may not be available on first render. Also, simplifies cases where you have lots of subviews.

When the parent view is removed the `remove` method of all subviews will be called as well.

You declare them as follows:

```javascript
var AmpersandView = require('ampersand-view');
var CollectionRenderer = require('ampersand-collection-view');
var ViewSwitcher = require('ampersand-view-switcher');


module.exports = AmpersandView.extend({
    template: '<div><div></div><ul data-hook="collection-container"></ul></div>',
    subviews: {
        myStuff: {
            container: '[data-hook=collection-container]',
            waitFor: 'model.stuffCollection',
            prepareView: function (el) {
                return new CollectionRenderer({
                    el: el,
                    collection: this.model.stuffCollection
                });
            }
        },
        tab: {
            container: '[data-hook=switcher]',
            constructor: ViewSwitcher
        }
    }
});
```

subview declarations consist of:

* container {String} Selector that describes the element within the view that should hold the subview.
* hook {String} Alternate method for specifying a container element using its `data-hook` attribute. Equivalent to `selector: '[data-hook=some-hook]'`.
* constructor {ViewConstructor} Any [view conventions compliant](http://ampersandjs.com/learn/view-conventions) view constructor. It will be initialized with `{el: [Element grabbed from selector], parent: [reference to parent view instance]}`. So if you don't need to do any custom setup, you can just provide the constructor.
* waitFor {String} String specifying they "key-path" (i.e. 'model.property') of the view that must be "truthy" before it should consider the subview ready.
* prepareView {Function} Function that will be called once any `waitFor` condition is met. It will be called with the `this` context of the parent view and with the element that matches the selector as the argument. It should return an instantiated view instance.

### delegateEvents `view.delegateEvents([events])`

Creates delegated DOM event handlers for view elements on `this.el`. If `events` is omitted, will use the `events` property on the view.

Generally you won't need to call `delegateEvents` yourself, if you define an `event` hash when extending AmpersandView, `delegateEvents` will be called for you when the view is initialize.

Events is a hash of  `{"event selector": "callback"}*`

Will unbind existing events by calling `undelegateEvents` before binding new ones when called. Allowing you to switch events for different view contexts, or different views bound to the same element.

```javascript
{
  'mousedown .title':  'edit',
  'click .button':     'save',
  'click .open':       function (e) { ... }
}
```

### undelegateEvents `view.undelegateEvents()`

Clears all callbacks previously bound to the view with `delegateEvents`.
You usually don't need to use this, but may wish to if you have multiple views attached to the same DOM element.

## Changelog

- 7.0.0 Replacing use of `role` in lieu of `data-hook` for [accessibility reasons discussed here](https://github.com/AmpersandJS/ampersand/issues/21)
- [insert period of poor changelog management here], this will not happen again now that ampersand is public.
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

* Run `npm test` to run the tests in a headless phantom browser.
* Run `npm start` to start a webserver with the test harness, and then visit http://localhost:3000 to open and run the tests in your browser of choice.

## Like this?

Follow [@HenrikJoreteg](http://twitter.com/henrikjoreteg) on twitter and check out my recently released book: [human javascript](http://humanjavascript.com) which includes a full explanation of this as well as a whole bunch of other stuff for building awesome single page apps.

## license

MIT

<!---endhide-->
