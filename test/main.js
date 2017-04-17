var test = require('tape');
var AmpersandModel = require('ampersand-model');
var AmpersandCollection = require('ampersand-rest-collection');
var AmpersandView = require('../ampersand-view');

var contains = function (str1, str2) {
    return str1.indexOf(str2) !== -1;
};

var Model = AmpersandModel.extend({
    props: {
        id: 'number',
        name: ['string', true],
        html: 'string',
        url: 'string',
        something: 'string',
        fireDanger: 'string'
    },
    session: {
        active: 'boolean'
    },
    derived: {
        classes: {
            deps: ['something', 'fireDanger', 'active'],
            fn: function () {
                return this.something + this.active;
            }
        }
    }
});

function getView(bindings, model) {
    if (!bindings.template) {
        bindings.template = '<li><span></span><img></li>';
    }
    var View = AmpersandView.extend(bindings);
    var view = new View({
        model: model || new Model()
    });
    return view.renderWithTemplate();
}

test('event behavior with over-ridden `render` & `remove` fns', function (t) {
    var renderCount = 0;
    var removeCount = 0;
    t.plan(7);
    var ChildView = AmpersandView.extend({
        render: function() {
            AmpersandView.prototype.render.call(this);
            t.ok(true, 'child view render called');
        }
    });
    var GrandChildView = AmpersandView.extend({
        render: function() {
            ChildView.prototype.render.call(this);
            t.ok(true, 'grand child view render called');
        }
    });
    var detachedEl = document.createElement('div');
    var view = new GrandChildView({
        template: '<span></span>',
        el: detachedEl
    });
    view.on('render', function(view, value) {
        ++renderCount;
        t.ok(true, 'view `render` event happened on `render()`');
    });
    view.on('remove', function(view, value) {
        ++removeCount;
    });
    view.render();
    t.equal(removeCount, 0, '`remove` event not called, pre- or post- render()');
    t.equal(renderCount, 1, '`render` triggered exactly once, post- render()');
    view.remove();
    t.equal(removeCount, 1, '`remove` triggered exactly once, post- remove()');
    t.equal(renderCount, 1, '`render` not triggered, post- remove()');
    t.end();
});


test('standard `rendered` attr behavior', function (t) {
    var caughtRenderEvt = false;
    var detachedEl = document.createElement('div');
    var view = new AmpersandView({
        template: '<span></span>',
        el: detachedEl
    });
    view.on('change:rendered', function() {
        caughtRenderEvt = !caughtRenderEvt;
    });
    t.notOk(view.rendered, 'view not `rendered` prior to `render()` call');
    view.render();
    t.ok(view.rendered, 'view `rendered` post `render()` call');
    t.ok(caughtRenderEvt, 'view `rendered` evt observed on `render()` call');
    view.remove();
    t.notOk(caughtRenderEvt, 'view `rendered` evt observed on `remove()` call');
    t.notOk(view.rendered, 'view not `rendered` post `remove()` call');
    t.end();
});

test('user over-ridden `render()` and `remove()` behavior', function (t) {
    var view;
    var RenderTestView = AmpersandView.extend({
        template: '<span></span>',
        render: function() {
            t.ok(true, 'user defined `render()` executed');
        },
        remove: function() {
            t.ok(true, 'user defined `remove()` executed');
        }
    });
    t.plan(4);
    view = new RenderTestView();
    view.on('change:rendered', function() {
        t.ok(true, '`rendered` triggered on custom render/remove');
    });
    view.render();
    view.remove();
    t.end();
});

test('Model, collection, and el become properties', function (t) {
    var model = new Model();
    var collection = new AmpersandCollection();
    var el = document.createElement('div');
    var view = new AmpersandView({
        model: model,
        collection: collection,
        el: el
    });

    t.equal(view.model, model);
    t.equal(view.collection, collection);
    t.equal(view.el, el);
    t.end();
});

test('registerSubview', function (t) {
    var removeCalled = 0;
    var SubView = AmpersandView.extend({
        template: '<div></div>',
        render: function () {
            this.renderWithTemplate();
            this.el.className = 'subview';
        },
        remove: function () {
            removeCalled++;
        }
    });
    var View = AmpersandView.extend({
        template: '<section><div id="parent"></div></section>',
        render: function () {
            this.renderWithTemplate();
            // all of these should work
            this.renderSubview(new SubView(), this.query('#parent'));
            this.renderSubview(new SubView(), '#parent');

            // some other thing with a remove method
            this.registerSubview({remove: function () {
                removeCalled++;
            }});
        }
    });

    var main = new View({
        el: document.createElement('div')
    });

    main.render();
    t.equal(main.queryAll('.subview').length, 2);
    main.remove();
    t.equal(removeCalled, 3);
    t.end();
});

