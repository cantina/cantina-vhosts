var app = require('cantina').createApp();

app.boot(function (err) {
  if (err) throw err;

  app.require('cantina-web');
  app.require('../');

  app.load('vhosts');

  app.start();
});