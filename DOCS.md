# Documentation

## Bindings

Bindings are view-level objects that map model attributes to specific DOM selectors in the view's template. human-view will automatically update the appropriate DOM elements or attributes when the applicable model attribute changes.

### textBindings
Text bindings are used to directly bind the inner text of an element to the model. For instance:

    textBindings: {
    	'liveStreamCount': '.live-stream-count'
    } 
    
    ...

    <div class='.live-stream-count'>0</div>

Here, the contents of all the `.liveStreamCount` elements will be replaced with and bound to the value of `this.liveStreamCount`.

### srcBindings
Source bindings are used to bind the `src` attribute of a DOM element to the model. For example:

	srcBindings: {
		'userProfilePic': 'img .profile-pic'
	}

	...

	<img class='profile-pic' src='' alt='Profile Picture' />

Here, the `src` tag of the `.profile-pic` image element will be bound to `this.userProfilePic`.

### hrefBindings
href bindings are used to bind the `href` attribute of a DOM element to the model. For example:

	hrefBindings: {
		'logoutURL': 'a .logout'
	}

	...

	<a class='logout' href=''>Logout</a>

Here, the `href` tag of the `.logout` anchor element will be bound to `this.logoutURL`.

### classBindings
Class bindings maintain a class on the element according to the following rules:
    
1. **If the bound property is a boolean**: the name of the property will be used as the name of the class. The class will be on the element when true, and removed when the propety is false.
2. **If the property is a string**: the current value of the property will be used as the class name. When the property value changes the previous class will be removed and be replaced by the current value. No other classes on that element will be disturbed.

For example, assuming that `this.active` is a boolean: 

	hrefBindings: {
		'active': 'a .options-page'
	}

	...

	<a class='options-page' href=''>Options</a>

When `active` is set to `true`, a class named `active` will be added to the `.options-page` element.

## Methods

### renderAndBind([specificModel, bindings])

### renderCollection(collection, ViewClass, container [, opts])

### listenToAndRun(object, events, handler)	