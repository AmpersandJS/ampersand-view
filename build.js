var bundle = require('browserify')();
var fs = require('fs');
var uglify = require('uglify-js');


bundle.add('./human-view');
bundle.bundle({standalone: 'HumanView'}, function (err, source) {
    if (err) console.error(err);
    fs.writeFile('human-view.min.js', uglify.minify(source, {fromString: true}).code, function (err) {
        if (err) throw err;
    });
});
