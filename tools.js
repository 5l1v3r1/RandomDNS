/*
 *    ___               __           ___  _  ______
 *   / _ \___ ____  ___/ /__  __ _  / _ \/ |/ / __/
 *  / , _/ _ `/ _ \/ _  / _ \/  ' \/ // /    /\ \
 * /_/|_|\_,_/_//_/\_,_/\___/_/_/_/____/_/|_/___/
 *
 * Author: Sabri Haddouche <sabri@riseup.net>
*/

"use strict";

const random    = require('random-js'),
      crypto    = require('crypto');

class Tools {

  // Check if the current user is root
  isRoot() {
    return (process.getuid && process.getuid() === 0);
  }

  // Generate non cryptographically secure random number by using the Mersenne Twister
  getRandomNumber(maxInt, minInt) {
    return random
      .integer(minInt || 0, maxInt)(random.engines.mt19937().autoSeed());
  }

  // Check hash of a file
  createSignature(datas, algorithm, encoding) {
    return crypto
      .createHash(algorithm || 'sha512')
      .update(datas, 'utf8')
      .digest(encoding || 'hex')
  }
};

module.exports = new Tools();
