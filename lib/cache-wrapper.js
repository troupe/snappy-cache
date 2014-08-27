/*jshint node:true, unused:strict */
'use strict';

exports.wrap = function(value) {
  if(value === undefined) {
    return { u: 1 };
  }

  if(value === null) {
    return { n: 1 };
  }

  return { j: value };
};

exports.unwrap = function(value) {
  if(value.u === 1) return undefined;
  if(value.n === 1) return null;

  return value.j;
};

