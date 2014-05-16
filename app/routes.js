var fs = require('fs');
var stack = require('stack');
var route = require('tiny-route');
var ecstatic = require('ecstatic');

module.exports = stack(
  route(/^\/$/, index),
  ecstatic({ root: __dirname + '/assets' })
);

function index(req, res){
  res.setHeader('Content-Type', 'text/html');
  fs.createReadStream(__dirname + '/index.html').pipe(res);
}

