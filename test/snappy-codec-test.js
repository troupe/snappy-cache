var snappyCodec = require('../lib/codecs/snappy');
var assert = require('assert');


describe('snappy-codec', function() {
  it('should encode short values', function(done) {

    snappyCodec.encode({ a: 1 }, function(err, v) {
      if(err) return done(err);

      snappyCodec.decode(v, function(err, w) {
        if(err) return done(err);

        assert.deepEqual(w, { a: 1 });
        done();
      });

    });
  });

  it('should encode long values', function(done) {
    var d = [];
    for(var i = 0; i < 1000; i++) {
      d[i] = { i: i, s: 'Hello ' + i };
    }

    snappyCodec.encode(d, function(err, v) {
      if(err) return done(err);

      snappyCodec.decode(v, function(err, w) {
        if(err) return done(err);

        assert.deepEqual(w, d);
        done();
      });

    });
  });


  it('should encode unicode values', function(done) {
    snappyCodec.encode({ a: 'ā…æ∞ℳ' }, function(err, v) {
      if(err) return done(err);

      snappyCodec.decode(v, function(err, w) {
        if(err) return done(err);

        assert.deepEqual(w, { a: 'ā…æ∞ℳ' });
        done();
      });

    });
  });

  it('should encode in parallel', function(done) {
    var d = [];
    for(var i = 0; i < 1000; i++) {
      d[i] = { i: i, s: 'Hello ' + i };
    }

    var count = 0;
    function encodeComplete(err, v) {
      if(err) return done(err);

      snappyCodec.decode(v, function(err, w) {
        if(err) return done(err);

        assert.deepEqual(w, d);
        if(++count === 10) {
          done();
        }
      });
    }

    for(var j = 0; j < 10; j++) {
      snappyCodec.encode(d, encodeComplete);
    }
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

        (function next() {
          if (!--count) return done();
          snappyCodec.encode(data, function(err, v) {
            if(err) return done(err);

            snappyCodec.decode(v, function(err, w) {
              if(err) return done(err);
              next();
            });

          });
        })();
      });
    }

    doBenchmark('small', small);
    doBenchmark('medium', medium);
    doBenchmark('large', large);
  });


});
