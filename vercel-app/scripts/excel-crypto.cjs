'use strict';
// ExcelJS only requires these three crypto APIs (lib/utils/encryptor.js).
// Use established browser hashing/CSPRNG packages; never ship the unrelated
// elliptic-curve signing/ECDH APIs from the general crypto-browserify shim.
module.exports = {
  createHash: require('create-hash'),
  randomBytes: require('randombytes'),
  getHashes: () => ['md5','rmd160','ripemd160','sha','sha1','sha224','sha256','sha384','sha512'],
};
