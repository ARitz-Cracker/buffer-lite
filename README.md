# buffer-lite

Implements Node-style Buffer's on the browser with minimal overhead

## We already have this, why did you do this?

This package was originally created in 2020 under the belief that the standard `buffer` npm package was too supportive of legacy browsers, and under-utilized native browser features. `buffer-lite` is able to achieve zero dependencies while still remaining performant by...

* Using the global `atob` and `btoa` functions for base-64 conversion
* Using the native `TextEncoder` and `TextDecoder` classes for utf8 conversion
* Using the magic of spread-operators to eliminate `String.fromCharCode` loops (for small buffers) during text encoding.

## What version of NodeJS did you write this in mind?

At the time of writing, `buffer-lite` is feature-compatible with NodeJS v20.7.0. However, it only provides the `Buffer` class, and does not provide the other functions/constants provided by `node:buffer`. It also currently doesn't implement the `inspect` method.

## What's the oldest ECMAScript version this thing works with?

ES2017. This means that despite implementing the read/write bigint methods, this package can be used in environments that don't have bigints. However, errors will be thrown if you attempt to use said methods in an environment which doesn't have a global `BigInt` function.

## Docs?

[Read this](https://nodejs.org/docs/latest-v20.x/api/buffer.html#class-buffer)
