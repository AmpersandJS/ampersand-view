var collection;
var count = 0;
var names = [
    'Henrik Joreteg',
    'Bugs Bunny',
    'Scrooge McDuck',
    'Crazy Dave',
    'Arty Cee'
];
var modelData = names.map(function (name) {
    return {
        id: ++count,
        avatar: 'http://robohash.org/' + name.charAt(1),
        randomHtml: '<p>yo</p>',
        name: name,
        active: count === 2
    };
});

var MainView
var ItemView;
var container;

var Model = (window.HumanModel || Backbone.Model).extend({
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
    }
});



function addModel() {
    count++;
    collection.add({
        name: 'test' + count,
        id: count
    });
}

QUnit.testStart(function () {
    container = $('<div id="container"></div>');

    collection = new Backbone.Collection();
    collection.model = Model;
    collection.add(modelData);

    collection.on('all', function () {
        console.log('collection event', arguments);
    });

    // our item view
    ItemView = HumanView.extend({
        template: '<li><a href=""></a><span></span><input/></li>',
        initialize: function () {
            // register a misc handler so we can test release
            this.listenTo(this.model, 'change:something', function () {});
        },
        render: function () {
            this.renderAndBind();
            this.el.id = '_' + this.model.id;
            return this;
        }
    });

    MainView = HumanView.extend({
        render: function (opts) {
            this.el.innerHTML = '<ul></ul>';
            this.renderCollection(this.collection, ItemView, this.get('ul'), opts);
            return this;
        }
    });

    window.view = new MainView({
        el: container[0],
        collection: collection
    });
});

function numberRendered() {
    return container.find('li').length;
}

module('method: renderCollection');

test('test initial render', function() {
    window.view.render();
    equal(numberRendered(), collection.length);
});
test('add', function() {
    window.view.render();
    addModel();
    equal(numberRendered(), collection.length);
});
test('remove', 1, function () {
    window.view.render();
    collection.remove(collection.last());
    equal(numberRendered(), collection.length);
});
test('reset', function () {
    window.view.render();
    collection.reset();
    equal(numberRendered(), collection.length);
});
test('sort', function () {
    window.view.render();
    collection.comparator = function (model) {
        return model.get('name');
    }
    collection.sort();
    equal(numberRendered(), collection.length);
    var domIds = [];
    container.find('li').each(function () {
        domIds.push(Number(this.id.slice(1)));
    });
    deepEqual(domIds, [5, 2, 4, 1, 3]);
});
asyncTest('animateRemove', 2, function () {
    window.view.render();
    var prevAnimateRemove = ItemView.prototype.animateRemove;
    ItemView.prototype.animateRemove = function () {
        var self = this;
        this.el.classList.add('fadeOut');
        setTimeout(function () {
            self.remove();
        }, 100);
        ok('animateRemove called');
    };
    collection.remove(collection.last());
    setTimeout(function () {
        equal(numberRendered(), collection.length);
        // set it back
        ItemView.prototype.animateRemove = prevAnimateRemove;
        start();
    }, 150);
});
test('filtered', function () {
    window.view.render({
        filter: function (model) {
            return model.get('name').length > 10;
        }
    });
    equal(numberRendered(), 2);
});
test('reversed', function () {
    window.view.render({
        reverse: true
    });
    var domIds = [];
    container.find('li').each(function () {
        domIds.push(Number(this.id.slice(1)));
    });
    deepEqual(domIds, [5, 4, 3, 2, 1]);
});
test('cleanup', function () {
    window.view.render();
    equal(numberRendered(), collection.length);
    equal(collection.first()._events['change:something'].length, 1);
    window.view.remove();
    // when main view is removed so should registered event handler
    // from subview
    ok(!collection.first()._events['change:something']);
});
test('child view can choose to insert self', 6, function () {
    ItemView.prototype.insertSelf = true;
    ItemView.prototype.render = function (extraInfo) {
        ok(extraInfo.containerEl);
    };

    window.view.render();
    equal(numberRendered(), 0, 'Parent should not have rendered anything');
    window.view.remove();
});

module('method: subview methods');

test('registerSubview', function () {
    var removeCalled = 0;
    var SubView = HumanView.extend({
        template: '<div></div>',
        render: function () {
            this.renderAndBind();
            this.el.classList.add('subview');
        },
        remove: function () {
            removeCalled++;
        }
    });
    var View = HumanView.extend({
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
        el: container[0]
    });

    main.render();
    equal(main.getAll('.subview').length, 2);
    main.remove();
    equal(removeCalled, 3);
});


