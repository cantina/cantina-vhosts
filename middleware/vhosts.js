module.exports = function (app) {
  // Depends on the vhosts plugin.
  app.require('../plugins/vhosts');

  // Tries to find a matching vhost for the request, and delegates to the vhost
  // middleware stack if it finds one.
  function vhostsMiddleware (req, res, next) {
    var vhost = app.vhosts.find(req);
    if (vhost && vhost.middleware) {
      vhost.middleware.handler(req, res, next);
    }
    else {
      if (app.conf.get('vhosts:notFound')) {
        if (res.renderStatus) {
          res.renderStatus(404, 'No matching vhost found');
        }
        else {
          res.statusCode = 404;
          res.write('No matching vhost found');
          res.end();
        }
      }
      else {
        next();
      }
    }
  }

  // This needs to run before most other middleware, most importantly things
  // like body parsers that can only run once per req object.
  vhostsMiddleware.weight = -940;

  return vhostsMiddleware;
};