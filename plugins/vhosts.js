var fs = require('fs')
  , path = require('path')
  , _ = require('lodash')
  , escapeRegex = require('regexp-quote');

module.exports = function (app) {
  var conf = app.conf.get('vhosts');

  // Cache of instantiated vhosts.
  app._vhosts = {};

  // API namespace.
  app.vhosts = {};

  // Create a new vhost.
  app.vhosts.create = function (root, defaults) {
    var vhost = require('cantina').createApp();

    // On app start, boot the vhost, loading ./etc conf and setting the root.
    app.hook('start').add(function (next) {
      vhost.boot(root, function (err) {
        if (err) return next(err);

        // Override root.
        vhost.root = root;

        // Add vhost /etc.
        vhost.conf.folder(path.join(vhost.root, 'etc'));

        // Add default conf.
        vhost.conf.add(defaults || {});

        // We NEVER want the vhost to create its own server.
        vhost.conf.set('web:server:disabled', true);

        // Dependencies.
        vhost.require('cantina-web');

        // Load web stuff.
        vhost.load('web');

        // Load the (optional) vhost index file.
        if (fs.existsSync(path.resolve(vhost.root, 'index.js'))) {
          vhost.require(vhost.root + '/index.js');
        }
        if (fs.existsSync(path.resolve(vhost.root, 'vhost.js'))) {
          vhost.require(vhost.root + '/vhost.js');
        }
        var name = vhost.conf.get('vhost:name');
        if (name && fs.existsSync(path.resolve(vhost.root, name + '.js'))) {
          vhost.require(vhost.root + '/' + name + '.js');
        }

        // Start the vhost.
        vhost.start(next);
      });
    });

    return vhost;
  };

  // Get a vhost by name.
  app.vhosts.get = function (name) {
    return app._vhosts[name];
  };

  // Destroy a vhost by name.
  app.vhosts.destroy = function (name, cb) {
    var vhost = app._vhosts[name];
    delete app._vhosts[name];
    vhost.destroy(cb);
  };

  // Find and return a vhost based on request data.
  app.vhosts.find = function (req) {
    var keys = Object.keys(app._vhosts)
      , key
      , vhost;

    // Loop over vhosts and look for matches.
    for (var i = 0; i < keys.length; i++) {
      key = keys[i];
      vhost = app._vhosts[key];
      if (app.vhosts.match(vhost, req)) {
        return vhost;
      }
    }
  };

  // Check if a vhost matches a request.
  app.vhosts.match = function (vhost, req) {
    var config = _.extend({}, conf, vhost.conf.get('vhost') || {})
      , name = config.name
      , regex;

    // Match against full hostname?
    if (config.match == 'hostname') {
      if (req.href.hostname === (config.hostname || name)) {
        return true;
      }
    }

    // Match against domain?
    if (config.match === 'domain') {
      regex = new RegExp(escapeRegex(config.domain || name) + '$');
      if (regex.test(req.href.hostname)) {
        return true;
      }
    }

    // Match against subdomain?
    if (config.match === 'subdomain') {
      regex = new RegExp('^' + escapeRegex(config.subdomain || name) + '\\.');
      if (regex.test(req.href.hostname)) {
        return true;
      }
    }

    // Match against path?
    if (config.match === 'pathname') {
      regex = new RegExp('^\\/' + escapeRegex(config.subdomain || name));
      if (regex.test(req.href.pathname)) {
        return true;
      }
    }
  };

  // Define a loader for vhosts.
  app.loader('vhosts', function (options) {
    if (fs.existsSync(options.path)) {
      var files = fs.readdirSync(options.path);
      files.forEach(function (name) {
        var root = path.resolve(options.path, name);
        if (fs.statSync(root).isDirectory()) {
          // We don't override existing vhosts.
          if (!app._vhosts[name]) {
            app._vhosts[name] = app.vhosts.create(root, {vhost: {name: name}});
          }
        }
      });
    }
  });
};
