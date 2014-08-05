module.exports = function (vhost) {
  vhost.middleware.add(function fruitMiddleware (req, res, next) {
    res.render('index', {text: 'Fruit: ' + vhost.conf.get('vhost:name')});
  });
  vhost.load('web');
};