test('registerSubview: default container to this.el', function (t) {
    var removeCalled = 0;
    var SubView = AmpersandView.extend({
        template: '<div></div>',
        render: function () {
            this.renderWithTemplate();
            this.el.className = 'subview';
        },
        remove: function () {
            removeCalled++;
        }
    });
    var View = AmpersandView.extend({
        template: '<section></section>',
        render: function () {
            this.renderWithTemplate();
            this.renderSubview(new SubView());
            this.renderSubview(new SubView());
        }
    });

    var main = new View({
        el: document.createElement('div')
    });

    main.render();
    t.equal(main.queryAll('.subview').length, 2);
    t.equal(main.el.childNodes.length, 2);
    main.remove();
    t.equal(removeCalled, 2);
    t.end();
});

test('caching elements', function(t) {
  var View = AmpersandView.extend({
    template: '<p><span></span></p>',
    render: function () {
      this.renderWithTemplate();
      return this.cacheElements(({span:'span'}));
    }
  });
  var instance = new View(),
     rendered = instance.render();
  t.equal(instance, rendered);
  t.equal(typeof rendered.span, 'object');
  t.end();
});

test('listen to and run', function (t) {
    t.plan(1);
    var model = new Model({
        props: {
            name: 'string'
        }
    });
    var View = AmpersandView.extend({
        initialize: function () {
            this.model = model;
            this.listenToAndRun(this.model, 'something', this.handler);
            t.end();
        },
        handler: function () {
            t.pass('handler ran');
        }
    });
    new View();
});

test('text bindings', function (t) {
    var view = getView({
        bindings: {
            'model.name': 'span'
        }
    });
    t.equal(view.query('span').textContent, '');
    view.model.set('name', 'henrik');
    t.equal(view.query('span').textContent, 'henrik');
    t.end();
});

test('src bindings', function (t) {
    var view = getView({
        bindings: {
            'model.url': {
                type: 'attribute',
                name: 'src',
                selector: 'img'
            }
        }
    });
    var img = view.query('img');
    t.equal(img.getAttribute('src'), '');
    view.model.set('url', 'http://robohash.com/whammo');
    t.equal(img.getAttribute('src'), 'http://robohash.com/whammo');
    t.end();
});

test('href bindings', function (t) {
    var view = getView({
        template: '<a href=""></a>',
        bindings: {
            'model.url': {
                type: 'attribute',
                name: 'href',
                selector: ''
            }
        }
    });
    var el = view.el;
    t.equal(el.getAttribute('href'), '');
    view.model.set('url', 'http://robohash.com/whammo');
    t.equal(el.getAttribute('href'), 'http://robohash.com/whammo');
    t.end();
});

test('input bindings', function (t) {
    var view = getView({
        template: '<li><input></li>',
        bindings: {
            'model.something': {
                type: 'attribute',
                selector: 'input',
                name: 'value'
            }
        }
    });
    var input = view.query('input');
    t.equal(input.value, '');
    view.model.set('something', 'yo');
    t.equal(input.value, 'yo');
    t.end();
});

test('class bindings', function (t) {
    var model = new Model();
    model.set({
        fireDanger: 'high',
        active: true
    });
    var view = getView({
        template: '<li></li>',
        bindings: {
            'model.fireDanger': {
                type: 'class'
            },
            'model.active': {
                type: 'booleanClass'
            }
        }
    }, model);
    var className = view.el.className;
    t.ok(contains(className, 'active'));
    t.ok(contains(className, 'high'));
    model.set('fireDanger', 'low');
    className = view.el.className;
    t.ok(!contains(className, 'high'));
    t.ok(contains(className, 'low'));
    model.set('active', false);
    className = view.el.className;
    t.ok(!contains(className, 'active'));
    t.ok(contains(className, 'low'));
    t.end();
});

