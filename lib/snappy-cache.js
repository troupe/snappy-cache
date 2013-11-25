/*jshint node:true, unused:strict */
'use strict';

var redis = require('redis');
var codecs = {
  json: require('./codecs/json'),
  snappy: require('./codecs/snappy')
};

function SnappyCache(options) {
  if(!options) options = {};

  this.codec = codecs[options.codec || 'json'];

  this.redisClient = options.redis || redis.createClient(options.redisPort, options.redisHost, options.redisOptions);
  this.prefix = options.prefix || '';

  if(typeof options.ttl === 'function') {
    this.getTTL = options.ttl;
  } else {
    this.ttl = options.ttl || 60;
  }
}

SnappyCache.prototype.lookup = function(key, fetchCallback, callback) {
  var self = this;
  var fullKey = self.prefix + key;

  function fetchValuesAndSave() {
    fetchCallback(function(err, result) {
      if(err) return callback(err);

      var serialisedResult;
      if(result === undefined) {
        serialisedResult = { u: 1 };
      } else if(result === null) {
        serialisedResult = { n: 1 };
      } else {
        serialisedResult = { j: result };
      }

      this.codec.encode(serialisedResult, function(err, compressed) {
        if(err) return callback(null, result);

        var ttl = self.getTTL(key);

        self.redisClient.setex(fullKey, ttl, compressed, function(err) {
          if(err) {
            console.error(err);
          }

          // Log the error if we get one
          return callback(null, result);
        });
      });

    });
  }

  self.redisClient.get(fullKey, function(err, result) {
    if(err || !result) {
      if(err) {
        console.error(err);
      }

      fetchValuesAndSave();

      return;
    }

    this.codec.decode(result, function(err, decompressedResult) {
      if(err) {
        console.error(err);
        fetchValuesAndSave();
        return;
      }

      if(decompressedResult.u === 1) return callback(null, undefined);
      if(decompressedResult.n === 1) return callback(null, null);

      return callback(null, decompressedResult.j);
    });

  });
};

SnappyCache.prototype.invalidate = function(key, callback) {
  var fullKey = this.prefix + key;
  this.redisClient.del(fullKey, callback);
};

SnappyCache.prototype.getTTL = function(/*key*/) {
  return this.ttl;
};

module.exports = exports = SnappyCache;