var Statey = require('statey');
var bbExtend = require('backbone-extend-standalone');
var Events = require('backbone-events-standalone');
var domify = require('domify');
var _ = require('underscore');
var events = require('component-events');
var classes = require('component-classes');


function View(options) {
  this.cid = _.uniqueId('view');
  options || (options = {});
  _.extend(this, _.pick(options, viewOptions));
  this.initialize.apply(this, arguments);
  if (this.autoRender && this.template) {
    this.renderAndBind({
      model: this.model,
      collection: this.collection
    }, this.template);
  }
  if (this.el) this.setElement(this.el);
}

// Cached regex to split keys for `delegate`.
var delegateEventSplitter = /^(\S+)\s*(.*)$/;

// List of view options to be merged as properties.
var viewOptions = ['model', 'collection', 'el', 'events', 'autoRender'];

// Set up all inheritable **Backbone.View** properties and methods.
_.extend(View.prototype, Events, {

  // jQuery delegate for element lookup, scoped to DOM elements within the
  // current view. This should be preferred to global lookups where possible.
  $: function (selector) {
    debugger;
    return this.$el.find(selector);
  },

  getAll: function (selector) {
    return this.el.querySelectorAll(selector);
  },

  get: function (selector) {
    return (typeof selector === 'string') this.el.querySelector(selector) : selector;
  },

  // Initialize is an empty function by default. Override it with your own
  // initialization logic.
  initialize: function () {},

  // **render** is the core function that your view should override, in order
  // to populate its element (`this.el`), with the appropriate HTML.
  render: function () {
    return this;
  },

  // Remove this view by taking the element out of the DOM, and removing any
  // applicable Backbone.Events listeners.
  remove: function () {
    if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
    _.chain(this._subviews).flatten().invoke('remove');
    this.stopListening();
    return this;
  },

  // Change the view's element (`this.el` property), including event
  // re-delegation.
  setElement: function (element, delegate) {
    if (this.events) this.events.unbind();
    this.el = element;
    this.events = events(this.el, this);
    if (delegate !== false) this.delegateEvents();
    return this;
  },

  // Set callbacks, where `this.events` is a hash of
  //
  // *{"event selector": "callback"}*
  //
  //     {
  //       'mousedown .title':  'edit',
  //       'click .button':     'save',
  //       'click .open':       function (e) { ... }
  //     }
  //
  // pairs. Callbacks will be bound to the view, with `this` set properly.
  // Uses event delegation for efficiency.
  // Omitting the selector binds the event to `this.el`.
  // This only works for delegate-able events: not `focus`, `blur`, and
  // not `change`, `submit`, and `reset` in Internet Explorer.
  delegateEvents: function (events) {
    if (!(events || (events = _.result(this, 'events')))) return this;
    this.undelegateEvents();
    for (var key in events) {
      var method = events[key];
      var match = key.match(delegateEventSplitter);
      var eventName = match[1];
      var selector = match[2];
      eventName += '.delegateEvents' + this.cid;
      if (selector === '') {
        this.events.bind(eventName, method);
      } else {
        this.events.bind(eventName, selector, method);
      }
    }
    return this;
  },

  // Clears all callbacks previously bound to the view with `delegateEvents`.
  // You usually don't need to use this, but may wish to if you have multiple
  // Backbone views attached to the same DOM element.
  undelegateEvents: function () {
    this.events.unbind();
    return this;
  },

  // ## registerSubview
  // Pass it a view. This can be anything with a `remove` method
  registerSubview: function (view) {
    // Storage for our subviews.
    this._subviews || (this._subviews = []);
    this._subviews.push(view);
    // If view has an 'el' it's a single view not
    // an array of views registered by renderCollection
    // so we store a reference to the parent view.
    if (view.el) view.parent = this;
    return view;
  },

  // ## renderSubview
  // Pass it a view instance and a container element
  // to render it in. It's `remove` method will be called
  // when theh parent view is destroyed.
  renderSubview: function (view, container) {
    if (typeof container === 'string') {
      container = this.get(container);
    }
    this.registerSubview(view);
    view.render();
    container.appendChild(view.el);
    return view;
  },

  // ## registerBindings
  // This makes it simple to bind model attributes to the DOM.
  // To use it, add a declarative bindings to your view like this:
  //
  //   var ProfileView = HumanView.extend({
  //     template: 'profile',
  //     textBindings: {
  //       'name': '.name'
  //     },
  //     classBindings: {
  //       'active': ''
  //     },
  //     render: function () {
  //       this.renderAndBind();
  //       return this;
  //     }
  //   });
  registerBindings: function (specificModel, bindings) {
    var self = this;
    var types = {
      textBindings: 'text',
      htmlBindings: 'html',
      srcBindings: 'src',
      hrefBindings: 'href',
      attributeBindings: '',
      inputBindings: 'val'
    };
    var model = specificModel || this.model;
    var bindingObject = bindings || this;

    if (!model) throw new Error('Cannot register bindings without a model');
    _.each(types, function (methodName, bindingType) {
      _.each(bindingObject[bindingType], function (selector, key) {
        var func;
        var attrName = function () {
          var res;
          if (bindingType === 'attributeBindings') {
            res = selector[1];
            selector = selector[0];
            return res;
          } else if (methodName === 'href' || methodName === 'src') {
            return methodName;
          }
        }();
        func = function () {
          var el = self.getAll(selector);
          if (attrName) {
            el.setAttribute(attrName, model.get(key));
          } else {
            el[methodName](model.get(key));
          }
        };
        self.listenTo(model, 'change:' + key, func);
        func();
      });
    });

    // Class bindings are a bit special. We have to
    // remove previous, etc.
    _.each(bindingObject.classBindings, function (selector, key) {
      var func = function () {
        var newVal = model.get(key);
        var prevVal = model.previous(key);
        var el = self.get(selector);

        if (_.isBoolean(newVal)) {
          if (newVal) {
            el.classList.add(key);
          } else {
            el.classList.remove(key);
          }
        } else {
          if (prevVal) el.classList.remove(prevVal);
          el.classList.add(newVal);
        }
      };
      self.listenTo(model, 'change:' + key, func);
      func();
    });

    return this;
  },

  // ## renderAndBind
  // Commbo for renderWithTemplate and registering bindings
  renderAndBind: function (context, templateArg) {
    this.renderWithTemplate(context, templateArg);
    if (this.model) this.registerBindings();
    return this;
  },

  // ## getByRole
  // Gets an element within a view by its role attribute.
  // Also works for the root `el` if it has the right role.
  getByRole: function (role) {
    return this.el.querySelector('[role="' + role + '"]') ||
      ((this.el.getAttribute('role') === role && this.el) || undefined);
  },

  // Shortcut for doing everything we need to do to
  // render and fully replace current root element.
  // Either define a `template` property of your view
  // or pass in a template directly.
  // The template can either be a string or a function.
  // If it's a function it will be passed the `context`
  // argument.
  renderWithTemplate: function (context, templateArg) {
    var template = templateArg || this.template;
    if (!template) throw new Error('Template string or function needed.');
    var newDom = domify(_.isString(template) ? template : template(context || {model: this.model}));
    var parent = this.el && this.el.parentNode;
    if (parent) parent.replaceChild(newDom, this.el);
    if (newDom[1]) throw new Error('Views can only have one root element.');
    this.setElement(newDom, !this.renderedByParentView);
  },

  // ## cacheElements
  // This is a shortcut for adding reference to specific elements within your view for
  // access later. This is avoids excessive DOM queries and gives makes it easier to update
  // your view if your template changes.
  //
  // In your `render` method. Use it like so:
  //
  //     render: function () {
  //       this.basicRender();
  //       this.cacheElements({
  //         pages: '#pages',
  //         chat: '#teamChat',
  //         nav: 'nav#views ul',
  //         me: '#me',
  //         cheatSheet: '#cheatSheet',
  //         omniBox: '#awesomeSauce'
  //       });
  //     }
  //
  // Then later you can access elements by reference like so: `this.$pages`, or `this.$chat`.
  cacheElements: function (hash) {
    for (var item in hash) {
      this[item] = this.get(hash[item]);
    }
  },

  // ## listenToAndRun
  // Shortcut for registering a listener for a model
  // and also triggering it right away.
  listenToAndRun: function (object, events, handler) {
    var bound = _.bind(handler, this);
    this.listenTo(object, events, bound);
    bound();
  },

  // ## animateRemove
  // Placeholder for if you want to do something special when they're removed.
  // For example fade it out, etc.
  // Any override here should call `.remove()` when done.
  animateRemove: function () {
    this.remove();
  },

  // ## renderCollection
  // Method for rendering a collections with individual views.
  // Just pass it the collection, and the view to use for the items in the
  // collection.
  renderCollection: function (collection, ViewClass, container, opts) {
    var self = this;
    var views = [];
    var options = _.defaults(opts || {}, {
      filter: null,
      viewOptions: {},
      reverse: false
    });
    container = (typeof container === 'string') ? this.get(container) : container;

    // store a reference on the view to it's collection views
    // so we can clean up memory references when we're done
    this.registerSubview(views);

    function getViewBy(model) {
      return _.find(views, function (view) {
        return model === view.model;
      });
    }

    function addView(model, collection, opts) {
      var matches = options.filter ? options.filter(model) : true;
      var view;
      if (matches) {
        view = getViewBy(model);
        if (!view) {
          view = new ViewClass(_({model: model, collection: collection}).extend(options.viewOptions));
          views.push(view);
          view.parent = self;
          view.renderedByParentView = true;
          view.render({containerEl: container});
        }
        // give the option for the view to choose where it's inserted if you so choose
        if (!view.insertSelf) {
          if (options.reverse) {
            container.insertBefore(view.el, container.firstChild);
          } else {
            container.appendChild(view.el);
          }
        }
        view.delegateEvents();
      }
    }
    function reRender() {
      // empty without using jQuery's empty (which removes jQuery handlers)
      container.innerHTML = '';
      collection.each(addView);
    }
    this.listenTo(collection, 'add', addView);
    this.listenTo(collection, 'remove', function (model) {
      var index = views.indexOf(getViewBy(model));
      if (index !== -1) {
        // remove it if we found it calling animateRemove
        // to give user option of gracefully destroying.
        views.splice(index, 1)[0].animateRemove();
      }
    });
    this.listenTo(collection, 'move sort', reRender);
    this.listenTo(collection, 'refresh reset', function () {
      // empty array calling `remove` on each
      // without re-defining `views`
      while (views.length) {
        views.pop().remove();
      }
      reRender();
    });
    reRender();
  }
});

View.extend = bbExtend;
module.exports = View;