test('nested binding definitions', function (t) {
    var model = new Model();
    model.set({
        active: true
    });
    var View = AmpersandView.extend({
        autoRender: true,
        template: '<li><div></div></li>',
        bindings: {
            'model.active': [
                {
                    type: 'booleanAttribute',
                    name: 'data-active',
                    selector: 'div'
                },
                {
                    type: 'booleanAttribute',
                    name: 'data-something',
                    selector: 'div'
                },
                {
                    selector: 'div'
                },
                {
                    type: 'booleanClass'
                }
            ]
        }
    });
    var view = new View({model: model});
    var li = view.el;
    var div = li.firstChild;
    t.ok(div.hasAttribute('data-active'));
    t.ok(div.hasAttribute('data-something'));
    t.equal(div.textContent, 'true');
    t.ok(contains(li.className, 'active'));
    t.end();
});

test('renderAndBind with no model', function (t) {
    var View = AmpersandView.extend({
        template: '<li><span></span><img></li>'
    });
    var view = new View();
    t.ok(view.renderWithTemplate()); //Should not throw error
    t.end();
});

test('queryByHook', function (t) {
    var View = AmpersandView.extend({
        template: '<li data-hook="list-item"><span data-hook="username"></span><img data-hook="user-avatar"></li>'
    });
    var view = new View();
    view.renderWithTemplate();
    t.ok(view.queryByHook('username') instanceof Element, 'should find username element');
    t.ok(view.queryByHook('user-avatar') instanceof Element, 'should find username');
    t.ok(view.queryByHook('nothing') === undefined, 'should find username');
    t.ok(view.queryByHook('list-item') instanceof Element, 'should also work for root element');
    t.end();
});

test('queryAllByHook', function (t) {
    var View = AmpersandView.extend({
        template: '<li data-hook="list-item"><span data-hook="username info"></span><img data-hook="user-avatar info"></li>'
    });
    var view = new View();
    view.renderWithTemplate();
    t.ok(view.queryAllByHook('info') instanceof Array, 'should return array of results');
    t.equal(view.queryAllByHook('info').length, 2, 'should find all relevant elements');
    t.ok(view.queryAllByHook('info')[0] instanceof Element, 'should be able to access found elements');
    t.ok(view.queryAllByHook('info')[1] instanceof Element, 'should be able to access found elements');
    t.deepEqual(view.queryAllByHook('nothing'), [], 'should return empty array if no results found');
    t.end();
});

test('throw on multiple root elements', function (t) {
    var View = AmpersandView.extend({
        template: '<li></li><div></div>'
    });
    var view = new View();
    t.throws(view.renderWithTemplate, Error, 'Throws error on multiple root elements');
    t.end();
});

test('queryAll should return an array', function (t) {
    var View = AmpersandView.extend({
        autoRender: true,
        template: '<ul><li></li><li></li><li></li></ul>'
    });
    var view = new View();
    var all = view.queryAll('li');
    t.ok(all instanceof Array);
    t.ok(all.forEach);
    t.equal(all.length, 3);
    t.end();
});

test('get should return undefined if no match', function (t) {
    var View = AmpersandView.extend({
        autoRender: true,
        template: '<ul></ul>'
    });
    var view = new View();
    var el = view.query('div');
    t.equal(typeof el, 'undefined');
    t.strictEqual(view.query(''), view.el);
    t.strictEqual(view.query(), view.el);
    t.strictEqual(view.query(view.el), view.el);
    t.end();
});

test('get should work for root element too', function (t) {
    var View = AmpersandView.extend({
        autoRender: true,
        template: '<ul></ul>'
    });
    var view = new View();
    t.equal(view.query('ul'), view.el);
    t.end();
});

test('queryAll should include root element if matches', function (t) {
    var View = AmpersandView.extend({
        autoRender: true,
        template: '<div class="test"><div class="test deep"><div class="test deep"></div></div></div>'
    });
    var view = new View();
    var hasTestClass = view.queryAll('.test');
    var hasDeepClass = view.queryAll('.deep');
    t.equal(hasTestClass.length, 3);
    t.equal(hasDeepClass.length, 2);
    t.ok(hasTestClass instanceof Array);
    t.ok(hasDeepClass instanceof Array);
    t.ok(view.queryAll('bogus') instanceof Array);
    t.end();
});

test('query should throw an error if view was not rendered', function (t) {
    var View = AmpersandView.extend({
        autoRender: false,
        template: '<div class="test"><div class="test deep"><div class="test deep"></div></div></div>'
    });
    var view = new View();
    t.throws((function () {
        view.query('.test');
    }), Error, 'Throws error on query with selector');

    t.throws((function () {
        view.query('');
    }), Error, 'Throws error on query with empty selector');
    t.end();
});

