/*jshint node:true */
'use strict';

var redis = require('redis');
var snappy = require('snappy');

function SnappyCache(options) {
  if(!options) options = {};

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

  self.redisClient.get(fullKey, function(err, result) {
    if(err || !result) {
      fetchCallback(function(err, result) {
        if(err) return callback(err);

        var serialisedResult;
        if(result === undefined) {
          serialisedResult = { sc_u: 1 };
        } else if(result === null) {
          serialisedResult = { sc_n: 1 };
        } else {
          serialisedResult = { sc_o: result };
        }


        var s = snappy.compress(serialisedResult, function(err, compressed) {
          if(err) return callback(void 0, result);

          var ttl = self.getTTL(key);
          var s = compressed.toString('UTF8');

          self.redisClient.setex(fullKey, ttl, s, function(err) {
            // Log the error if we get one
            return callback(void 0, result);
          });
        });

      });
      return;
    }

    snappy.decompress(new Buffer(result, 'UTF8'), snappy.parsers.json, function(err, result) {
      if(err) return err;

      if(result.sc_u === 1) return callback(void 0, undefined);
      if(result.sc_n === 1) return callback(void 0, null);

      return callback(void 0, result.sc_o);
    });

  });
};

SnappyCache.prototype.invalidate = function(key, callback) {
  var fullKey = this.prefix + key;
  this.redisClient.del(fullKey, callback);
};

SnappyCache.prototype.getTTL = function(key) {
  return this.ttl;
};

module.exports = exports = SnappyCache;