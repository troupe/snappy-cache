var SnappyCache = require('../lib/snappy-cache');
var assert = require('assert');

describe('snappy-cache', function() {
  it('should handle cache-misses', function(done) {
    var sc = new SnappyCache({ prefix: 'snappy-cache-test:' });

    sc.invalidate('1', function(err) {
      if(err) return done(err);

      sc.lookup('1', function(cb) {
        process.nextTick(function() {
          cb(void 0, 1);
        });

      }, function(err, result) {
        if(err) return done(err);
        assert.equal(result, 1);
        done();
      });

    });
  });

  it('should handle cache-hits', function(done) {
    var sc = new SnappyCache({ prefix: 'snappy-cache-test:' });

    sc.invalidate('2', function(err) {
      if(err) return done(err);
      var missCount = 0;

      function lookupFunction(cb) {
        process.nextTick(function() {
          missCount++;
          cb(void 0, 2);
        });

      }

      sc.lookup('2', lookupFunction, function(err, result) {
        if(err) return done(err);
        assert.equal(result, 2);
        assert.equal(missCount, 1);

        sc.lookup('2', lookupFunction, function(err, result) {
          if(err) return done(err);
          assert.equal(result, 2);
          assert.equal(missCount, 1);
          done();

        });

      });

    });
  });

  it('should handle nulls', function(done) {
    var sc = new SnappyCache({ prefix: 'snappy-cache-test:' });

    sc.invalidate('3', function(err) {
      if(err) return done(err);
      var missCount = 0;

      function lookupFunction(cb) {
        process.nextTick(function() {
          missCount++;
          cb(void 0, null);
        });

      }

      sc.lookup('3', lookupFunction, function(err, result) {
        if(err) return done(err);
        assert.strictEqual(result, null);
        assert.equal(missCount, 1);

        sc.lookup('3', lookupFunction, function(err, result) {
          if(err) return done(err);
          assert.strictEqual(result, null);
          assert.equal(missCount, 1);

          done();
        });

      });

    });
  });

  it('should handle undefineds', function(done) {
    var sc = new SnappyCache({ prefix: 'snappy-cache-test:' });

    sc.invalidate('4', function(err) {
      if(err) return done(err);
      var missCount = 0;

      function lookupFunction(cb) {
        process.nextTick(function() {
          missCount++;
          cb(void 0, undefined);
        });

      }

      sc.lookup('4', lookupFunction, function(err, result) {
        if(err) return done(err);
        assert.strictEqual(result, undefined);
        assert.equal(missCount, 1);

        sc.lookup('4', lookupFunction, function(err, result) {
          if(err) return done(err);
          assert.strictEqual(result, undefined);
          assert.equal(missCount, 1);

          done();
        });

      });

    });
  });

  it('should handle invalidation', function(done) {
    var sc = new SnappyCache({ prefix: 'snappy-cache-test:' });

    sc.invalidate('4', function(err) {
      if(err) return done(err);
      var missCount = 0;

      function lookupFunction(cb) {
        process.nextTick(function() {
          missCount++;
          cb(void 0, missCount);
        });

      }

      sc.lookup('4', lookupFunction, function(err, result) {
        if(err) return done(err);
        assert.strictEqual(result, 1);
        assert.equal(missCount, 1);

        sc.invalidate('4', function(err) {

          sc.lookup('4', lookupFunction, function(err, result) {
            if(err) return done(err);
            assert.strictEqual(result, 2);
            assert.equal(missCount, 2);

            done();
          });

        });


      });

    });
  });
});