test('query should not throw an error if view was rendered', function (t) {
    var View = AmpersandView.extend({
        autoRender: false,
        template: '<div class="test"><div class="test deep"><div class="test deep"></div></div></div>'
    });
    var view = new View();
    view.render();
    t.doesNotThrow((function () {
        view.query('.test');
    }), Error, 'Does not throws error on query');

    t.doesNotThrow((function () {
        view.query('');
    }), Error, 'Does not throws error on empty selector');
    t.end();
});

test('queryAll should throw an error if view was not rendered', function (t) {
    var View = AmpersandView.extend({
        autoRender: false,
        template: '<div class="test"><div class="test deep"><div class="test deep"></div></div></div>'
    });
    var view = new View();
    t.throws((function () {
        view.queryAll('div');
    }), Error, 'Throws error on queryAll');

    t.throws((function () {
        view.queryAll('');
    }), Error, 'Throws error on queryAll with empty selector');
    t.end();
});

test('queryAll should not throw an error if view was rendered', function (t) {
    var View = AmpersandView.extend({
        autoRender: false,
        template: '<div class="test"><div class="test deep"><div class="test deep"></div></div></div>'
    });
    var view = new View();
    view.render();
    t.doesNotThrow((function () {
        view.queryAll('div');
    }), Error, 'Does not throw error on queryAll');

    t.doesNotThrow((function () {
        view.queryAll('');
    }), Error, 'Does not throw error on queryAll with empty selector');
    t.end();
});

//test('focus/blur events should work in events hash. Issue #8', function (t) {
//    t.plan(2);
//    var View = AmpersandView.extend({
//        events: {
//            'focus #thing': 'handleFocus',
//            'blur #thing': 'handleBlur'
//        },
//        autoRender: true,
//        template: '<div><input id="thing"></div></div>',
//        handleFocus: function () {
//            t.pass('focus called');
//        },
//        handleBlur: function () {
//            t.pass('blur called');
//            t.end();
//        }
//    });
//    var view = new View();
//    // should be able to do this without
//    // ending up with too many handlers
//    view.delegateEvents();
//    view.delegateEvents();
//    view.delegateEvents();
//
//    document.body.appendChild(view.el);
//    view.el.firstChild.focus();
//    view.el.firstChild.blur();
//    document.body.removeChild(view.el);
//});

test('ability to mix in state properties', function (t) {
    var View = AmpersandView.extend({
        template: '<div></div>',
        render: function () {
            this.el = document.createElement('div');
        }
    });
    var view = new View();
    view.on('change:el', function () {
        t.pass('woohoo!');
        t.end();
    });
    view.render();
});

test('Ability to add other state properties', function (t) {
    var View = AmpersandView.extend({
        props: {
            thing: 'boolean'
        },
        template: '<div></div>'
    });
    var view = new View();
    view.on('change:thing', function () {
        t.pass('woohoo!');
        t.end();
    });
    view.thing = true;
});

test('Multi-inheritance of state properties works too', function (t) {
    t.plan(2);
    var View = AmpersandView.extend({
        props: {
            thing: 'boolean'
        },
        template: '<div></div>'
    });
    var SecondView = View.extend({
        props: {
            otherThing: 'boolean'
        }
    });
    var view = window.view = new SecondView();
    view.on('change:thing', function () {
        t.pass('woohoo!');
    });
    view.on('change:otherThing', function () {
        t.pass('woohoo!');
        t.end();
    });
    view.thing = true;
    view.otherThing = true;
});

test('Setting an `el` should only fire change if new instance of element', function (t) {
    t.plan(1);
    var View = AmpersandView.extend({
        template: '<div></div>',
        autoRender: true
    });
    var view = new View();
    t.ok(view.el);
    t.once('change:el', function () {
        t.pass('this should fire');
    });
    t.el = document.createElement('div');
    t.once('change:el', function () {
        t.fail('this should *not* fire');
    });
    var el = t.el;
    el.innerHTML = '<span></span>';
    t.el = el;
    t.end();
});