module('method: listenToAndRun');
asyncTest('basic', 1, function () {
    var model = new Model({
        props: {
            name: 'string'
        }
    });
    var View = HumanView.extend({
        initialize: function () {
            this.model = model;
            this.listenToAndRun(this.model, 'change', this.handler);
        },
        handler: function () {
            ok(true, 'handler ran');
            start();
        }
    });
    var view = new View();
});


module('method: registerBindings');

function getView(bindings, model) {
    if (!bindings.template) {
        bindings.template = '<li><span></span><img/></li>';
    }
    var View = HumanView.extend(bindings);
    var view = new View({
        model: model || new Model()
    });
    return view.renderAndBind();
}

test('textBindings', function () {
    var view = getView({
        bindings: {
            name: 'span'
        }
    });
    equal(view.get('span').textContent, '');
    view.model.set('name', 'henrik');
    //equal(view.get('span').textContent, 'henrik');
});

test('srcBindings', function () {
    var view = getView({
        bindings: {
            url: ['img', 'src']
        }
    });
    var img = view.get('img');
    ok(!img.getAttribute('src'));
    view.model.set('url', 'http://robohash.com/whammo');
    equal(img.getAttribute('src'), 'http://robohash.com/whammo');
});

test('hrefBindings', function () {
    var view = getView({
        template: '<a href=""></a>',
        bindings: {
            url: ['', 'href']
        }
    });
    var el = view.el;
    equal(el.getAttribute('href'), '');
    view.model.set('url', 'http://robohash.com/whammo');
    equal(el.getAttribute('href'), 'http://robohash.com/whammo');
});

test('inputBindings', function () {
    var view = getView({
        template: '<li><input/></li>',
        bindings: {
            something: ['input', 'value']
        }
    });
    var input = view.get('input');
    equal(input.value, '');
    view.model.set('something', 'yo');
    equal(input.value, 'yo');
});

test('classBindings', function () {
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
    var classList = view.el.classList;
    ok(classList.contains('active'));
    ok(classList.contains('high'));
    model.set('fireDanger', 'low');
    ok(!classList.contains('high'));
    ok(classList.contains('low'));
    model.set('active', false);
    ok(!classList.contains('active'));
    ok(classList.contains('low'));
});

module('error case: no model');

test('renderAndBind with no model', function () {
    var View = HumanView.extend({
        template: '<li><span></span><img/></li>',
        textBindings: { name: 'span' }
    });
    var view = new View();
    ok(view.renderAndBind()); //Should not throw error
});

test('registerBindings with no model', function () {
    var View = HumanView.extend({
        template: '<li><span></span><img/></li>',
        textBindings: { name: 'span' }
    });
    var view = new View();
    throws(view.registerBindings, Error, 'Throws error on no model');
});

test('getByRole', 4, function () {
    var View = HumanView.extend({
        template: '<li role="list-item"><span role="username"></span><img role="user-avatar"/></li>'
    });
    var view = new View();
    view.renderAndBind();
    var usenameEl = view.getByRole('username');
    ok(view.getByRole('username') instanceof Element, 'should find username element');
    ok(view.getByRole('user-avatar') instanceof Element, 'should find username');
    ok(view.getByRole('nothing') === undefined, 'should find username');
    ok(view.getByRole('list-item') instanceof Element, 'should also work for root element');
});

test('throw on multiple root elements', 1, function () {
    var View = HumanView.extend({
        template: '<li></li><div></div>'
    });
    var view = new View();
    throws(view.renderAndBind, Error, 'Throws error on multiple root elements');
});

test('getAll should return an array', 3, function () {
    var View = HumanView.extend({
        autoRender: true,
        template: '<ul><li></li><li></li><li></li></ul>'
    });
    var view = new View();
    var all = view.getAll('li');
    ok(all instanceof Array);
    ok(all.forEach);
    equal(all.length, 3);
});


test('get should return undefined if no match', 4, function () {
    var View = HumanView.extend({
        autoRender: true,
        template: '<ul></ul>'
    });
    var view = new View();
    var el = view.get('div');
    equal(typeof el, 'undefined');
    strictEqual(view.get(''), view.el);
    strictEqual(view.get(), view.el);
    strictEqual(view.get(view.el), view.el);
});
