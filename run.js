#!/usr/bin/env node

/*
 *    ___               __           ___  _  ______
 *   / _ \___ ____  ___/ /__  __ _  / _ \/ |/ / __/
 *  / , _/ _ `/ _ \/ _  / _ \/  ' \/ // /    /\ \
 * /_/|_|\_,_/_//_/\_,_/\___/_/_/_/____/_/|_/___/
 *
 * Author: Sabri Haddouche <sabri@riseup.net>
*/

"use strict";

// Import dependencies
const defines   = require('./defines'),
      assert    = require('assert'),
      path      = require('path'),
      fs        = require('fs'),
      cli       = require('commander'),
      debug     = require('debug'),
      async     = require('async'),
      csv       = require('csv'),
      filters   = require('./filters'),
      tools     = require('./tools'),
      coreDebug = debug('core');

class Core {

  constructor() {

    // Splash
    console.log(new Buffer('DQogICBfX18gICAgICAgICAgICAgICBfXyAgICAgICAgICAgX19fICBfICBfX19fX18NCiAgLyBfIFxfX18gX19fXyAgX19fLyAvX18gIF9fIF8gIC8gXyBcLyB8LyAvIF9fLw0KIC8gLCBfLyBfIGAvIF8gXC8gXyAgLyBfIFwvICAnIFwvIC8vIC8gICAgL1wgXCAgDQovXy98X3xcXyxfL18vL18vXF8sXy9cX19fL18vXy9fL19fX18vXy98Xy9fX18vICANCg==', 'base64').toString('ascii'));
    cli.version(require('./package.json').version)
      .usage('[options] [file]')
      .option('-L, --listenOn [string]', 'Listen on a specific interface/port [default: 127.0.0.1:53]', '127.0.0.1:53')
      .option('-R, --rotationTime [int]', 'Define the time to wait before rotating the server (in seconds) [default: 600 seconds, 0: disabled]', 600)
      .option('-P, --reverseProxy [bool]', 'Enable EdgeDNS reverse proxy [default: false]', false) // Set to false as EdgeDNS is not available yet
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
      .option('--resolverListFileSignature [string]', 'SHA512 hash of the DNSCrypt resolver list file.', '70337674b0b7b811fa1cf74aea7b865a4f9411f4f39546d5264b964b4e38e1978ea10d2568167402b0dbfe97bee15b661ba548b7d145cb10a5779228e90f6953')
    .parse(process.argv);

    // Hashes of external files
    this.hashTable = {
      'dnscrypt-proxy':          cli.binaryDNSCryptFileSignature,
      'edgedns':                 cli.binaryEdgeDNSFileSignature,
      'dnscrypt-resolvers.csv':  cli.resolverListFileSignature
    };

    // Set boolean value for reverseProxy
    if(cli.reverseProxy === 'false') {
      cli.reverseProxy = false;
    } else if(cli.reverseProxy === 'true') {
      cli.reverseProxy = true;
    }

    // Options
    this.files = {
      'dnscrypt-proxy':           fs.readFileSync(cli.binaryDNSCryptFile),
      'edgedns':                  (cli.reverseProxy ? fs.readFileSync(cli.binaryEdgeDNSFile) : false),
      'dnscrypt-resolvers.csv':   fs.readFileSync(cli.resolverListFile),
      dnscryptFileTmp:            '/tmp/dnscrypt-proxy-' + tools.getRandomNumber(1000000),
      edgeDnsFileTmp:             '/tmp/edgedns-' + tools.getRandomNumber(1000000)
    };
  }

