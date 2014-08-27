/*jshint node:true, unused:strict */
'use strict';

var redis = require('redis');

// Simple defaults
function defaults(object, _default) {
  Object.keys(_default).forEach(function(key) {
    if(!object.hasOwnProperty(key)) {
      object[key] = _default[key];
    }
  });
  return object;
}

var codecs = {
  json: require('./codecs/json'),
  snappy: require('./codecs/snappy')
};

var policies = {
  'standard': require('./cache-policy/standard'),
  'two-tier': require('./cache-policy/two-tier')
};

function SnappyCache(options) {
  if(!options) options = {};

  var redisClient = options.redis || redis.createClient(options.redisPort, options.redisHost, options.redisOptions);
  var codec = codecs[options.codec || 'json'];
  var prefix = options.prefix || '';
  var policyOptions;
  if(options.policyOptions) {
    policyOptions = options.policyOptions;
  } else {
    policyOptions = {
      ttl: options.ttl
    };
  }

  var Policy = policies[options.policy || 'standard'];
  this.policy = new Policy(defaults({
    redisClient: redisClient,
    codec: codec,
    prefix: prefix
  }, policyOptions));
}

SnappyCache.prototype.lookup = function(key, fetchCallback, callback) {
  this.policy.get(key, fetchCallback, callback);
};

SnappyCache.prototype.invalidate = function(key, callback) {
  this.policy.invalidate(key, callback);
};

module.exports = exports = SnappyCache;
