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

// Define server list rows
const RANDOMDNS_NAME = 0,
      RANDOMDNS_FULLNAME = 1,
      RANDOMDNS_DESCRIPTION = 2,
      RANDOMDNS_LOCATION = 3,
      RANDOMDNS_COORDINATES = 4,
      RANDOMDNS_URL = 5,
      RANDOMDNS_VERSION = 6,
      RANDOMDNS_DNSSEC_VALIDATION = 7,
      RANDOMDNS_NO_LOG = 8,
      RANDOMDNS_NAMECOIN = 9,
      RANDOMDNS_RESOLVER_ADDRESS = 10,
      RANDOMDNS_PROVIDER_NAME = 11,
      RANDOMDNS_PROVIDER_PUBLICKEY = 12,
      RANDOMDNS_PROVIDER_PUBLICKEY_TXTRECORD = 13;
     
const debug         = require('debug'),
      filtersDebug  = debug('filters');

module.exports = {
    country: [
        {
            working: false,
            description: 'Country filter only take countries that you want.',
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
            description: 'Use servers with IPv6 or not.',
            examples: [
                "true", "false"
            ]
        }, (valuesOriginal, want) => {
                        
            if(want !== 'false') {
                return values;
            }
                        
            // Delete IPv6 addresses
            let value,
                ipRegex = require('ip-regex'),
                values = valuesOriginal;

            for(value in values) {
                
                // Get server infos
                let serverInfo = values[value];
                
                // If the IP is not an IPv4 then delete it
                if(!ipRegex.v4().test(serverInfo[RANDOMDNS_RESOLVER_ADDRESS])) {
                    filtersDebug('Deleted ' + serverInfo[RANDOMDNS_FULLNAME]);
                    delete values[ value ];
                }
            }
            
            // Remove deleted values with JS filter function
            values = values.filter(function(a){return typeof a !== 'undefined';});
            
            // If nothing has been deleted, say it
            if(valuesOriginal.length == values.length) {
                filtersDebug('Nothing has been deleted.');
            }
            
            return values;
        }
    ]
};