test('Should be able to bind multiple models in bindings hash', function (t) {
    var Person = Model.extend({
        props: {
            name: 'string'
        }
    });
    var View = AmpersandView.extend({
        template: '<div><span id="model1"></span><span id="model2"></span></div>',
        autoRender: true,
        props: {
            model1: 'model',
            model2: 'model'
        },
        bindings: {
            'model1.name': '#model1',
            'model2.name': {
                type: 'class',
                selector: '#model2'
            }
        }
    });
    var view = new View({
        model1: new Person({name: 'henrik'}),
        model2: new Person({name: 'larry'})
    });
    t.equal(view.el.firstChild.textContent, 'henrik');
    t.equal(view.el.children[1].className.trim(), 'larry');
    t.end();
});

test('Should be able to declare bindings first, before model is added', function (t) {
    var Person = Model.extend({props: {name: 'string'}});
    var View = AmpersandView.extend({
        template: '<div></div>',
        autoRender: true,
        bindings: {
            'model.name': ''
        }
    });
    var view = new View();
    t.equal(view.el.textContent, '');
    view.model = new Person({name: 'henrik'});
    t.equal(view.el.textContent, 'henrik');
    view.model.name = 'something new';
    t.equal(view.el.textContent, 'something new');
    t.end();
});

test('Should be able to swap out models and bindings should still work', function (t) {
    var Person = Model.extend({props: {name: 'string'}});
    var View = AmpersandView.extend({
        template: '<div></div>',
        autoRender: true,
        bindings: {
            'model.name': ''
        }
    });
    var p1 = new Person({name: 'first'});
    var p2 = new Person({name: 'second'});
    var view = new View();
    t.equal(view.el.textContent, '');
    view.model = p1;
    t.equal(view.el.textContent, 'first');
    view.model = p2;
    t.equal(view.el.textContent, 'second');
    // make sure it's not still bound to first
    p1.name = 'third';
    t.equal(view.el.textContent, 'second');
    t.end();
});

test('Should be able to re-render and maintain bindings', function (t) {
    var Person = Model.extend({props: {name: 'string'}});
    var View = AmpersandView.extend({
        template: '<div></div>',
        autoRender: true,
        bindings: {
            'model.name': ''
        }
    });
    var p1 = new Person({name: 'first'});
    var view = new View({model: p1});
    var el1 = view.el;
    t.equal(view.el.textContent, 'first');
    view.renderWithTemplate();
    var el2 = view.el;
    t.ok(el1 !== el2, 'sanity check to make sure it\'s a new element');
    t.equal(el2.textContent, 'first', 'new one should have the binding still');
    p1.name = 'third';
    t.equal(el2.textContent, 'third', 'new element should also get the change');
    t.end();
});

test('trigger `remove` event when view is removed', function (t) {
    var View = AmpersandView.extend({
        template: '<div></div>',
        autoRender: true
    });
    var view = new View();
    view.on('remove', function () {
        t.pass('remove fired');
        t.end();
    });
    view.remove();
});

test('trigger `remove` when view is removed using listenTo', function (t) {
    var View = AmpersandView.extend({
        template: '<div></div>',
        autoRender: true
    });
    var view = new View();
    view.listenTo(view, 'remove', function() {
        t.pass('remove fired');
        t.end();
    });
    view.remove();
});

test('declarative subViews basics', function (t) {
    var Sub = AmpersandView.extend({
        template: '<span></span>'
    });

    var View = AmpersandView.extend({
        template: '<div><div class="container"></div></div>',
        autoRender: true,
        subviews: {
            sub1: {
                selector: '.container',
                constructor: Sub
            }
        }
    });
    var view = new View();

    t.equal(view.el.innerHTML, '<div class="container"><span></span></div>');

    t.end();
});

test('declarative subViews basics (with prepareView which tests pre-issue#87 functionality)', function (t) {
    var Sub = AmpersandView.extend({
        template: '<span></span>'
    });

    var View = AmpersandView.extend({
        template: '<div><div class="container"></div></div>',
        autoRender: true,
        subviews: {
            sub1: {
                selector: '.container',
                constructor: Sub,
                prepareView: function (el) {
                    return new Sub({
                        el: el
                    });
                }
            }
        }
    });
    var view = new View();

    t.equal(view.el.innerHTML, '<span></span>');

    t.end();
});

test('subViews declaraction can accept a CSS selector string via `container` property for backwards compatibility (#114)', function (t) {
    var Sub = AmpersandView.extend({
        template: '<span></span>'
    });

    var View = AmpersandView.extend({
        template: '<div><div class="container"></div></div>',
        autoRender: true,
        subviews: {
            sub1: {
                container: '.container',
                constructor: Sub
            }
        }
    });
    var view = new View();

    t.equal(view.el.innerHTML, '<div class="container"><span></span></div>');

    t.end();
});

