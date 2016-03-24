/*
 *    ___               __           ___  _  ______
 *   / _ \___ ____  ___/ /__  __ _  / _ \/ |/ / __/
 *  / , _/ _ `/ _ \/ _  / _ \/  ' \/ // /    /\ \
 * /_/|_|\_,_/_//_/\_,_/\___/_/_/_/____/_/|_/___/
 *
 * Author: Sabri Haddouche <sabri@riseup.net>
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
