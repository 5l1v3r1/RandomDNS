#!/usr/bin/env node

/*
 *    ___               __           ___  _  ______
 *   / _ \___ ____  ___/ /__  __ _  / _ \/ |/ / __/
 *  / , _/ _ `/ _ \/ _  / _ \/  ' \/ // /    /\ \
 * /_/|_|\_,_/_//_/\_,_/\___/_/_/_/____/_/|_/___/
 *
 * Version: 1.2 (Alpha)
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

// Import dependencies
const assert    = require('assert'),
      crypto    = require('crypto'),
      path      = require('path'),
      fs        = require('fs'),
      cli       = require('commander'),
      debug     = require('debug'),
      async     = require('async'),
      csv       = require('csv'),
      filters   = require('cookie'),
      random    = require('random-js');

// Core debug
const coreDebug = debug('core');

class RandomDNS {

    constructor() {

        // Splash
        console.log(new Buffer('DQogICBfX18gICAgICAgICAgICAgICBfXyAgICAgICAgICAgX19fICBfICBfX19fX18NCiAgLyBfIFxfX18gX19fXyAgX19fLyAvX18gIF9fIF8gIC8gXyBcLyB8LyAvIF9fLw0KIC8gLCBfLyBfIGAvIF8gXC8gXyAgLyBfIFwvICAnIFwvIC8vIC8gICAgL1wgXCAgDQovXy98X3xcXyxfL18vL18vXF8sXy9cX19fL18vXy9fL19fX18vXy98Xy9fX18vICANCg==', 'base64').toString('ascii'));

        cli.version(require('./package.json').version)
            .usage('[options] [file]')
            .option('-L, --listenOn [string]', 'Listen on a specific interface/port [default: 127.0.0.1:53]', '127.0.0.1:53')
            .option('-R, --rotationTime [int]', 'Define the time to wait before rotating the server (in seconds) [default: 600 seconds]', 600)
            .option('-P, --reverseProxy [bool]', 'Enable EdgeDNS reverse proxy [default: false]', false)
            .option('--reverseProxyChildStartPort [int]', 'Where childrens (dnscrypt-proxy processes) should start incrementing the port? (will work only if reverseProxy is enabled) [default: 51000]', 51000)
            .option('-T, --threads [int]', 'Number of childs to spawn, set to 1 to disable load balacing (will work only if reverseProxy is enabled) [default: 4]', 4)
            //.option('-S, --scramble [bool]', 'Scramble your DNS traffic by resolving fake queries [default: true]', true)
            .option('-F, --filters [string]', 'Use filters [default: IPv6=false;]', 'IPv6=false;')
            .option('--filters-help', 'Get full list of available filters.')
            .option('-b, --binaryDNSCryptFile [string]', 'Use custom DNSCrypt binary, will not work until --binaryDNSCryptFileSignature is changed.', '/usr/local/opt/dnscrypt-proxy/sbin/dnscrypt-proxy')
            .option('--binaryDNSCryptFileSignature [string]', 'SHA512 hash of the DNSCrypt binary.', '3bd6f8d51e9c776ff637c23c50813dedc5ff9ccefb15c30bf084212b09a828161f068ffb0f009396350f3da217306633cc06e554fae25c07834f32bb07196582')
            .option('-b, --binaryEdgeDNSFile [string]', 'Use custom EdgeDNS binary, will not work until --binaryEdgeDNSFileSignature is changed.', '/Users/sabri/Desktop/edgedns')
            .option('--binaryEdgeDNSFileSignature [string]', 'SHA512 hash of the EdgeDNS binary.', '59bc3da17f5ae2d7c69a48b92a69fb3556155fbffc27394d34dc376dcbf175c6790bd2bb5cc4c9825198c449c113f8735b29d7f42c6103c3941b108bb81af99b')
            .option('-r, --resolverListFile [string]', 'Use custom DNSCrypt resolver list file, will not work until --resolverListFileSignature is changed.', path.resolve(__dirname, 'dnscrypt-proxy/dnscrypt-resolvers.csv'))
            .option('--resolverListFileSignature [string]', 'SHA512 hash of the DNSCrypt resolver list file.', '43b3000ce24390314b137109c85c4cf72b6d26e3269029e28d2beb0e1cb6c2b06725fff3858e86e7726a0cc6ed4152fb670d62cc3fa8610b609c22b9b68af273')
            .parse(process.argv);

        // Hashes of external files
        this.hashTable = {
          'dnscrypt-proxy':           cli.binaryDNSCryptFileSignature,
          'edgedns':                  cli.binaryEdgeDNSFile,
          'dnscrypt-resolvers.csv':   cli.resolverListFileSignature
        };

        // Set as the right boolean value for reverseProxy
        if(cli.reverseProxy === 'false') {
          cli.reverseProxy = false;
        } else if(cli.reverseProxy === 'true') {
          cli.reverseProxy = true;
        }

        // Options
        this.options = {
          dnscryptFile:                 fs.readFileSync(cli.binaryDNSCryptFile),
          edgeDnsFile:                  fs.readFileSync(cli.binaryEdgeDNSFile),
          serverListFile:               fs.readFileSync(cli.resolverListFile),
          dnscryptFileTmp:              '/tmp/dnscrypt-proxy-' + this.getRandomNumber(1000000),
          edgeDnsFileTmp:               '/tmp/edgedns-' + this.getRandomNumber(1000000)
        };
    }

    // Check if the current user is root
    isRoot() {
        return (process.getuid && process.getuid() === 0);
    }

    // Generate non cryptographically secure random number by using Mersenne Twister
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

    // Filters part (may be soon moved in a plugins system)
    filters() {
        return require('./filters')(RANDOMDNS_NAME, RANDOMDNS_FULLNAME, RANDOMDNS_DESCRIPTION, RANDOMDNS_LOCATION, RANDOMDNS_COORDINATES, RANDOMDNS_URL, RANDOMDNS_VERSION, RANDOMDNS_DNSSEC_VALIDATION, RANDOMDNS_NO_LOG, RANDOMDNS_NAMECOIN, RANDOMDNS_RESOLVER_ADDRESS, RANDOMDNS_PROVIDER_NAME, RANDOMDNS_PROVIDER_PUBLICKEY, RANDOMDNS_PROVIDER_PUBLICKEY_TXTRECORD);
    }
    applyFilters(serverList) {

        let filter,
            userFilters         = filters.parse(cli.filters),
            availableFilters    = this.filters();

        for(filter in userFilters) {

            // Lowercase the filter name
            let filterNameNormalized = filter.toLowerCase(),
                filterObject = availableFilters[filterNameNormalized];

            if(typeof filterObject == 'object') {

                // Skip if the filter is flagged as not working
                if(!filterObject[0].working) {
                    continue;
                }

                // Pattern found, send server list to the function
                coreDebug('Sending datas to ' + filter + '...');
                serverList = filterObject[1](serverList, userFilters[filter])
                    .filter((a) => {return typeof a !== 'undefined';}); // Remove deleted values with JS filter function
                continue;
            }

            coreDebug('Skipping unknown "' + filter + '" filter.');
        }

        return serverList;
    }
    showFilters() {

        let filtersToShow = this.filters(),
            prtConsole = ((string, tabulationCount) => {
                console.log(('  '.repeat(tabulationCount || 0)) + string);
            });

        prtConsole('Available filters:');
        prtConsole('');

        // Print them
        let filter, example;
        for(filter in filtersToShow) {

            // Skip if the filter is flagged as not working
            if(!filtersToShow[filter][0].working) {
                continue;
            }

            prtConsole(filter + ':', 2);

            let filterDescription = filtersToShow[filter][0].description,
                filterExamples = filtersToShow[filter][0].examples;

            prtConsole('Description: ' + filterDescription, 3);
            prtConsole('');
            prtConsole('Examples:', 3);

            for(example in filterExamples) {
                prtConsole('--filters="'+ filter + '=' + filterExamples[example] + ';"', 4);
            }

            prtConsole('');
        }
    }

    run() {

        // Load dependencies
        const options           = this.options,
              getRandomNumber   = this.getRandomNumber,
              applyFilters      = this.applyFilters;

        // Show available filters?
        if((typeof cli.filtersHelp != 'undefined') && cli.filtersHelp) {
            this.showFilters();
            return false;
        }

        // Runtime checks
        try {

            // Check if the program is run as root
            assert(this.isRoot(),
                'Sorry but you must run this program as root so I can run dnscrypt-proxy on the DNS port.'
            );

            // Ensure integrity of files
            assert((
                this.createSignature(this.options.dnscryptFile) == this.hashTable['dnscrypt-proxy']
            ), 'Failed to check integrity of dnscrypt-proxy, aborting');
            assert((
                this.createSignature(this.options.serverListFile) == this.hashTable['dnscrypt-resolvers.csv']
            ), 'Failed to check integrity of dnscrypt-resolvers.csv, aborting');
            assert((
                this.createSignature(this.options.serverListFile) == this.hashTable['dnscrypt-resolvers.csv']
            ), 'Failed to check integrity of dnscrypt-resolvers.csv, aborting');

            // Show the server rotation setting if set
            if(cli.rotationTime != 0) {
                coreDebug(`Server rotation set to ${cli.rotationTime} seconds`);
            }

        } catch(e) {

            if(e.name == 'AssertionError') {
                console.error(`[ERROR] ${e.message}`);
                return false;
            }

            console.error(e);
            return false;
        }

        async.series([

            (callback) => {

              // Write DNSCrypt binary in /tmp as root with restricted permissions
              fs.writeFile(options.dnscryptFileTmp, options.dnscryptFile, {
                mode: 500 // Set chmod to Execute+Read-only for the owner
              }, () => {

                // Set chown to nobody:nogroup if reverseProxy is activated in order to reduce surface attack
                let userid = require('userid');
                fs.chown(options.dnscryptFileTmp, userid.uid('nobody'), userid.gid('nobody'), () => {
                    callback();
                });
              });
            },

            (callback) => {

              // Do not copy the binary if the reverseProxy option is disabled
              if(!cli.reverseProxy) {
                callback();
                return false;
              }

              // Write EdgeDNS binary in /tmp as root with restricted permissions
              fs.writeFile(options.edgeDnsFileTmp, options.edgeDnsFile, {
                mode: 500 // Set chmod to Execute+Read-only for the owner
              }, () => {
                callback();
              });
            },

            // Parse the CSV
            (callback) => {
                csv.parse(options.serverListFile, (err, data) => {
                    if (err) throw err;
                    callback(false, data);
                });
            }

        ], (err, serverListParsed) => {

            // Get server list content
            let result = serverListParsed[2];

            // Remove descriptions rows
            delete result[0];

            // Apply filters (if any)
            if((typeof cli.filters == 'string') && (cli.filters != '')) {
                result = this.applyFilters(result);
            }

            // List number of available servers
            coreDebug(`${result.length} servers are available. Picking one...`);

            // Instances functions
            const spawn = require('child_process').spawn,
            runEdgeDNS = (tableOfUsedPorts) => {

                let childDebug = debug('reverse'),
                    masterArgs = [
                      '--listen',
                      cli.listenOn,
                      '--resolver-mode',
                      '--upstream',
                      '127.0.0.1:' + tableOfUsedPorts.join(',127.0.0.1:')
                    ],
                    masterProcess = spawn(options.edgeDnsFileTmp, masterArgs);

                // ToDo: Rerun if Down

                // Print the command that has been executed
                coreDebug(`Running ${options.edgeDnsFileTmp} ${masterArgs.join(' ')}...`);
            },
            runDNSCrypt = (childNumber, childPortNumber, lastPickedServer) => {

                let childDebug = debug('proxy:' + childNumber);

                if(typeof lastPickedServer == 'undefined') lastPickedServer = -1;

                // Get a random server in the list
                let randomChoosenInt = getRandomNumber(result.length, 1),
                    pickedServer = result[randomChoosenInt];

                // Prevent a crash
                if(typeof pickedServer == 'undefined') {
                    coreDebug(`An unknown error occurred while reading the entry.`);
                    runDNSCrypt(childNumber, childPortNumber);
                    return false;
                }

                // Prevent the same server from being choosen again
                if(randomChoosenInt == lastPickedServer) {
                    runDNSCrypt(childNumber, childPortNumber, randomChoosenInt);
                    return false;
                }

                // Show informations about the resolver
                childDebug(`OK. Taking ${pickedServer[RANDOMDNS_NAME]} based in ${pickedServer[RANDOMDNS_LOCATION]}`);
                childDebug(`Full name: ${pickedServer[RANDOMDNS_FULLNAME]}`);
                childDebug('Do they log? ' + (pickedServer[RANDOMDNS_NO_LOG] == 'yes' ? 'No' : 'Yes'));
                childDebug(`Resolver Address: ${pickedServer[RANDOMDNS_RESOLVER_ADDRESS]}`);
                childDebug(`Public Key: ${pickedServer[RANDOMDNS_PROVIDER_PUBLICKEY]}`);

                // Define args
                let sudoArgs = [
                  '-u',
                  'nobody',
                  options.dnscryptFileTmp
                ],
                childArgs = [
                  '--local-address',
                  '127.0.0.1:' + childPortNumber,
                  '-E', // Use ephemeral keys
                  '-r',
                  pickedServer[RANDOMDNS_RESOLVER_ADDRESS],
                  '--provider-name',
                  pickedServer[RANDOMDNS_PROVIDER_NAME],
                  '--provider-key',
                  pickedServer[RANDOMDNS_PROVIDER_PUBLICKEY]
                ];

                // Run the child process
                let childProcess = false;
                if(cli.reverseProxy) {
                  // For security, run DNSCrypt as nobody if reverse proxy is activated
                  childProcess = spawn('/usr/bin/sudo', sudoArgs.concat(childArgs));
                } else {
                  childProcess = spawn(options.dnscryptFileTmp, childArgs);
                }

                // Rotate the provider in a predefined time
                if(cli.rotationTime != 0) {
                    setTimeout(() => {
                        childProcess.kill('SIGINT');
                    }, (cli.rotationTime * 1000));
                }

                childProcess.stdout.on('data', (data) => {

                    // Stringify datas
                    data = data.toString('utf8').trim();

                    // Health check: Detect dead/unreachable server
                    let healthCheckOnConnectionError = /Unable to retrieve server certificates/g;
                    if(healthCheckOnConnectionError.test(data)) {
                        childDebug('Server is unreachable!');
                        childProcess.kill('SIGINT');
                        return false;
                    }

                    childDebug(`stdout: ${data}`);
                });

                childProcess.stderr.on('data', (data) => {
                    childDebug(`stderr: ${data}`);
                });

                childProcess.on('close', (code) => {

                    if(code == null) {
                      childDebug(`Rotating the server...`);
                    } else {
                      childDebug(`DNSCrypt proxy exited with code ${code}! Re-running it...`);
                    }

                    setTimeout(() => {
                        return runDNSCrypt(childNumber, childPortNumber, randomChoosenInt);
                    }, 2500);
                });
            };

            // Run everything
            if(cli.reverseProxy) {

              let tableOfUsedPorts = [];

              for (let i = 0; i < cli.threads; i++) {
                let portToUse = (cli.reverseProxyChildStartPort + i);
                tableOfUsedPorts.push(portToUse);
                runDNSCrypt(i, portToUse);
              }

              runEdgeDNS(tableOfUsedPorts);
            } else {
              // Run one instance of DNSCrypt without reverse proxy (EdgeDNS)
              runDNSCrypt(1, 53);
            }
        });
    }
};

// Start randomDNS
(new RandomDNS()).run();
