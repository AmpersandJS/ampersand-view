var ampersandExtend = require('ampersand-class-extend');
var Events = require('backbone-events-standalone');
var domify = require('domify');
var _ = require('underscore');
var events = require('events-mixin');
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
var viewOptions = ['model', 'collection', 'el', 'autoRender'];

// Set up all inheritable properties and methods.
_.extend(View.prototype, Events, {

  // Get an single element based on CSS selector scoped to this.el
  // if you pass an empty string it return `this.el`.
  // If you pass an element we just return it back.
  // This lets us use `get` to handle cases where users
  // can pass a selector or an already selected element.
  get: function (selector) {
    if (!selector) return this.el;
    if (typeof selector === 'string') {
      return this.el.querySelector(selector) || undefined;
    }
    return selector;
  },

  // Returns an array of elements based on CSS selector scoped to this.el
  // if you pass an empty string it return `this.el`.
  getAll: function (selector) {
    if (selector === '') return [this.el];
    return Array.prototype.slice.call(this.el.querySelectorAll(selector));
  },

  // Initialize is an empty function by default. Override it with your own
  // initialization logic.
  initialize: function () {},

  // **render** is the core function that your view should override, in order
  // to populate its element (`this.el`), with the appropriate HTML.
  render: function () {
    this.renderAndBind();
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
    if (this.eventManager) this.eventManager.unbind();
    this.el = element;
    this.eventManager = events(this.el, this);
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
      this.eventManager.bind(key, events[key]);
    }
    return this;
  },

  // Clears all callbacks previously bound to the view with `delegateEvents`.
  // You usually don't need to use this, but may wish to if you have multiple
  // Backbone views attached to the same DOM element.
  undelegateEvents: function () {
    this.eventManager.unbind();
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
  //     bindings: {
  //       name: '#username',
  //       active: ['.name', 'class'],
  //       classList: ['item', 'classList'],
  //       url: ['a.link', 'href']
  //     },
  //     render: function () {
  //       this.renderAndBind();
  //       return this;
  //     }
  //   });
  //
  registerBindings: function (model, bindings) {
    var self = this;
    var processedBindings = {};
    model || (model = this.model);
    bindings || (bindings = this.bindings);
    if (!model) throw new Error('Cannot register bindings without a model');
    if (!bindings) return this;

    // create new object with same keys but
    // with arrays for values.
    // This is where we'll push our results
    _.each(_.keys(bindings), function (key) {
      processedBindings[key] = [];
    });

    function addBinding(propName, definition) {
      var processedDef = processedBindings[propName];
      var selector, attr, name, split;
      if (typeof definition === 'string') {
        processedDef.push([definition, 'text']);
      } else {
        selector = definition[0];
        attr = definition[1];
        name = definition[2];
        split = attr.split(' ');
        if (split.length > 1) {
          _.each(split, function (attributeName) {
            processedDef.push([selector, attributeName, name]);
          });
        } else {
          processedDef.push([selector, attr, name]);
        }
      }
    }

    // extract any nested bindings
    _.each(bindings, function (value, propertyName) {
      if (_.isArray(value) && _.isArray(value[0])) {
        _.each(value, function (item) {
          addBinding(propertyName, item);
        });
      } else {
        addBinding(propertyName, value);
      }
    });

    _.each(processedBindings, function (value, propertyName) {
      _.each(value, function (value) {
        var selector = value[0];
        var attr = value[1];
        var name = value[2];
        var fn = function () {
          _.each(self.getAll(selector), function (el) {
            var newVal = model.get(propertyName);
            var isBool = _.isBoolean(newVal);
            var prevVal;
            var classList;

            // coerce new val to string if undefined
            if (!isBool && _.isUndefined(newVal)) newVal = '';

            if (attr === 'text') {
              el.textContent = newVal;
              return;
            }

            // handle special "class" case
            if (attr === 'class') {
              classList = classes(el);
              if (isBool) {
                classList.toggle(propertyName, newVal);
              } else {
                prevVal = model.previous(propertyName);
                if (prevVal) classList.remove(prevVal);
                if (newVal) classList.add(newVal);
              }
              return;
            }

            // treat 'classList' attrs like
            // set/get for class attr
            if (attr === 'classList') attr = 'class';

            // now we can treat them all the same
            if (isBool && !newVal) {
              el.removeAttribute(name);
            } else {
              el.setAttribute(attr, name || newVal);
            }
          });
        };
        // bind/run it
        self.listenToAndRun(model, 'change:' + propertyName, fn);
      });
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
    return this.get('[role="' + role + '"]') ||
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

View.extend = ampersandExtend;
module.exports = View;
