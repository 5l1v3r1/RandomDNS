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

const debug                = require('debug'),
      filtersFormulaDebug  = debug('filters:formula');

module.exports = (defines) => {

    return {

        country: [
            {
                working: false,
                description: 'Country filter only take servers in countries that you want.',
                examples: [
                    '*,EXCEPT(CH,FR)',
                    'CH,FR'
                ]
            },
            (values, want) => {

                // Get the country to 2-letter code
                let countryToTwoLetterCode = require('./ISO-3166-Countries-with-Regional-Codes/slim-2.json');

                // Filter
                let countriesNeeded = want.split(',');

                console.log(countriesNeeded);

                return values;
            }
        ],

        ipv6: [
            {
                working: true,
                description: 'IPv6 filter enable/disable the usage of IPv6 servers.',
                examples: [ "true", "false" ]
            }, (originalValues, want) => {
                if(want !== 'false') return originalValues;

                // Init
                let value,
                    ipRegex = require('ip-regex'),
                    values = originalValues;

                for(value in values) {

                    // Get server infos
                    let serverInfo = values[value];

                    // If the IP is not an IPv4 then delete it
                    if(!ipRegex.v4().test(serverInfo[defines.RANDOMDNS_RESOLVER_ADDRESS])) {
                        filtersFormulaDebug('Deleted ' + serverInfo[defines.RANDOMDNS_FULLNAME]);
                        delete values[ value ];
                    }
                }

                return values;
            }
        ],

        nolog: [
            {
                working: true,
                description: 'Get only servers with no-logging policy.',
                examples: [ "true", "false" ]
            }, (originalValues, want) => {
                if(want !== 'true') return originalValues;

                // Init
                let value,
                    values = originalValues;

                for(value in values) {

                    // Get server infos
                    let serverInfo = values[value];

                    // If no informations are given about the logging policy, continue
                    if(typeof serverInfo[defines.RANDOMDNS_NO_LOG] == 'undefined') continue;

                    // Delete the entry if the server is logging DNS queries according to DNSCrypt-Proxy
                    if(serverInfo[defines.RANDOMDNS_NO_LOG].toLowerCase() == 'no') {
                        filtersFormulaDebug('Deleted ' + serverInfo[defines.RANDOMDNS_FULLNAME]);
                        delete values[ value ];
                    }
                }

                return values;
            }
        ]
    };
};
