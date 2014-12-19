module.exports = function (vhost) {
  vhost.middleware.get('/common', function (req, res, next) {
    res.end('Common Loaded');
  });
};