var http = require('http');
var port = process.env.PORT || 5000;
var routes = require('./routes');

process.on('uncaughtException', function(err) {
  console.log('err', 'Caught exception:', err);
  throw err;
});

var server = http.createServer(routes);
server.listen(port, function(){
  console.log('\'donethat\' started on port ' + port);
});