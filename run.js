/*
 *    ___               __           ___  _  ______
 *   / _ \___ ____  ___/ /__  __ _  / _ \/ |/ / __/
 *  / , _/ _ `/ _ \/ _  / _ \/  ' \/ // /    /\ \  
 * /_/|_|\_,_/_//_/\_,_/\___/_/_/_/____/_/|_/___/  
 *
 * Version: 1.0 (Alpha)
 * Author: Sabri Haddouche <sabri@riseup.net>
 *
 * This project is my first project who use ES6 so please be kind with critics!
 *
 * ToDo:
 * - Check hash of files -> Done
 * - Run DNSCrypt proxy in /tmp directory with restricted permissions -> Done
 * - Pick a random entry in the csv -> Done
 * - Run DNSCrypt proxy process -> Done
 * - Watch it and relaunch it when the process die -> Done
 * - Add the possibility to filter servers selection (e.g. only IPv6, only Switzerland, only no-log servers...) -> Doing
 *
 * Roadmap:
 * - Add health checks (if the server does not answer anymore, pick another one)
 * - Spawn multiples DNSCrypt processes and do DNS requests load balancing
 * - Rotate the server with a defined time
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

const assert     = require('assert'),
      crypto     = require('crypto'),
      path       = require('path'),
      fs         = require('fs'),
      debug      = require('debug'),
      async      = require('async'),
      csv        = require('csv'),
      Random     = require('random-js');

// Define CSV rows
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

class randomDNS {
    
    constructor(dnscryptFile, serverListFile) {
        
        // Hashes of external files
        this.hashTable = {
            'dnscrypt-resolvers.csv': 'a17ff27f1a6e3a0de68a40bac4339ba8ff593b7220ae0f0690e10554465a64dbfdd3a0eaa26fbfcc84dbf87f3bc50cdf11cf8e1cd5898736025eb27dbc0a2aba',
            'dnscrypt-proxy': '3bd6f8d51e9c776ff637c23c50813dedc5ff9ccefb15c30bf084212b09a828161f068ffb0f009396350f3da217306633cc06e554fae25c07834f32bb07196582'
        };
        
        // Options
        this.options = {
            serverListFile:     fs.readFileSync(serverListFile),
            dnscryptFile:       fs.readFileSync(dnscryptFile),
            dnscryptFileTmp:    '/tmp/dnscrypt-proxy-' + this.getRandomNumber(1000000)
        };
    }
    
    // Function that check if the current user is root
    isRoot() {
        return (process.getuid && process.getuid() === 0);
    }
    
    // Generate non cryptographically secure random number by using Mersenne Twister
    getRandomNumber(maxInt) {
        return Random
            .integer(0, maxInt)(Random.engines.mt19937().autoSeed());
    }
    
    // Check hash of a file
    createSignature(datas, algorithm, encoding) {
        return crypto
            .createHash(algorithm || 'sha512')
            .update(datas, 'utf8')
            .digest(encoding || 'hex')
    }
    
    run() {
        
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

        } catch(e) {
            
            if(e.name == 'AssertionError') {
                console.error('[ERROR] ' + e.message);
                return false;
            }
            
            console.error(e);
            return false;
        }

        const coreDebug = debug('core');
        let options = this.options,
            getRandomNumber = this.getRandomNumber;
            
        async.series([
            
            // Write binary in /tmp as root with restricted permissions
            async.apply(fs.writeFile, options.dnscryptFileTmp, options.dnscryptFile, {
                mode: 500 // Set chmod to Execute+Read-only for the owner
            }),
            
            // Parse the CSV
            (callback) => {
                csv.parse(options.serverListFile, (err, data) => {
                    if (err) throw err;
                    callback(false, data);
                });
            }
            
        ], (err, serverListParsed) => {
            
            // Get server list content
            let result = serverListParsed[1];

            // Remove names entry
            delete result[0];
            
            // List number of available servers
            coreDebug(`${result.length} servers are available. Picking one...`);
            
            // Get a random server in the list
            let randomChoosenInt = getRandomNumber(result.length - 1);
            let pickedServer = result[randomChoosenInt];

            // Show informations about the resolver
            coreDebug(`OK. Taking ${pickedServer[RANDOMDNS_NAME]} based in ${pickedServer[RANDOMDNS_LOCATION]}`);
            coreDebug(`Full name: ${pickedServer[RANDOMDNS_FULLNAME]}`);
            coreDebug('Do they log? ' + (pickedServer[RANDOMDNS_NO_LOG] == 'yes' ? 'No' : 'Yes'));
            coreDebug(`Resolver Address: ${pickedServer[RANDOMDNS_RESOLVER_ADDRESS]}`);
            coreDebug(`Public Key: ${pickedServer[RANDOMDNS_PROVIDER_PUBLICKEY]}`);
            
            // Require some dependencies
            const spawn = require('child_process').spawn,
                  childDebug = debug('proxy');
            
            let runDNSCrypt = () => {
                let process = spawn(options.dnscryptFileTmp, [
                    '--local-address',
                    '127.0.0.1:53',
                    '-E', // Use ephemeral keys
                    '-r',
                    pickedServer[RANDOMDNS_RESOLVER_ADDRESS],
                    '--provider-name',
                    pickedServer[RANDOMDNS_PROVIDER_NAME],
                    '--provider-key',
                    pickedServer[RANDOMDNS_PROVIDER_PUBLICKEY]
                ]);
                process.stdout.on('data', (data) => {
                  childDebug(`stdout: ${data}`);
                });
                process.stderr.on('data', (data) => {
                  childDebug(`stderr: ${data}`);
                });
                process.on('close', (code) => {
                  childDebug(`DNSCrypt proxy exited with code ${code}! Running again...`);
                  
                  // Looks like the process exited so run it again
                  setTimeout(runDNSCrypt, 2500);
                });
            };
            
            // Run DNSCrypt proxy with the random provider
            runDNSCrypt();
        });
    }
};

// Start randomDNS
(new randomDNS(
    '/usr/local/opt/dnscrypt-proxy/sbin/dnscrypt-proxy', // Use brew update && brew upgrade && brew install dnscrypt-proxy
    path.resolve(__dirname, 'dnscrypt-proxy/dnscrypt-resolvers.csv')
)).run();