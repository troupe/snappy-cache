/*jshint node:true, unused:strict */
'use strict';

var cacheWrapper = require('../cache-wrapper');
var debug = require('debug')('snappy-cache:standard');

function StandardCachePolicy(options) {
  this.redisClient = options.redisClient;
  this.codec = options.codec;
  this.cache = options.cache;

  if(typeof options.ttl === 'function') {
    this.getTTL = options.ttl;
  } else {
    this.ttl = options.ttl || 60;
  }

}

StandardCachePolicy.prototype.get = function(key, fetchCallback, callback) {
  debug('get: %s', key);

  var self = this;
  var fullKey = self.prefix + key;

  self.redisClient.get(new Buffer(fullKey), function(err, result) {
    if(err || !result) {
      if(err) {
        self.cache.emit('persistenceError', err);
      }

      return self.fetchValuesAndSave(key, fetchCallback, callback);
    }

    self.codec.decode(result, function(err, decompressedResult) {
      if(err) {
        self.cache.emit('decodeError', err);

        return self.fetchValuesAndSave(key, fetchCallback, callback);
      }

      return callback(null, cacheWrapper.unwrap(decompressedResult));
    });

  });
};

StandardCachePolicy.prototype.fetchValuesAndSave = function(key, fetchCallback, callback) {
  debug('fetchValuesAndSave: %s', key);

  var self = this;

  fetchCallback(function(err, result) {
    if(err) return callback(err);

    // Log the error if we get one
    callback(null, result);

    var serialisedResult = cacheWrapper.wrap(result);

    self.codec.encode(serialisedResult, function(err, compressed) {
      if(err) return callback(null, result);

      var ttl = self.getTTL(key);
      var fullKey = self.prefix + key;

      self.redisClient.setex(fullKey, ttl, compressed, function(err) {
        if (err) {
          self.cache.emit('persistenceError', err);
        }
      });
    });

  });
};

StandardCachePolicy.prototype.invalidate = function(key, callback) {
  debug('invalidate: %s', key);

  var self = this;
  var fullKey = this.prefix + key;

  this.redisClient.del(fullKey, function(err) {
    if (err) {
      self.cache.emit('persistenceError', err);
    }
    if (callback) callback(err);
  });
};

StandardCachePolicy.prototype.getTTL = function(/*key*/) {
  return this.ttl;
};

module.exports = exports = StandardCachePolicy;
