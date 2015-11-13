/*jshint node:true, unused:strict */
'use strict';

var cacheWrapper = require('../cache-wrapper');
var debug = require('debug')('snappy-cache:standard');

function TwoTierCachePolicy(options) {
  this.prefix = options.prefix;
  this.redisClient = options.redisClient;
  this.codec = options.codec;
  this.coolRefetchTimeout = options.coolRefetchTimeout || 0.5; /* half second default */
  this.cache = options.cache;

  if(typeof options.hotTTL === 'function') {
    this.getHotTTL = options.hotTTL;
  } else {
    this.hotTTL = options.hotTTL || 60 /* 60 seconds cache */;
  }

  if(typeof options.coolTTL === 'function') {
    this.getCoolTTL = options.coolTTL;
  } else {
    this.coolTTL = options.coolTTL || 86400 /* 1 day cool cache */;
  }

}

TwoTierCachePolicy.prototype.get = function(key, fetchCallback, callback) {
  debug('get: %s', key);
  var self = this;

  var hotkey = self.prefix + key + ':h';
  var coolkey = self.prefix + key + ':c';

  self.redisClient.mget(new Buffer(hotkey), coolkey, function(err, result) {
    if(err) {
      self.cache.emit('persistenceError', err);

      // Attempt refetch
      return self.attemptRefetch(key, fetchCallback, callback);
    }

    var hotFlag = result && result[0];
    var coolResult = result && result[1];

    if(!coolResult) {
      // Cache miss, refetch required
      return self.attemptRefetch(key, fetchCallback, callback);
    }

    if(hotFlag) {
      debug('cache-hit-hot: %s', key);
      // The cache is hot, return the value
      return self.decode(coolResult, callback);
    }

    debug('cache-hit-cool: %s', key);
    var raceTimeout = setTimeout(function() {
      debug('cache-hit-cool: %s timeout on backend', key);

      var c = callback;
      callback = null;

      return self.decode(coolResult, c);
    }, self.coolRefetchTimeout * 1000);

    // The cache is cool. Attempt refetch with timeout
    self.attemptRefetch(key, fetchCallback, function(err, result) {
      if(!callback) return;

      var c = callback;
      callback = null;
      clearTimeout(raceTimeout);

      if(err) {
        self.cache.emit('fetchError', err);
        return self.decode(coolResult, c);
      }

      debug('cache-hit-cool: %s retrieved from backend', key);
      return c(null, result);
    });

  });

};

TwoTierCachePolicy.prototype.decode = function(encodedValue, callback) {
  var self = this;

  // Decode and unwrap a value
  return this.codec.decode(encodedValue, function(err, decoded) {
    if(err) {
      self.cache.emit('decodeError', err);
      return callback(err);
    }

    return callback(null, cacheWrapper.unwrap(decoded));
  });
};

TwoTierCachePolicy.prototype.attemptRefetch = function(key, fetchCallback, callback) {
  debug('attemptRefetch: %s', key);

  var self = this;

  fetchCallback(function(err, result) {
    if(err) return callback(err);

    var serialisedResult = cacheWrapper.wrap(result);

    self.codec.encode(serialisedResult, function(err, compressed) {
      if(err) return callback(null, result);

      var hotKey = self.prefix + key + ':h';
      var hotTTL = self.getHotTTL(key);

      var coolKey = self.prefix + key + ':c';
      var coolTTL = self.getCoolTTL(key);

      var multi = self.redisClient.multi();
      multi.psetex(hotKey, hotTTL * 1000, '1');
      multi.psetex(coolKey, coolTTL * 1000, compressed);

      multi.exec(function(err) {
        if (err) {
          self.cache.emit('persistenceError', err);
        }

        // Log the error if we get one
        return callback(null, result);
      });
    });

  });
};

TwoTierCachePolicy.prototype.invalidate = function(key, callback) {
  debug('invalidate: %s', key);

  var hotKey = this.prefix + key + ':h';
  var coolKey = this.prefix + key + ':c';
  var self = this;

  this.redisClient.del(hotKey, coolKey, function(err) {
    if (err) {
      self.cache.emit('persistenceError', err);
    }
    if (callback) callback(err);
  });
};

TwoTierCachePolicy.prototype.getHotTTL = function(/*key*/) {
  return this.hotTTL;
};

TwoTierCachePolicy.prototype.getCoolTTL = function(/*key*/) {
  return this.coolTTL;
};

module.exports = exports = TwoTierCachePolicy;
