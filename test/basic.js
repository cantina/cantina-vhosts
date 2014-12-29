describe('basic test', function () {
  var proc
    , port = 9090
    , baseUrl = 'http://localhost:' + port;

  before(function (done) {
    proc = spawn('node', ['example.js', '--vhosts:match=pathname', '--web:server:port=9090'], {cwd: example});
    process.on('exit', function () {
      proc.kill();
    });
    proc.stdout.on('data', function (data) {
      assert.equal(data.toString(), 'Listening on 0.0.0.0:' + port + '\n');
      // @todo Not sure why delay needed.
      setTimeout(done, 10);
    });
  });

  after(function () {
    if (proc) proc.kill();
  });

  it('GET / should be a 404', function (done) {
    request(baseUrl + '/', function (err, res, body) {
      assert.ifError(err);
      assert.equal(res.statusCode, 404);
      assert.equal(res.body, 'No matching vhost found');
      done();
    });
  });

  it('GET /apple should hit the apple vhost', function (done) {
    request(baseUrl + '/apple', function (err, res, body) {
      assert.ifError(err);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body, '<strong><small>Fruit: apple</small></strong>');
      done();
    });
  });

  it('GET /apple/name.txt should hit the apple vhost', function (done) {
    request(baseUrl + '/apple/name.txt', function (err, res, body) {
      assert.ifError(err);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body, 'Fruit');
      done();
    });
  });

  it('GET /banana should hit the banana vhost', function (done) {
    request(baseUrl + '/banana', function (err, res, body) {
      assert.ifError(err);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body, '<strong>Fruit: banana</strong>');
      done();
    });
  });

  it('GET /banana/name.txt should hit the banana vhost', function (done) {
    request(baseUrl + '/banana/name.txt', function (err, res, body) {
      assert.ifError(err);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body, 'banana');
      done();
    });
  });

  it('GET /carrot should hit the carrot vhost', function (done) {
    request(baseUrl + '/carrot', function (err, res, body) {
      assert.ifError(err);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body, '<h1>Veggie: carrot</h1>');
      done();
    });
  });

  it('GET /carrot/name.txt should hit the carrot vhost', function (done) {
    request(baseUrl + '/carrot/name.txt', function (err, res, body) {
      assert.ifError(err);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body, 'food');
      done();
    });
  });

  it('GET /common should hit the common vhost', function (done) {
    request(baseUrl + '/apple/common', function (err, res, body) {
      assert.ifError(err);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body, 'Common Loaded');
      done();
    });
  });

  it('GET /common.txt should hit the common vhost', function (done) {
    request(baseUrl + '/banana/common.txt', function (err, res, body) {
      assert.ifError(err);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body, 'Loaded');
      done();
    });
  });

});