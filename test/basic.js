describe('basic test', function () {
  var proc;

  before(function (done) {
    proc = spawn('node', ['example.js', '--vhosts:match=pathname'], {cwd: example});
    process.on('exit', function () {
      proc.kill();
    });
    proc.stdout.on('data', function (data) {
      assert.equal(data.toString(), 'Listening on 0.0.0.0:3000\n');
      // @todo Not sure why delay needed.
      setTimeout(done, 10);
    });
  });

  after(function () {
    if (proc) proc.kill();
  });

  it('GET / should be a 404', function (done) {
    request('http://localhost:3000', function (err, res, body) {
      assert.ifError(err);
      assert.equal(res.statusCode, 404);
      assert.equal(res.body, 'No matching vhost found');
      done();
    });
  });

  it('GET /apple should hit the apple vhost', function (done) {
    request('http://localhost:3000/apple', function (err, res, body) {
      assert.ifError(err);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body, '<strong><small>Fruit: apple</small></strong>');
      done();
    });
  });

  it('GET /apple/name.txt should hit the apple vhost', function (done) {
    request('http://localhost:3000/apple/name.txt', function (err, res, body) {
      assert.ifError(err);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body, 'Fruit');
      done();
    });
  });

  it('GET /banana should hit the banana vhost', function (done) {
    request('http://localhost:3000/banana', function (err, res, body) {
      assert.ifError(err);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body, '<strong>Fruit: banana</strong>');
      done();
    });
  });

  it('GET /banana/name.txt should hit the banana vhost', function (done) {
    request('http://localhost:3000/banana/name.txt', function (err, res, body) {
      assert.ifError(err);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body, 'banana');
      done();
    });
  });

  it('GET /carrot should hit the carrot vhost', function (done) {
    request('http://localhost:3000/carrot', function (err, res, body) {
      assert.ifError(err);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body, '<h1>Veggie: carrot</h1>');
      done();
    });
  });

  it('GET /carrot/name.txt should hit the carrot vhost', function (done) {
    request('http://localhost:3000/carrot/name.txt', function (err, res, body) {
      assert.ifError(err);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body, 'food');
      done();
    });
  });

});