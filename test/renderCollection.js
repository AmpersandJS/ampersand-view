var test = require('tape');
var AmpersandModel = require('ampersand-model');
var AmpersandCollection = require('ampersand-rest-collection');
var AmpersandView = require('../ampersand-view');


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

var Collection = AmpersandCollection.extend({
    model: Model
});

var ItemView = AmpersandView.extend({
    template: '<li><a href=""></a><span></span><input/></li>',
    initialize: function () {
        // register a misc handler so we can test release
        this.listenTo(this.model, 'change:something', function () {});
    },
    render: function () {
        this.renderWithTemplate();
        this.el.id = '_' + this.model.id;
        return this;
    }
});

var MainView = AmpersandView.extend({
    initialize: function () {
        this.el = document.createElement('div');
        this.el.id = 'container';
        this.collection = new Collection(getModelData());
    },
    render: function (opts) {
        this.el.innerHTML = '<ul></ul>';
        this.collectionView = this.renderCollection(this.collection, ItemView, this.query('ul'), opts);
        return this;
    },
    numberRendered: function () {
        return this.queryAll('li').length;
    }
});

var MainViewUl = MainView.extend({
    initialize: function () {
        this.el = document.createElement('ul');
        this.collection = new Collection(getModelData());
    },
    render: function (opts) {
        this.collectionView = this.renderCollection(this.collection, ItemView);
        return this;
    }
});

function getModelData() {
    return [
        'Henrik Joreteg',
        'Bugs Bunny',
        'Scrooge McDuck',
        'Crazy Dave',
        'Arty Cee'
    ].map(function (name, count) {
        return {
            id: ++count,
            avatar: 'http://robohash.org/' + name.charAt(1),
            randomHtml: '<p>yo</p>',
            name: name,
            active: count === 2
        };
    });
}

test('test initial render', function (t) {
    var view = new MainView();
    view.render();
    t.equal(view.collection.length, 5);
    t.equal(view.numberRendered(), view.collection.length);
    t.end();
});

test('collection view is returned', function (t) {
    var view = new MainView();
    view.render();
    t.equal(typeof view.collectionView, 'object');
    t.equal(view.collectionView.collection.length, 5);
    t.end();
});

test('this.el is default', function (t) {
    var view = new MainViewUl();
    view.render();
    t.equal(view.collection.length, 5);
    t.equal(view.numberRendered(), view.collection.length);
    t.end();
});

test('add', function (t) {
    var view = new MainView();
    view.render();
    view.collection.add({id: 6});
    t.equal(view.numberRendered(), view.collection.length);
    t.end();
});

test('remove', function (t) {
    var view = new MainView();
    view.render();
    view.collection.remove(view.collection.last());
    t.equal(view.numberRendered(), view.collection.length);
    t.end();
});

test('reset', function (t) {
    var view = new MainView();
    view.render();
    view.collection.reset();
    t.equal(view.numberRendered(), view.collection.length);
    t.equal(view.numberRendered(), 0);
    t.end();
});

test('sort', function (t) {
    var view = new MainView();
    view.render();
    view.collection.comparator = function (model) {
        return model.get('name');
    };
    view.collection.sort();
    view.render();
    t.equal(view.numberRendered(), view.collection.length);
    var domIds = [];
    view.queryAll('li').forEach(function (el) {
        domIds.push(Number(el.id.slice(1)));
    });
    t.deepEqual(domIds, [5, 2, 4, 1, 3]);
    t.end();
});

test('animateRemove', function (t) {
    var view = new MainView();
    view.render();
    var prevAnimateRemove = ItemView.prototype.animateRemove;
    ItemView.prototype.animateRemove = function () {
        var self = this;
        this.el.className = 'fadeOut';
        setTimeout(function () {
            self.remove();
        }, 100);
        t.ok('animateRemove called');
    };
    view.collection.remove(view.collection.last());
    setTimeout(function () {
        t.equal(view.numberRendered(), view.collection.length);
        // set it back
        ItemView.prototype.animateRemove = prevAnimateRemove;
        t.end();
    }, 150);
});

test('filtered', function (t) {
    var view = new MainView();
    view.render({
        filter: function (model) {
            return model.get('name').length > 10;
        }
    });
    t.equal(view.numberRendered(), 2);
    t.end();
});

test('reversed', function (t) {
    var view = new MainView();
    view.render({
        reverse: true
    });
    var domIds = [];
    view.queryAll('li').forEach(function (el) {
        domIds.push(Number(el.id.slice(1)));
    });
    t.deepEqual(domIds, [5, 4, 3, 2, 1]);
    t.end();
});

test('cleanup', function (t) {
    var view = new MainView();
    view.render();
    t.equal(view.numberRendered(), view.collection.length);
    t.equal(view.collection.first()._events['change:something'].length, 1);
    view.remove();
    // when main view is removed so should registered event handler
    // from subview
    t.notOk(view.collection.first()._events['change:something']);
    t.end();
});

test('child view can choose to insert self', function (t) {
    var view = new MainView();
    ItemView.prototype.insertSelf = true;
    ItemView.prototype.render = function (extraInfo) {
        t.ok(extraInfo.containerEl);
        this.renderWithTemplate();
    };

    view.render();
    t.equal(view.numberRendered(), 0, 'Parent should not have rendered anything');
    view.remove();
    t.end();
});

test('child view `parent` should be parent view not collection view, when using `renderCollection()`', function (t) {
    var Child = AmpersandView.extend({
        template: '<li></li>',
        initialize: function () {
            t.equal(this.parent, view);
            t.end();
        }
    });

    var View = AmpersandView.extend({
        initialize: function () {
            this.el = document.createElement('div');
            this.collection = new Collection([{id: 9}]);
        },
        render: function (opts) {
            this.el.innerHTML = '<ul></ul>';
            this.collectionView = this.renderCollection(this.collection, Child, this.query('ul'), {parent: this});
        }
    });

    var view = new View();
    view.render();
});
