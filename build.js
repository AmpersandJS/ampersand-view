var bundle = require('browserify')();
var fs = require('fs');
var uglify = require('uglify-js');
var pack = require('./package.json');


bundle.add('./ampersand-view');
bundle.bundle({standalone: 'AmpersandView'}, function (err, source) {
  if (err) console.error(err);
  fs.writeFileSync('ampersand-view.bundle.js', source, 'utf-8');
  fs.writeFile('ampersand-view.min.js', uglify.minify(source, {fromString: true}).code, function (err) {
    if (err) throw err;
  });
});
