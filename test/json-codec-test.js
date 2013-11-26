var jsonCodec = require('../lib/codecs/json');
var assert = require('assert');

describe('json-codec', function() {
  it('should encode short values', function(done) {

    jsonCodec.encode({ a: 1 }, function(err, v) {
      if(err) return done(err);

      jsonCodec.decode("" + v, function(err, w) {
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

    jsonCodec.encode(d, function(err, v) {
      if(err) return done(err);

      jsonCodec.decode("" + v, function(err, w) {
        if(err) return done(err);

        assert.deepEqual(w, d);
        done();
      });

    });
  });


  it('should encode unicode values', function(done) {
    jsonCodec.encode({ a: 'ā…æ∞ℳ' }, function(err, v) {
      if(err) return done(err);

      jsonCodec.decode("" + v, function(err, w) {
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

      jsonCodec.decode("" + v, function(err, w) {
        if(err) return done(err);

        assert.deepEqual(w, d);
        if(++count === 10) {
          done();
        }
      });
    }

    for(var j = 0; j < 10; j++) {
      jsonCodec.encode(d, encodeComplete);
    }
  });


});