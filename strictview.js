;(function () {
var Backbone, _;

if (typeof require !== 'undefined') {
    Backbone = require('backbone');
    _ = require('underscore');
} else {
    Backbone = window.Backbone;
    _ = window._;
}

var StrictView = Backbone.View.extend({
    // ###registerBindings
    // This makes it simple to bind model attributes to the view.
    // To use it, add a `classBindings` and/or a `contentBindings` attribute
    // to your view and call `this.registerBindings()` at the end of your view's
    // `render` function. It's also used by `basicRender` which lets you do
    // a complete attribute-bound views with just this:
    //
    //         var ProfileView = BaseView.extend({
    //             template: 'profile',
    //             contentBindings: {
    //                 'name': '.name'
    //             },
    //             classBindings: {
    //                 'active': ''
    //             },
    //             render: function () {
    //                 this.basicRender();
    //                 return this;
    //             }
    //         });
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
                    var el = (selector.length > 0) ? self.$(selector) : $(self.el);
                    if (attrName) {
                        el.attr(attrName, model.get(key));
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
                var el = (selector.length > 0) ? self.$(selector) : $(self.el);

                if (_.isBoolean(newVal)) {
                    if (newVal) {
                        el.addClass(key);
                    } else {
                        el.removeClass(key);
                    }
                } else {
                    if (prevVal) el.removeClass(prevVal);
                    el.addClass(newVal);
                }
            };
            self.listenTo(model, 'change:' + key, func);
            func();
        });

        return this;
    },

    // ###basicRender
    // All the usual stuff when I render a view. It assumes that the view has a `template` property
    // that contains a function that can be called to return HTML.
    // You can optionally pass in a template function as the second argument.
    basicRender: function (context, templateArgument) {
        var template = templateArgument || this.template;
        var newEl = $(_.isString(template) ? template : template(context || {}))[0];
        $(this.el).replaceWith(newEl);
        this.setElement(newEl);
        this.registerBindings();
        this.delegateEvents();
        return this;
    },

    // ### listenToAndRun
    // Shortcut for listening and triggering
    listenToAndRun: function (object, events, handler) {
        var bound = _.bind(handler, this);
        this.listenTo(object, events, bound);
        bound();
    },

    // ### animateRemove
    // Placeholder for if you want to do something special when they're removed.
    // For example fade it out, etc.
    // Any override here should call `.remove()` when done.
    animateRemove: function () {
        this.remove();
    },

    // ###renderCollection
    // Method for rendering a collections with individual views.
    // Just pass it the collection, and the view to use for the items in the
    // collection.
    renderCollection: function (collection, ViewClass, container, opts) {
        var self = this;
        var views = {};
        var options = _.defaults(opts || {}, {
            filter: null,
            viewOptions: {},
            reverse: false
        });
        var containerEl = $(container);

        // store a reference on the view to it's collection views
        // so we can clean up memory references when we're done
        if (!this.collectionViews) this.collectionViews = [];
        this.collectionViews.push(views);

        function addView(model, collection, opts) {
            var matches = options.filter ? options.filter(model) : true;
            var view;
            if (matches) {
                view = views[model.cid];
                if (!view) {
                    view = views[model.cid] = new ViewClass(_({model: model, collection: collection}).extend(options.viewOptions));
                    view.parent = self;
                    view.render();
                }
                containerEl[options.reverse ? 'prepend' : 'append'](view.el);
            }
        }
        function reRender() {
            containerEl.empty();
            collection.each(addView);
        }
        this.listenTo(collection, 'add', addView);
        this.listenTo(collection, 'remove', function (model) {
            var view = views[model.cid];
            if (view) {
                delete views[model.cid];
                view.animateRemove();
            }
        });
        this.listenTo(collection, 'move sort', reRender);
        this.listenTo(collection, 'refresh reset', function () {
            _.each(views, function (view) {
                view.remove();
            });
            views = {};
            reRender();
        });
        reRender();
    },

    // version of remove that also ensures any handlers registered by
    // views rendered by `renderCollection` also get cleaned up.
    // renderCollection
    remove: function () {
        _.each(this.collectionViews, function (something) {
            _.each(something, function (view) {
                view.$el.remove();
                view.stopListening();
            });
        });
        // call super
        return Backbone.View.prototype.remove.call(this);
    }
});

if (!_.isUndefined(module) && !_.isUndefined(module.exports)) {
    module.exports = StrictView;
} else {
    window.StrictView = StrictView;
}

})();
