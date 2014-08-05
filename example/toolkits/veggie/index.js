module.exports = function (vhost) {
  vhost.middleware.add(function veggieMiddleware (req, res, next) {
    res.render('index', {text: 'Veggie: ' + vhost.conf.get('vhost:name')});
  });
  vhost.load('web');
};