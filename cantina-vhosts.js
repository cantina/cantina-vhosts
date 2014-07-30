module.exports = function (app) {
  // Default conf.
  app.conf.add({
    vhosts: {
      match: 'hostname',
      notFound: true
    }
  });

  // Depends on cantina-web.
  app.require('cantina-web');

  // Load stuff.
  app.load('plugins');
  app.load('middleware');
};