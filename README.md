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


