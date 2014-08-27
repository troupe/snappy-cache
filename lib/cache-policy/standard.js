/*jshint node:true, unused:strict */
'use strict';

var cacheWrapper = require('../cache-wrapper');

function StandardCachePolicy(options) {
  this.redisClient = options.redisClient;
  this.codec = options.codec;

  if(typeof options.ttl === 'function') {
    this.getTTL = options.ttl;
  } else {
    this.ttl = options.ttl || 60;
  }

}

StandardCachePolicy.prototype.get = function(key, fetchCallback, callback) {
  var self = this;
  var fullKey = self.prefix + key;

  self.redisClient.get(fullKey, function(err, result) {
    if(err || !result) {
      if(err) {
        console.error(err);
      }

      return self.fetchValuesAndSave(key, fetchCallback, callback);
    }

    self.codec.decode(result, function(err, decompressedResult) {
      if(err) {
        console.error(err);
        return self.fetchValuesAndSave(key, fetchCallback, callback);
      }

      return callback(null, cacheWrapper.unwrap(decompressedResult));
    });

  });
};

StandardCachePolicy.prototype.fetchValuesAndSave = function(key, fetchCallback, callback) {
  var self = this;

  fetchCallback(function(err, result) {
    if(err) return callback(err);

    var serialisedResult = cacheWrapper.wrap(result);

    self.codec.encode(serialisedResult, function(err, compressed) {
      if(err) return callback(null, result);

      var ttl = self.getTTL(key);
      var fullKey = self.prefix + key;

      self.redisClient.setex(fullKey, ttl, compressed, function(err) {
        if(err) {
          console.error(err);
        }

        // Log the error if we get one
        return callback(null, result);
      });
    });

  });
};

StandardCachePolicy.prototype.invalidate = function(key, callback) {
  var fullKey = this.prefix + key;
  this.redisClient.del(fullKey, callback);
};

StandardCachePolicy.prototype.getTTL = function(/*key*/) {
  return this.ttl;
};

module.exports = exports = StandardCachePolicy;
