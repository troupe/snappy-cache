/*jshint node:true, unused:strict */
'use strict';

var snappy = require('snappy');

module.exports = {
  encode: function(value, cb) {
    var json = JSON.stringify(value);
    var buffer = new Buffer(json);

    snappy.compress(buffer, function(err, compressed) {
      if(err) return cb(err);
      cb(null, compressed);
    });
  },

  decode: function(value, cb) {
    snappy.uncompress(value, { asBuffer: true }, function(err, json) {
      if (err) {
        return cb(new Error(err.toString())); // Native error has no stack.
      }

      try {
        cb(null, JSON.parse(json));
      } catch(e) {
        cb(e);
      }
    });
  }
};
