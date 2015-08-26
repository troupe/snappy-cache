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

var codecs = {
  json: function() { return require('./codecs/json'); },
  snappy: function() { return require('./codecs/snappy'); }
};

var policies = {
  'standard': function() { return require('./cache-policy/standard'); },
  'two-tier': function() { return require('./cache-policy/two-tier'); }
};

function SnappyCache(options) {
  events.EventEmitter.call(this);

  if(!options) options = {};

  var redisClient = options.redis || redis.createClient(options.redisPort, options.redisHost, options.redisOptions);
  var codec = codecs[options.codec || 'json']();
  var prefix = options.prefix || '';
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
