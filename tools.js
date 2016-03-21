/*
 *    ___               __           ___  _  ______
 *   / _ \___ ____  ___/ /__  __ _  / _ \/ |/ / __/
 *  / , _/ _ `/ _ \/ _  / _ \/  ' \/ // /    /\ \
 * /_/|_|\_,_/_//_/\_,_/\___/_/_/_/____/_/|_/___/
 *
 * Author: Sabri Haddouche <sabri@riseup.net>
 *
 * This project is my first project who use ES6 so please be kind with critics!
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
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
