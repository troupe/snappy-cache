var snappyCodec = require('../lib/codecs/snappy');
var assert = require('assert');


describe.skip('snappy-codec', function() {
  it('should encode short values', function(done) {

    snappyCodec.encode({ a: 1 }, function(err, v) {
      if(err) return done(err);

      snappyCodec.decode("" + v, function(err, w) {
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

      snappyCodec.decode("" + v, function(err, w) {
        if(err) return done(err);

        assert.deepEqual(w, d);
        done();
      });

    });
  });


  it('should encode unicode values', function(done) {
    snappyCodec.encode({ a: 'ā…æ∞ℳ' }, function(err, v) {
      if(err) return done(err);

      snappyCodec.decode("" + v, function(err, w) {
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

      snappyCodec.decode("" + v, function(err, w) {
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


});
