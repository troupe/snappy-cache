/*jshint node:true, unused:strict */
'use strict';

var snappy = require('snappy');
var ENCODING = 'binary';

module.exports = {
  encode: function(value, cb) {
    var x = new Buffer(JSON.stringify(value), 'utf8');
    snappy.compress(x, function(err, compressed) {
      if(err) return cb(err);

      var s = compressed.toString(ENCODING);
      cb(null, s);
    });
  },

  decode: function(value, cb) {
    var buffer = new Buffer(value, ENCODING);
    snappy.decompress(buffer, snappy.parsers.json, cb);
  }
};