test('subview hook can include special characters', function (t) {
    var Sub = AmpersandView.extend({
        template: '<span></span>'
    });

    var View = AmpersandView.extend({
        template: '<div><div data-hook="test.hi-there"></div></div>',
        autoRender: true,
        subviews: {
            sub1: {
                hook: 'test.hi-there',
                constructor: Sub
            }
        }
    });
    var view = new View();

    t.equal(view.el.innerHTML, '<div data-hook="test.hi-there"><span></span></div>');

    t.end();
});

test('make sure subviews dont fire until their `waitFor` is done', function (t) {
    var Sub = AmpersandView.extend({
        template: '<span>yes</span>'
    });

    var View = AmpersandView.extend({
        template: '<div><span class="container"></span><span data-hook="sub"></span></div>',
        autoRender: true,
        props: {
            model2: 'state'
        },
        subviews: {
            sub1: {
                waitFor: 'model',
                selector: '.container',
                constructor: Sub
            },
            sub2: {
                waitFor: 'model2',
                hook: 'sub',
                constructor: Sub
            }
        }
    });
    var view = new View();
    t.equal(view._events.change.length, 2);
    t.equal(view.el.outerHTML, '<div><span class="container"></span><span data-hook="sub"></span></div>');
    view.model = new Model();
    t.equal(view._events.change.length, 1);
    t.equal(view.el.outerHTML, '<div><span class="container"><span>yes</span></span><span data-hook="sub"></span></div>');
    view.model2 = new Model();
    t.equal(view.el.outerHTML, '<div><span class="container"><span>yes</span></span><span data-hook="sub"><span>yes</span></span></div>');
    t.notOk(view._events.change);

    t.end();
});

test('make sure subviews are rendered when view instance is rendered more than once', function (t) {
    var Sub = AmpersandView.extend({
        template: '<span></span>'
    });

    var View = AmpersandView.extend({
        template: '<div><div class="container"></div></div>',
        autoRender: true,
        subviews: {
            sub1: {
                selector: '.container',
                constructor: Sub
            }
        }
    });
    var view = new View();

    t.equal(view.el.innerHTML, '<span></span>');

    view.remove();
    view.render();

    t.equal(view.el.innerHTML, '<span></span>');

    view.render();

    t.equal(view.el.innerHTML, '<span></span>');

    t.end();
});

test('make sure template can return a dom node', function (t) {
    var Sub = AmpersandView.extend({
        template: function () {
            return document.createElement('div');
        }
    });

    var view = new Sub();
    view.render();

    t.end();
});

test('template can be passed as viewOption', function (t) {
    t.plan(1);

    var View = AmpersandView.extend({
        autoRender: true
    });

    var view = new View({
        template: '<span></span>'
    });

    t.equal(view.el.outerHTML, '<span></span>');

    t.end();
});

test('events are bound if there is an el in the constructor', function (t) {
    t.plan(1);
    var event = document.createEvent("MouseEvent");
    var View = AmpersandView.extend({
        template: function () {
            return document.createElement('div');
        },
        events: {
            'click div': 'divClicked'
        },
        divClicked: function (e) {
            t.ok(true, 'event fired');
            t.end();
        }
    });
    var view = new View({el: document.createElement('div')});
    event.initMouseEvent('click');
    view.el.dispatchEvent(event);
});

test('render, remove, render yields consistent subview behavior', function (t) {
    t.plan(1);
    var event = document.createEvent("MouseEvent");
    var parentEl = document.createElement('div');
    var childContainerEl = document.createElement('div');
    childContainerEl.id = 'child_container';
    parentEl.appendChild(childContainerEl);
    var Child = AmpersandView.extend({
        template: function() { return document.createElement('div'); },
        events: {
            'click div': 'divClicked'
        },
        divClicked: function (e) {
            t.ok(true, 'child view bindings withheld through parent render/remove/render cycle');
            t.end();
        }
    });
    var Parent = AmpersandView.extend({
        template: function() { return parentEl; },
        subviews: {
            childv: {
                selector: '#child_container',
                constructor: Child
            }
        }
    });
    var parent = new Parent({ el: document.createElement('div') });
    parent.render();
    parent.remove();
    parent.render();
    event.initMouseEvent('click');
    parent.childv.el.dispatchEvent(event);
});
