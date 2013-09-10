/*global $*/
(function () {
  "use strict";
  var Backbone, _;

  if (typeof require !== 'undefined') {
    Backbone = require('backbone');
    _ = require('underscore');
  } else {
    Backbone = window.Backbone;
    _ = window._;
  }

  var HumanView = Backbone.View.extend({
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

    // ## renderAndBind
    // Commbo for renderWithTemplate and registering bindings
    renderAndBind: function (context, templateArg) {
      this.renderWithTemplate(context, templateArg);
      this.registerBindings();
      return this;
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
      var html = _.isString(template) ? template : template(context || {});
      var newEl = $(html)[0];
      // this is needed because jQuery and others
      // do weird things if you try to replace the body.
      // Also doing $(newEl)[0] will give you first child if
      // it's a <body> element for some reason.
      if (this.el === document.body) {
        document.body.innerHTML = html;
        this.delegateEvents();
      } else {
        $(this.el).replaceWith(newEl);
        // We don't call delegate events if rendered by parent
        // this solves a stupid bug in jQuery where you can't
        // attach event handlers to a detached element
        // ref: http://api.jquery.com/on/#direct-and-delegated-events
        this.setElement(newEl, !this.renderedByParentView);
      }
    },

    // ## addReferences
    // This is a shortcut for adding reference to specific elements within your view for
    // access later. This is avoids excessive DOM queries and gives makes it easier to update
    // your view if your template changes. You could argue whether this is worth doing or not,
    // but I like it.
    // In your `render` method. Use it like so:
    //
    //     render: function () {
    //       this.basicRender();
    //       this.addReferences({
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
    addReferences: function (hash) {
      for (var item in hash) {
        this['$' + item] = $(hash[item], this.el);
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
            view.renderedByParentView = true;
            view.render();
          }
          containerEl[options.reverse ? 'prepend' : 'append'](view.el);
          view.delegateEvents();
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

    // ## remove
    // Overwrites Backbone's `remove` to also unbinds handlers
    // for models in any views rendered by `renderCollection`.
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
    module.exports = HumanView;
  } else {
    window.HumanView = HumanView;
  }

}());
