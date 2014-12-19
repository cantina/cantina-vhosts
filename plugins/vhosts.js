var fs = require('fs')
  , path = require('path')
  , inherits = require('util').inherits
  , _ = require('lodash')
  , escapeRegex = require('regexp-quote')
  , Cantina = require('cantina')
  , etc = require('etc')
  , etcYaml = require('etc-yaml');

module.exports = function (app) {
  var conf = app.conf.get('vhosts');

  // Cache of instantiated vhosts and mixins.
  app._vhosts = {};
  app._vhosts_mixins = {};

  // API namespace.
  app.vhosts = {};

  // Vhost class.
  function Vhost (options) {
    Cantina.call(this, options);
  }
  inherits(Vhost, Cantina);

  // Custom boot method.
  Vhost.prototype.boot = function (root, cb) {
    var vhost = this;

    vhost.root = root;
    vhost.parent = app;
    vhost.top = app.top || app.parent || app;
    vhost.conf = etc()
      .use(etcYaml)
      .argv()
      .env()
      .folder(path.join(vhost.root, 'etc'));

    process.nextTick(cb);
  };

  // Apply a vhost mixin.
  Vhost.prototype.mixin = function (name) {
    var vhost = this
      , root = app._vhosts_mixins[name];

    if (!root) throw new Error('Could not find vhost mixin "' + name + '"');

    // Load conf.
    vhost.load('conf', {parent: root});

    // Load the (optional) vhost index file.
    if (fs.existsSync(path.resolve(root, 'index.js'))) {
      vhost.require(root + '/index.js');
    }
    if (fs.existsSync(path.resolve(root, 'vhost.js'))) {
      vhost.require(root + '/vhost.js');
    }
    if (fs.existsSync(path.resolve(root, name + '.js'))) {
      vhost.require(root + '/' + name + '.js');
    }

    // Load web stuff.
    vhost.load('web', {parent: root});
  };

  // Create a new vhost.
  app.vhosts.create = function (root, defaults) {
    var vhost = new Vhost();

    // On app start, boot the vhost, loading ./etc conf and setting the root.
    app.hook('start').add(function (next) {
      vhost.boot(root, function (err) {
        if (err) return next(err);

        // Add default conf.
        vhost.conf.add(defaults || {});

        // We NEVER want the vhost to create its own server.
        vhost.conf.set('web:server:disabled', true);

        // Dependencies.
        vhost.require('cantina-web');

        // Load the _common mixin, if it exists.
        if (app._vhosts_mixins['_common']) {
          vhost.mixin('_common');
        }

        // Load the (optional) vhost index file.
        var main;
        if (fs.existsSync(path.resolve(vhost.root, 'index.js'))) {
          main = vhost.require(vhost.root + '/index.js');
        }
        if (fs.existsSync(path.resolve(vhost.root, 'vhost.js'))) {
          main = vhost.require(vhost.root + '/vhost.js');
        }
        var name = vhost.conf.get('vhost:name');
        if (name && fs.existsSync(path.resolve(vhost.root, name + '.js'))) {
          main = vhost.require(vhost.root + '/' + name + '.js');
        }

        // Set weight.
        vhost.weight = (main && main.weight) ? main.weight : 0;

        // Load web stuff.
        vhost.load('web', {parent: vhost.root});

        // Add vhost req-prep middleware.
        vhost.middleware.first(-9000, function vhostReqPrepMiddleware (req, res, next) {
          app.vhosts.rewrite(vhost, req);
          next();
        });

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
      , matches = [];

    // Loop over vhosts and look for matches.
    for (var i = 0; i < keys.length; i++) {
      key = keys[i];
      vhost = app._vhosts[key];
      if (app.vhosts.match(vhost, req)) {
        matches.push(vhost);
      }
    }

    // Return the highest-weight match.
    if (matches.length) {
      matches.sort(function (a, b) {
        return a.weight - b.weight;
      });
      return matches[0];
    }
  };

  // Check if a vhost matches a request.
  app.vhosts.match = function (vhost, req) {
    var config = _.extend({}, conf, vhost.conf.get('vhost') || {})
      , name = config.name
      , regex;

    // Custom match?
    if (typeof vhost.match === 'function') {
      if (vhost.match(req)) {
        return true;
      }
    }

    // Match against full host?
    if (config.match == 'host') {
      if (req.href.host === (config.host || name)) {
        return true;
      }
    }

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
      regex = new RegExp('^\\/' + escapeRegex(config.pathname || name));
      if (regex.test(req.href.pathname)) {
        return true;
      }
    }
  };

  // Rewrite URL for vhost middleware stack.
  app.vhosts.rewrite = function (vhost, req) {
    var config = _.extend({}, conf, vhost.conf.get('vhost') || {});
    if (config.match === 'pathname') {
      req.url = req.url.replace(new RegExp('^\\/' + config.name), '');
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
            // Underscore-prefixed vhosts are considere mixins.
            if (name.match(/^_/) && !app._vhosts_mixins[name]) {
              app._vhosts_mixins[name] = root;
            }
            else {
              app._vhosts[name] = app.vhosts.create(root, {vhost: {name: name}});
            }
          }
        }
      });
    }
  });
};