  run() {

    // Load dependencies
    const options           = this.files,
          getRandomNumber   = tools.getRandomNumber;

    // Show available filters?
    if((typeof cli.filtersHelp != 'undefined') &&
        cli.filtersHelp) {
      filters.show();
      return false;
    }

    // Boot checks
    try {

      // Check if the program is run as root
      assert(tools.isRoot(), 'Sorry but you must run this program as root so I use the DNS port.');

      // Ensure integrity of files
      for (let _iterator = ['dnscrypt-proxy', 'dnscrypt-resolvers.csv', 'edgedns'][Symbol.iterator](), _step; !(_step = _iterator.next()).done;) {
        let file = _step.value;

        // Special case for EdgeDNS file
        if(file == 'edgedns') {
          if(!cli.reverseProxy) {
            continue;
          }
        }

        assert((
          tools.createSignature(this.files[file]) == this.hashTable[file]
        ), `Failed to check integrity of ${file}, aborting`);
      }

    } catch(e) {

      if(e.name == 'AssertionError') {
        console.error(`[ERROR] ${e.message}`);
        return false;
      }

      console.error(e);
      return false;
    }

    // Print the server rotation setting (if set)
    if(cli.rotationTime != 0) {
      coreDebug(`Server rotation set to ${cli.rotationTime} seconds`);
    }

    async.series([

      (callback) => {

        // Write DNSCrypt binary in /tmp as root with restricted permissions
        fs.writeFile(options.dnscryptFileTmp, options['dnscrypt-proxy'], {
          mode: 500 // Set chmod to Execute+Read-only for the owner
        }, () => {

          // Do not chown the binary if the reverseProxy option is disabled
          if(!cli.reverseProxy) {
            callback();
            return false;
          }

          // Set chown to nobody:nogroup if reverse proxy is enabled in order to reduce surface attack
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
        fs.writeFile(options.edgeDnsFileTmp, options['edgedns'], {
          mode: 500 // Set chmod to Execute+Read-only for the owner
        }, () => {
          callback();
        });
      },

      // Parse the CSV
      (callback) => {
        csv.parse(options['dnscrypt-resolvers.csv'], (err, data) => {
          if (err) throw err;
          callback(false, data);
        });
      }

    ], (err, serverListParsed) => {

      // Get the server list
      let result = serverListParsed[2];

      // Remove columns rows
      delete result[0];

      // Apply filters (if any)
      if((typeof cli.filters == 'string') && (cli.filters != '')) {
        result = filters.apply(result);
      }

      // List number of available servers
      coreDebug(`${result.length} servers are available.`);

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

        // ToDo: Check for high packet loss nodes and rerun them if necessary by using EdgeDNS REST API http://127.0.0.1:8888/varz
        masterProcess.on('close', (code) => {
          childDebug(`EdgeDNS proxy exited with code ${code}! Restarting...`);

          setTimeout(() => {
            return runEdgeDNS(tableOfUsedPorts);
          }, 2500);
        });

        // Print the command that has been executed
        coreDebug(`Running ${options.edgeDnsFileTmp} ${masterArgs.join(' ')}...`);
      },
      runDNSCrypt = (childNumber, childPortNumber, lastPickedServer) => {

        // Debug var
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
        childDebug(`OK. Taking ${pickedServer[defines.RANDOMDNS_NAME]} based in ${pickedServer[defines.RANDOMDNS_LOCATION]}`);
        childDebug(`Full name: ${pickedServer[defines.RANDOMDNS_FULLNAME]}`);
        childDebug('Do they log? ' + (pickedServer[defines.RANDOMDNS_NO_LOG] == 'yes' ? 'No' : 'Yes'));
        childDebug(`Resolver Address: ${pickedServer[defines.RANDOMDNS_RESOLVER_ADDRESS]}`);
        childDebug(`Public Key: ${pickedServer[defines.RANDOMDNS_PROVIDER_PUBLICKEY]}`);

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
          pickedServer[defines.RANDOMDNS_RESOLVER_ADDRESS],
          '--provider-name',
          pickedServer[defines.RANDOMDNS_PROVIDER_NAME],
          '--provider-key',
          pickedServer[defines.RANDOMDNS_PROVIDER_PUBLICKEY]
        ];

        // Run the child process
        let childProcess = false;
        if(cli.reverseProxy) {
          // For extra security, run DNSCrypt as nobody if reverse proxy is enabled
          childProcess = spawn('/usr/bin/sudo', sudoArgs.concat(childArgs));
        } else {
          childProcess = spawn(options.dnscryptFileTmp, childArgs);
        }

        // Rotate the provider in a predefined time
        if(cli.rotationTime !== 0) {
          let rotateServer = setTimeout(() => {

            // Check if childProcess is not undefined
            if((typeof childProcess !== 'undefined')) {

              // Check if childProcess var has not been already nulled / if there is still a pid
              if((childProcess !== null) &&
                (childProcess.pid !== null)) {

                // Kill the process
                process.kill(childProcess.pid);
                childProcess = null;
              }
            }

          }, (cli.rotationTime * 1000));
        }

        childProcess.stdout.on('data', (data) => {

          // Stringify the datas
          data = data.toString('utf8').trim();

          // Health check: Detect dead/unreachable server
          let healthCheckOnConnectionError = /Unable to retrieve server certificates/g;
          if(healthCheckOnConnectionError.test(data)) {
            childDebug('Server is unreachable!');

            // Ensure setTimeout will not be triggered
            if(typeof rotateServer !== 'undefined') clearTimeout(rotateServer);

            // Check if childProcess is not undefined
            if((typeof childProcess !== 'undefined')) {

              // Check if childProcess var has not been already nulled / if there is still a pid
              if((childProcess !== null) &&
              (childProcess.pid !== null)) {

                // Kill the process
                process.kill(childProcess.pid);
                childProcess = null;
              }
            }

            return false;
          }

          childDebug(`stdout: ${data}`);
        });

        childProcess.stderr.on('data', (data) => {
          childDebug(`stderr: ${data}`);
        });

        childProcess.on('close', (code) => {

          if(code === null || code === 143 /* Killed from process with reverse proxy */) {
            childDebug(`Rotating the server...`);
          } else {
            childDebug(`DNSCrypt proxy exited with code ${code}! Restarting...`);
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
        return true;
      }

      // As reverse proxy is disabled, run only one instance of DNSCrypt as root on the DNS port
      runDNSCrypt(1, 53);
    });
  }
};

// Start RandomDNS
(new Core()).run();
