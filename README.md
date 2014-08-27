Snappy-Cache
=================

A tiny nodejs module for caching values in Redis. Uses Google's snappy
algorithm to compress values before they're stored in Redis.

Examples:


Create a cache:
---------------

```
var sc = new SnappyCache({
  prefix: 'snappy-cache-test:', /* Redis key prefix */
  ttl: 60, /* TTL in seconds, can also be function(key) -> ttl in seconds */
  redis: redisClient /* Optional. Will connect to localhost if not specified */
});
```

Create a two-tier cache:
------------------------

The two-tier caching policy has two caching levels: hot and cool. A hot cache item works in the usual way - if there is a cache hit, the value is used. When an item is cool, the cache will call the backend but will use the cached value if the call takes more than the `coolRefetchTimeout` value. When the backend call returns, the cache will be asynchronously updated with the new value, even though the original caller used a cached value. This will allow subsequent callers to use the newly cached value.

This caching policy is useful when access very infrequently updated datasources available over very high latency connections (or slow datasources). 

```
var sc = new SnappyCache({
  policy: 'two-tier',
  prefix: 'snappy-cache-test:', /* Redis key prefix */
  hotTTL: 60, /* Hot TTL in seconds, can also be function(key) -> ttl in seconds */
  coolTTL: 86400, /* Cool TTL in seconds, can also be function(key) -> ttl in seconds */
  coolRefetchTimeout: 1 /* Timeout in seconds before using the cached value */
  redis: redisClient /* Optional. Will connect to localhost if not specified */
});
```

Lookup a value:
---------------
```
/* This function is used for cache misses */
function lookupFunction(cb) {
  process.nextTick(function() {
    cb(null, 1);
  });
}

sc.lookup('value-1', lookupFunction, function(err, result) {
  // ...
});
```

Invalidate a key:
-----------------

```
function lookupFunction(cb) {
  process.nextTick(function() {
    cb(null, 1);
  });
}

sc.invalidate('value-1', function(err) {
  // ...
});
```




