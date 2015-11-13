var SnappyCache = require('../lib/snappy-cache');
var assert = require('assert');
var JsMockito = require('jsmockito').JsMockito;

var TwoTierCachePolicy = require('../lib/cache-policy/two-tier');
var fakeredis = require('fakeredis');

var once = JsMockito.Verifiers.once();
var twice = JsMockito.Verifiers.times(2);

describe('two-tier', function() {
  var codec, underTest, redis;

  beforeEach(function() {
    codec = require('../lib/codecs/json');
    redis = fakeredis.createClient(null, null, { fast: true });
    underTest = new TwoTierCachePolicy({
      prefix: 'snappy-cache-test:',
      redisClient: redis,
      codec: codec,
      cache: {
        emit: function() {}
      },
      hotTTL: 0.01, /* 10ms */
      coolTTL: 0.1, /* 100ms */
      coolRefetchTimeout: 0.05 /* 50ms */
    });
  });

  it('should handle cache-misses', function(done) {
    var mockFunc = JsMockito.mockFunction();

    JsMockito.when(mockFunc)().then(function(callback) {
      callback(null, "moo");
    });

    underTest.get('1', mockFunc, function(err, result) {
      if(err) return done(err);
      JsMockito.verify(mockFunc, once)();
      assert.strictEqual('moo', result);
      done();
    });
  });

  it('should handle cache-misses followed by a hot-hit', function(done) {
    var mockFunc = JsMockito.mockFunction();

    JsMockito.when(mockFunc)().then(function(callback) {
      callback(null, "cow");
    });

    underTest.get('2', mockFunc, function(err, result) {
      if(err) return done(err);

      assert.strictEqual('cow', result);

      underTest.get('2', mockFunc, function(err, result) {
        if(err) return done(err);

        assert.strictEqual('cow', result);
        JsMockito.verify(mockFunc, once)();

        done();
      });
    });
  });

  it('should handle cool-hits where the backend wins the race', function(done) {
    var mockFunc = JsMockito.mockFunction();

    var count = 0;
    JsMockito.when(mockFunc)().then(function(callback) {
      switch(count++) {
        case 0: return callback(null, "bob");
        case 1: return callback(null, "fred");
      }

      assert(false, 'Too many calls: ' + count);
    });

    underTest.get('3', mockFunc, function(err, result) {
      if(err) return done(err);

      assert.strictEqual('bob', result);
      setTimeout(function() {

        underTest.get('3', mockFunc, function(err, result) {
          if(err) return done(err);

          assert.strictEqual('fred', result);
          JsMockito.verify(mockFunc, twice)();

          done();
        });

      }, 15);
    });
  });

  it('should handle cool-hits where the backend looses the race', function(done) {
    var mockFunc = JsMockito.mockFunction();

    var count = 0;
    JsMockito.when(mockFunc)().then(function(callback) {
      switch(count++) {
        case 0: return callback(null, "bob");
        case 1:
        case 2:
          setTimeout(function() {
            return callback(null, "fred " + count);
          }, 100);
          return;
      }

      assert(false, 'Too many calls: ' + count);
    });

    underTest.get('4', mockFunc, function(err, result) {
      if(err) return done(err);

      assert.strictEqual('bob', result);
      setTimeout(function() {

        underTest.get('4', mockFunc, function(err, result) {
          if(err) return done(err);

          assert.strictEqual('bob', result);
          JsMockito.verify(mockFunc, twice)();

          setTimeout(function() {
            underTest.get('4', mockFunc, function(err, result) {
              if(err) return done(err);

              assert.strictEqual('fred 2', result);

              done();

            });
          },65);

        });

      }, 15);
    });
  });


  it('should handle persistence failures', function(done) {
    var mockFunc = JsMockito.mockFunction();

    var count = 0;
    JsMockito.when(mockFunc)().then(function(callback) {
      count++;
      if (count <= 3) {
        setTimeout(function() {
          return callback(null, "fred " + count);
        }, 10);
        return;
      }

      assert(false, 'Too many calls: ' + count);
    });

    redis.mget = function() {
      var callback = arguments[arguments.length - 1];
      callback(new Error('Unable to connect'));
    };

    underTest.get('5', mockFunc, function(err, result) {
      if(err) return done(err);

      assert.strictEqual('fred 1', result);

      underTest.get('5', mockFunc, function(err, result) {
        if(err) return done(err);

        assert.strictEqual('fred 2', result);

        underTest.get('5', mockFunc, function(err, result) {
          if(err) return done(err);

          assert.strictEqual('fred 3', result);
          done();
        });

      });

    });
  });

});
