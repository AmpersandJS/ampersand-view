# AmpersandView

## extend `AmpersandView.extend(properties)`

### template
### autoRender
### events
### bindings

## el `view.el`

## get `view.get('.classname')`

Runs a [`querySelector`](https://developer.mozilla.org/en-US/docs/Web/API/document.querySelector) scoped within the view's current element (`view.el`), returning the first matching element in the dom-tree.

```javascript
var view = AmpersandView.extend({
    template: '<li><img role="avatar" src=""></li>',
    render: function () {
        this.renderWithTemplate(this);

        // cache an element for easy reference by other methods
        this.imgEl = this.get("[role=avatar]");

        return this;
    }
});
```

## getByRole `view.getByRole('rolename')`

A convenience method for retrieving an element from the current view by role. Using the role attribute is a nice way to separate javascript view hooks/bindings from class/id selectors that are being used by css:

```javascript
var view = AmpersandView.extend({
    template: '<li><img class='avatar-rounded' role="avatar" src=""></li>',
    render: function () {
        this.renderWithTemplate(this);

        // cache an element for easy reference by other methods
        this.imgEl = this.getByRole('avatar');

        return this;
    }
});
```


## getAll `view.getAll('.classname')`

Runs a [`querySelectorAll`](https://developer.mozilla.org/en-US/docs/Web/API/document.querySelectorAll) scoped within the view's current element (`view.el`), returning all the matching elements in the dom-tree.

```javascript
```


## constructor `new AmpersandView([options])`

The default `AmpersandView` constructor accepts an optional `options` object, and:

* Attaches the following options directly to the instaniated view, overriding the defaults: `model`, `collection`, `el`.
* Sets up event bindings defined in the `events` hash.
* Sets up the model bindings defined in the `bindings` hash.
* Initializes any subviews defined in the `subviews` hash.
* Calls `initialize` passing it the options hash.
* Renders the view, if `autoRender` is true and a template is defined.

Typical use-cases for the options hash:
* To initialize a view with an `el` _already_ in the DOM, pass it as an option: `new AmpersandView({ el: existingElement })`.
* To perform extra work when initializing a new view, override the `initialize` function in the extend call, rather than modifying the constructor, it's easier.


## initialize `new AmpersandView([options])`

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


## render `view.render()`

Render is a part of the [Ampersand View conventions](???). You can override the default view method when extending AmpersandView if you wish, but as part of the conventions, calling render should:

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


## renderWithTemplate `view.renderWithTemplate(contextObject, [template])`

Shortcut for doing everything we need to do to render and fully replace the current root element. This method is called by the default `render` method. `template` is optional, if undefined it will fallback to the `template` property on the view.

The template can either be a string or a function. If it's a function it will be passed the `context` argument. The template should return either a string, or a DOM element. In either case, a single top level node should be returned, e.g:

*Bad*:

```html
<h1>Hello</h1>
<p>Hello, world!</p>
```

*Good:*

```html
<div>
    <h1>Hello</h1>
    <p>Hello, world!</p>
</div>
```


## cacheElements `view.cacheElements(hash)`
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
    omniBox: '[role=omnibox]'
  });

  return this;
}
```

Then later you can access elements by reference like so: `this.pages`, or `this.chat`.


## listenToAndRun `view.listenToAndRun(object, eventsString, callback)`
Shortcut for registering a listener for a model and also triggering it right away.

## remove `view.remove()`

## animateRemove `view.animateRemove()`

## delegateEvents `view.delegateEvents([events])`

## undelegateEvents `view.undelegateEvents()`

## registerSubview `view.registerSubview(initializedSubview)`

## renderSubview `view.renderSubview(SubviewConstructor, '.container-to-render-to')`

## renderCollection `view.renderCollection(collection, ViewClass, '.container-to-render-to', [options])`
