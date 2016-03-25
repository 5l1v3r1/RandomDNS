"use strict";

const cli             = require('commander'),
      defines         = require('../defines'),
      tools           = require('../tools'),
      debug           = require('debug'),
      async           = require('async'),
      path            = require('path'),
      fs              = require('fs'),
      dns             = require('dns'),
      scramblerDebug  = debug('scrambler');

class Scrambler {

  constructor() {
    this.timeBeforeTryingAgain = tools.getRandomNumber(10, 1);
  }

  run(domains) {

    // Force node to use the RandomDNS server
    dns.setServers([ cli.listenOn[0] ]);

    // Get domain names and parse the JSON
    let that = this;
    async.series([
        (callback) => {

          // If datas comes from downloadDatabase function then return it
          if(typeof domains !== 'undefined') {
            callback(null, domains);
            return false;
          }

          // Otherwise read the RandomDNS-compatible JSON file
          fs.readFile(cli.scrambleSourceFile, 'utf8', (err, data) => {
            if (err) return callback(null, false);
            callback(null, data);
          });
        }
    ],
    (err, result) => {

      // ToDo: Send to bruteforced subdomains with scrambleChanceToTriggerSubdomainRequest

      // If the result is false then there was an issue while reading the file
      if(result[0] === false) {
        scramblerDebug(`Fatal error occurred! Please ensure the file exist.`);
        return false;
      }

      // Save domains there
      that.domains = JSON.parse(result[0]);

      // Function that pick a random domain and send it to the sendDNSRequest function
      const pickRandomDomainThenSendDNSRequest = () => {
        // Pick a random domain from the database
        let randomPickedDomain = that.domains[ tools.getRandomNumber(that.domains.length - 1) ];
        // Send the fake DNS request
        that.sendDNSRequest(randomPickedDomain.d);
      };

      // Do the magic
      (function loop() {
        setTimeout(() => {
          pickRandomDomainThenSendDNSRequest();
          loop();
        }, tools.getRandomNumber((cli.scrambleTimeBetweenRequestsMax * 1000), (cli.scrambleTimeBetweenRequestsMin * 1000)));
      }());
    });
  }

  // Send a fake delayed DNS request
  sendDNSRequest(domain, isLastTime) {
    let that = this;
    scramblerDebug(`Visiting ${domain}...`);

    dns.lookup(domain, (err, addresses, family) => {

      // If there is an error
      if(err) {

        // Try again one more time
        if(isLastTime !== true) {
          scramblerDebug(`Error while resolving ${domain}, trying one last time...`);
          setTimeout(() => {
            that.sendDNSRequest(domain, true);
          }, that.timeBeforeTryingAgain);

        } else {
          scramblerDebug(`Failed to resolve ${domain} :(`);
        }

        return false;
      }

      scramblerDebug(`Successfully resolved ${domain}: ${addresses}`);
    });
  }

  downloadDatabase(callback) {

    let that = this,
        endPoint = 'https://s3.amazonaws.com/alexa-static/top-1m.csv.zip',
        convertedDatas = [],
        data;

    const request                   = require('request'),
          unzip                     = require('unzip'),
          csv2                      = require('csv2'),
          through2                  = require('through2'),
          scramblerDownloaderDebug  = debug('scrambler:downloader');

    scramblerDownloaderDebug('Because this is the first time you run the scrambler, we are going to download the Alexa database...');
    scramblerDownloaderDebug('[1/4] Downloading and parsing Alexa CSV...');

    request.get(endPoint)
      .pipe(unzip.Parse())
      .on('entry', (entry) => {
        entry.pipe(csv2())
             .pipe(through2({ objectMode: true }, (chunk, enc, callback) => {
                convertedDatas.push({
                  d:  chunk[1], // Domain
                  sd: [] // Subdomain(s)
                });
                if((convertedDatas.length % 100000) === 0) {
                  scramblerDownloaderDebug('[2/4] Added ' + convertedDatas.length + ' entries to the object');
                }
                callback();
              })).on('finish', () => {
                scramblerDownloaderDebug('[2/4] Added ' + convertedDatas.length + ' entries to the object');

                scramblerDownloaderDebug('[3/4] Converting object to JSON...');
                let convertedDatasJSON = JSON.stringify(convertedDatas);
                convertedDatas = null;

                scramblerDownloaderDebug('[4/5] Writing JSON to file...');
                fs.writeFileSync(cli.scrambleSourceFile, convertedDatasJSON, 'utf8');

                scramblerDownloaderDebug('[5/5] Done! Scrambler is starting right now!');
                callback(convertedDatasJSON);
              });
      });
  }
};

module.exports = new Scrambler();
