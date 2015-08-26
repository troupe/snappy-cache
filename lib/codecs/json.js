/*jshint node:true, unused:strict */
'use strict';

module.exports = {
  encode: function(value, cb) {
    try {
      cb(null, JSON.stringify(value));
    } catch(e) {
      cb(e);
    }
  },

  decode: function(value, cb) {
    try {
      // If detect buffer is on
      if (Buffer.isBuffer(value)) value = value.toString('utf8');
      cb(null, JSON.parse(value));
    } catch(e) {
      cb(e);
    }
  }
};
