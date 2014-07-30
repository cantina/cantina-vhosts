module.exports = function (app) {
  app.middleware.add(function veggieMiddleware (req, res, next) {
    res.write('Veggie: ' + app.conf.get('vhost:name'));
    res.end();
  });
};