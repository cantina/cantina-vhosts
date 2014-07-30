module.exports = function (app) {
  app.middleware.add(function fruitMiddleware (req, res, next) {
    res.write('Fruit: ' + app.conf.get('vhost:name'));
    res.end();
  });
};