var SnappyCache = require('../lib/snappy-cache');
var assert = require('assert');


describe('snappy-cache', function() {
  makeTests('json');
  makeTests('snappy');

  function makeTests(codec) {
    function createCache(done) {
      var sc = new SnappyCache({ codec: codec, prefix: 'snappy-cache-test:' });
      sc.on('persistenceError', function(err) {
        console.trace();
        console.error('Persistence Error', err);
        throw err;
      });
      sc.on('decodeError', function(err) {
        console.error('Decode Error', err);
        throw err;
      });
      return sc;
    }

    describe(codec, function() {
      it('should handle cache-misses', function(done) {
        var sc = createCache(done);

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
        var sc = createCache(done);

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

            setTimeout(function(x) {
              sc.lookup('2', lookupFunction, function(err, result) {
                if(err) return done(err);
                assert.equal(result, 2);
                assert.equal(missCount, 1);
                done();

              });
            }, 10);


          });

        });
      });

      it('should handle nulls', function(done) {
        var sc = createCache(done);

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

            setTimeout(function() {
              sc.lookup('3', lookupFunction, function(err, result) {
                if(err) return done(err);
                assert.strictEqual(result, null);
                assert.equal(missCount, 1);

                done();
              });

            }, 10);

          });

        });
      });

      it('should handle undefineds', function(done) {
        var sc = createCache(done);

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

            setTimeout(function() {
              sc.lookup('4', lookupFunction, function(err, result) {
                if(err) return done(err);
                assert.strictEqual(result, undefined);
                assert.equal(missCount, 1);

                done();
              });
            }, 10);


          });

        });
      });

      it('should handle invalidation', function(done) {
        var sc = createCache(done);

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

            setTimeout(function() {
              sc.invalidate('4', function(err) {

                sc.lookup('4', lookupFunction, function(err, result) {
                  if(err) return done(err);
                  assert.strictEqual(result, 2);
                  assert.equal(missCount, 2);

                  done();
                });
              });

            }, 10);



          });

        });
      });

      it('should handle cache-hits for very long json strings', function(done) {
        var sc = createCache(done);

        sc.invalidate('5', function(err) {
          if(err) return done(err);
          var missCount = 0;

          function lookupFunction(cb) {
            process.nextTick(function() {
              missCount++;
              var longArray = [];
              for(var i = 0; i < 1000; i++) {
                longArray[i] = { index: i, string: 'pos: ' + i };
              }

              cb(void 0, longArray);
            });

          }

          sc.lookup('5', lookupFunction, function(err, result) {
            if(err) return done(err);
            assert.equal(result.length, 1000);
            assert.equal(missCount, 1);

            setTimeout(function() {
              sc.lookup('5', lookupFunction, function(err, result) {
                if(err) return done(err);
                assert.equal(result.length, 1000);
                assert.equal(missCount, 1);
                done();
              });
            }, 10);

          });

        });
      });

      it('should handle two-tier caching policy', function() {
        var sc = new SnappyCache({
          prefix: 'snappy-cache-test:',
          policy: 'two-tier'
        });
        var TwoTierCachePolicy = require('../lib/cache-policy/two-tier');
        assert(sc.policy instanceof TwoTierCachePolicy);
      });

      describe('benchmark', function() {
        var i;
        var small = [];
        var medium = [];
        var large = [];

        for(i = 0; i < 1000; i++) {
          if (i < 10) small.push({ hello: 'world' + i });
          if (i < 100) medium.push({ hello: 'world' + i });
          large.push({ hello: 'world' + i });
        }

        function doBenchmark(name, data) {
          it(name, function(done) {
            var count = 500;
            var sc = createCache(done);

            sc.invalidate('6-' + name, function(err) {
              if(err) return done(err);

              (function next() {
                if (!--count) return done();

                function lookupFunction(cb) {
                  process.nextTick(function() {
                    cb(void 0, data);
                  });

                }
                function doLookup() {
                  sc.lookup('6-' + name, lookupFunction, function(err, result) {
                    if(err) return done(err);
                    next();
                  });
                }

                if (count % 10 === 0) {
                  sc.invalidate('6-' + name, function(err) {
                    if (err) return done(err);
                    doLookup();
                  });
                } else {
                  doLookup();
                }
              })();
            });


          });
        }

        doBenchmark('small', small);
        doBenchmark('medium', medium);
        doBenchmark('large', large);
      });

    });
  }
});
