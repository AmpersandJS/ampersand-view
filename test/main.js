var test = require('tape');
var Model = require('ampersand-model');
var AmpersandView = require('../ampersand-view');

var contains = function (str1, str2) {
    return str1.indexOf(str2) !== -1;
};

var Model = Model.extend({
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
        bindings.template = '<li><span></span><img/></li>';
    }
    var View = AmpersandView.extend(bindings);
    var view = new View({
        model: model || new Model()
    });
    return view.renderAndBind();
}


test('registerSubview', function (t) {
    var removeCalled = 0;
    var SubView = AmpersandView.extend({
        template: '<div></div>',
        render: function () {
            this.renderAndBind();
            this.el.className = 'subview';
        },
        remove: function () {
            removeCalled++;
        }
    });
    var View = AmpersandView.extend({
        template: '<section><div id="parent"></div></section>',
        render: function () {
            this.renderAndBind();
            // all of these should work
            this.renderSubview(new SubView(), this.get('#parent'));
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
    t.equal(main.getAll('.subview').length, 2);
    main.remove();
    t.equal(removeCalled, 3);
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
            this.listenToAndRun(this.model, 'change', this.handler);
        },
        handler: function () {
            t.pass('handler ran');
        }
    });
    var view = new View();
});

test('textBindings', function (t) {
    var view = getView({
        bindings: {
            name: 'span'
        }
    });
    t.equal(view.get('span').textContent, '');
    view.model.set('name', 'henrik');
    t.equal(view.get('span').textContent, 'henrik');
    t.end();
});

test('src bindings', function (t) {
    var view = getView({
        bindings: {
            url: ['img', 'src']
        }
    });
    var img = view.get('img');
    t.ok(!img.getAttribute('src'));
    view.model.set('url', 'http://robohash.com/whammo');
    t.equal(img.getAttribute('src'), 'http://robohash.com/whammo');
    t.end();
});

test('href bindings', function (t) {
    var view = getView({
        template: '<a href=""></a>',
        bindings: {
            url: ['', 'href']
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
        template: '<li><input/></li>',
        bindings: {
            something: ['input', 'value']
        }
    });
    var input = view.get('input');
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
            fireDanger: ['', 'class'],
            active: ['', 'class']
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

test('classList bindings', function (t) {
    var model = new Model();
    model.set({
        fireDanger: 'high',
        active: true,
        something: 'cool'
    });
    var view = getView({
        autoRender: true,
        template: '<li class="something else perhaps"></li>',
        bindings: {
            classes: ['', 'classList']
        }
    }, model);
    t.equal(view.el.className, 'cooltrue', 'wipes out existing classes');
    t.end();
});

test('nested binding definitions', function (t) {
    var model = new Model();
    model.set({
        fireDanger: 'high',
        active: true,
        something: 'cool'
    });
    var View = AmpersandView.extend({
        autoRender: true,
        template: '<li><div></div></li>',
        bindings: {
            active: [
                ['div', 'data-active data-something'],
                ['div', 'text'],
                ['', 'class'],
                ['div', 'classList', 'selected']
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
    t.equal(div.className, 'selected');
    t.end();
});

test('renderAndBind with no model', function (t) {
    var View = AmpersandView.extend({
        template: '<li><span></span><img/></li>',
        textBindings: { name: 'span' }
    });
    var view = new View();
    t.ok(view.renderAndBind()); //Should not throw error
    t.end();
});

test('registerBindings with no model', function (t) {
    var View = AmpersandView.extend({
        template: '<li><span></span><img/></li>',
        textBindings: { name: 'span' }
    });
    var view = new View();
    t.throws(view.registerBindings, Error, 'Throws error on no model');
    t.end();
});

test('getByRole', function (t) {
    var View = AmpersandView.extend({
        template: '<li role="list-item"><span role="username"></span><img role="user-avatar"/></li>'
    });
    var view = new View();
    view.renderAndBind();
    var usenameEl = view.getByRole('username');
    t.ok(view.getByRole('username') instanceof Element, 'should find username element');
    t.ok(view.getByRole('user-avatar') instanceof Element, 'should find username');
    t.ok(view.getByRole('nothing') === undefined, 'should find username');
    t.ok(view.getByRole('list-item') instanceof Element, 'should also work for root element');
    t.end();
});

test('throw on multiple root elements', function (t) {
    var View = AmpersandView.extend({
        template: '<li></li><div></div>'
    });
    var view = new View();
    t.throws(view.renderAndBind, Error, 'Throws error on multiple root elements');
    t.end();
});

test('getAll should return an array', function (t) {
    var View = AmpersandView.extend({
        autoRender: true,
        template: '<ul><li></li><li></li><li></li></ul>'
    });
    var view = new View();
    var all = view.getAll('li');
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
    var el = view.get('div');
    t.equal(typeof el, 'undefined');
    t.strictEqual(view.get(''), view.el);
    t.strictEqual(view.get(), view.el);
    t.strictEqual(view.get(view.el), view.el);
    t.end();
});

test('get should work for root element too', function (t) {
    var View = AmpersandView.extend({
        autoRender: true,
        template: '<ul></ul>'
    });
    var view = new View();
    t.equal(view.get('ul'), view.el);
    t.end();
});

test('getAll should include root element if matches', function (t) {
    var View = AmpersandView.extend({
        autoRender: true,
        template: '<div class="test"><div class="test deep"><div class="test deep"></div></div></div>'
    });
    var view = new View();
    var hasTestClass = view.getAll('.test');
    var hasDeepClass = view.getAll('.deep');
    t.equal(hasTestClass.length, 3);
    t.equal(hasDeepClass.length, 2);
    t.ok(hasTestClass instanceof Array);
    t.ok(hasDeepClass instanceof Array);
    t.ok(view.getAll('bogus') instanceof Array);
    t.end();
});

test('focus/blur events should work in events hash. Issue #8', function (t) {
    t.plan(2);
    var View = AmpersandView.extend({
        events: {
            'focus #thing': 'handleFocus',
            'blur #thing': 'handleBlur'
        },
        autoRender: true,
        template: '<div><input id="thing"/></div></div>',
        handleFocus: function () {
            t.pass('focus called');
        },
        handleBlur: function () {
            t.pass('blur called');
            t.end();
        }
    });
    var view = new View();
    // should be able to do this without
    // ending up with too many handlers
    view.delegateEvents();
    view.delegateEvents();
    view.delegateEvents();

    document.body.appendChild(view.el);
    view.el.firstChild.focus();
    view.el.firstChild.blur();
    document.body.removeChild(view.el);
});

test('should be able to specify sub-models in bindings hash', function () {
    var Model1 = Model.extend({
        props: {
            name: 'string'
        }
    });
    var Model2 = Model.extend({
        props: {
            wholeThing: 'string'
        }
    });
    var View = AmpersandView.extend({
        initialize: function () {
            this.model1 = new Model1({name: 'eric'});
            this.model2 = new Model2({wholeThing: 'as much as you can'});
        },
        bindings: {
            model1: {
                name: '[role=name]'
            },
            model2: {
                wholeThing: '[role=thing]'
            }
        },
        autoRender: true,
        template: '<div><span role="name"></span><span role="whole-thing"></span></div>'
    });
    var view = new View({});
});
