module.exports = function (app) {
  // Default conf.
  app.conf.add({
    vhosts: {
      match: 'hostname',
      middleware: true,
      notFound: true
    }
  });

  // Depends on cantina-web.
  app.require('cantina-web');

  // Load stuff.
  app.load('plugins');
  if (app.conf.get('vhosts:middleware')) {
    app.load('middleware');
  }
};