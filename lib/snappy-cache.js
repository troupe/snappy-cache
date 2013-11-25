/*jshint node:true */
'use strict';

var redis = require('redis');
var snappy = require('snappy');
var ENCODING = 'binary';

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

      var x = new Buffer(JSON.stringify(serialisedResult), 'utf8');

      var s = snappy.compress(x, function(err, compressed) {
        if(err) return callback(void 0, result);

        var ttl = self.getTTL(key);
        var s = compressed.toString(ENCODING);

        self.redisClient.setex(fullKey, ttl, s, function(err) {
          // Log the error if we get one
          return callback(void 0, result);
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

    var buffer = new Buffer(result, ENCODING);

    snappy.decompress(buffer, snappy.parsers.json, function(err, decompressedResult) {
      if(err) {
        console.error(err);
        fetchValuesAndSave();
        return;
      }

      if(decompressedResult.u === 1) return callback(void 0, undefined);
      if(decompressedResult.n === 1) return callback(void 0, null);

      return callback(void 0, decompressedResult.j);
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