var State = require('ampersand-state');
var Events = require('backbone-events-standalone');
var domify = require('domify');
var _ = require('underscore');
var events = require('events-mixin');
var matches = require('matches-selector');
var bindings = require('dom-bindings');
var getPath = require('get-object-path');


function View(attrs) {
    this.cid = _.uniqueId('view');
    attrs || (attrs = {});
    attrs.init = false;
    BaseState.call(this, attrs, {init: false});
    this.on('change:el', this.handleElementChange, this);
    this._parsedBindings = bindings(this.bindings);
    this._initializeBindings();
    this._initializeSubviews();
    this.initialize.apply(this, arguments);
    this.set(_.pick(attrs, viewOptions));
    if (this.autoRender && this.template) {
        this.render();
    }
}

var BaseState = State.extend({
    dataTypes: {
        element: {
            set: function (newVal) {
                return {
                    val: newVal,
                    type: newVal instanceof Element ? 'element' : typeof newVal
                };
            },
            compare: function (el1, el2) {
                return el1 === el2;
            }
        },
        collection: {
            set: function (newVal) {
                return {
                    val: newVal,
                    type: newVal && newVal.isCollection ? 'collection' : typeof newVal
                };
            },
            compare: function (currentVal, newVal) {
                return currentVal === newVal;
            }
        }
    },
    props: {
        model: 'state',
        el: 'element',
        collection: 'collection'
    },
    derived: {
        rendered: {
            deps: ['el'],
            fn: function () {
                return !!this.el;
            }
        },
        hasData: {
            deps: ['model'],
            fn: function () {
                return !!this.model;
            }
        }
    }
});

// Cached regex to split keys for `delegate`.
var delegateEventSplitter = /^(\S+)\s*(.*)$/;

// List of view options to be merged as properties.
var viewOptions = ['model', 'collection', 'el'];

View.prototype = Object.create(BaseState.prototype);

// Set up all inheritable properties and methods.
_.extend(View.prototype, {

    // Get an single element based on CSS selector scoped to this.el
    // if you pass an empty string it return `this.el`.
    // If you pass an element we just return it back.
    // This lets us use `get` to handle cases where users
    // can pass a selector or an already selected element.
    get: function (selector) {
        if (!selector) return this.el;
        if (typeof selector === 'string') {
            if (matches(this.el, selector)) return this.el;
            return this.el.querySelector(selector) || undefined;
        }
        return selector;
    },

    // Returns an array of elements based on CSS selector scoped to this.el
    // if you pass an empty string it return `this.el`.
    getAll: function (selector) {
        var res = [];
        if (!this.el) return res;
        if (selector === '') return [this.el];
        if (matches(this.el, selector)) res.push(this.el);
        return res.concat(Array.prototype.slice.call(this.el.querySelectorAll(selector)));
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function () {},

    // **render** is the core function that your view can override, its job is
    // to populate its element (`this.el`), with the appropriate HTML.
    render: function () {
        this.renderWithTemplate(this);
        return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    remove: function () {
        var parsedBindings = this._parsedBindings;
        if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
        _.chain(this._subviews).flatten().invoke('remove');
        this.stopListening();
        // TODO: Not sure if this is actually necessary.
        // Just trying to de-reference this potentially large
        // amount of generated functions to avoid memory leaks.
        _.each(parsedBindings, function (properties, modelName) {
            _.each(properties, function (value, key) {
                delete parsedBindings[modelName][key];
            });
            delete parsedBindings[modelName];
        });
        this.trigger('remove', this);
        return this;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    handleElementChange: function (element, delegate) {
        if (this.eventManager) this.eventManager.unbind();
        this.eventManager = events(this.el, this);
        this.delegateEvents();
        this._applyBindingsForKey();
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

    _applyBindingsForKey: function (name) {
        if (!this.el) return;
        var fns = this._parsedBindings.getGrouped(name);
        var item;
        for (item in fns) {
            fns[item].forEach(function (fn) {
                fn(this.el, getPath(this, item), _.last(item.split('.')));
            }, this);
        }
    },

    _initializeBindings: function () {
        if (!this.bindings) return;
        this.on('all', function (eventName) {
            if (eventName.slice(0, 7) === 'change:') {
                this._applyBindingsForKey(eventName.split(':')[1]);
            }
        }, this);
    },

    // ## _initializeSubviews
    // this is called at setup and grabs declared subviews
    _initializeSubviews: function () {
        if (!this.subviews) return;
        for (var item in this.subviews) {
            this._parseSubview(this.subviews[item]);
        }
    },

    // ## _parseSubview
    // helper for parsing out the subview declaration and registering
    // the `waitFor` if need be.
    _parseSubview: function (subview) {
        var self = this;
        var opts = {
            selector: subview.container || '[role=' + subview.role + ']',
            waitFor: subview.waitFor || '',
            prepareView: subview.prepareView || function (el) {
                return new subview.constructor({
                    el: el,
                    parent: self
                });
            }
        };
        function action() {
            var el, subview;
            // if not rendered or we can't find our element, stop here.
            if (!this.el || !(el = this.get(opts.selector))) return;
            if (!opts.waitFor || getPath(this, opts.waitFor)) {
                subview = this[name] = opts.prepareView.call(this, el);
                subview.render();
                this.registerSubview(subview);
                this.off('change', action);
            }
        }
        // we listen for main `change` items
        this.on('change', action, this);
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
        var newDom = domify(_.isString(template) ? template : template(context || this));
        var parent = this.el && this.el.parentNode;
        if (parent) parent.replaceChild(newDom, this.el);
        if (newDom[1]) throw new Error('Views can only have one root element.');
        this.el = newDom;
        return this;
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
    // Then later you can access elements by reference like so: `this.pages`, or `this.chat`.
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
                    if (!view.rendered) view.render({containerEl: container});
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
            collection.each(function (model) {
                addView(model);
            });
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

View.extend = BaseState.extend;
module.exports = View;
