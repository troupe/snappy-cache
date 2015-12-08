/*jshint node:true, unused:strict */
'use strict';

var redis = require('redis');
var events = require("events");
var util = require("util");

// Simple defaults
function defaults(object, _default) {
  Object.keys(_default).forEach(function(key) {
    if(!object.hasOwnProperty(key)) {
      object[key] = _default[key];
    }
  });
  return object;
}

var policies = {
  'standard': function() { return require('./cache-policy/standard'); },
  'two-tier': function() { return require('./cache-policy/two-tier'); }
};

function createRedisClient(options) {
  var redisOptions = defaults(options.redisOptions || {}, { detect_buffers: true });
  return redis.createClient(options.redisPort || 6379, options.redisHost || '127.0.0.1', redisOptions);
}

function SnappyCache(options) {
  events.EventEmitter.call(this);

  if(!options) options = {};

  var redisClient = options.redis || createRedisClient(options);

  var codec = options.codec || require('./codecs/json');
  var prefix = options.prefix || '';

  // NOTE: can't do this without the codec name anymore
  /*
  if (options.validateRedisClient !== false) {
    if (codec !== 'json' && !redisClient.options.detect_buffers) {
      throw new Error('Redis client requires detect_buffers option to be set');
    }
  }
  */

  var policyOptions;
  if(options.policyOptions) {
    policyOptions = options.policyOptions;
  } else {
    policyOptions = {
      ttl: options.ttl
    };
  }

  var Policy = policies[options.policy || 'standard']();
  this.policy = new Policy(defaults({
    redisClient: redisClient,
    codec: codec,
    prefix: prefix,
    cache: this
  }, policyOptions));
}
util.inherits(SnappyCache, events.EventEmitter);

SnappyCache.prototype.lookup = function(key, fetchCallback, callback) {
  this.policy.get(key, fetchCallback, callback);
};

SnappyCache.prototype.invalidate = function(key, callback) {
  this.policy.invalidate(key, callback);
};

module.exports = exports = SnappyCache;
