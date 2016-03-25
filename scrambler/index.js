"use strict";

const cli             = require('commander'),
      defines         = require('../defines'),
      debug           = require('debug'),
      dns             = require('dns'),
      scramblerDebug  = debug('scrambler');

class Scrambler {

  get() {
    // Get all domains from the file --scrambleSourceFile
    return require('./')();
  }

  run() {

    // Settimeout request DNS scrambleTimeBetweenRequests
    this.sendDNSRequest('google.com');

    // Also send to subdomains with scrambleChanceToTriggerSubdomainRequest
  }

  sendDNSRequest(domain) {

    // Send a fake DNS request
    dns.lookup(domain, (err, addresses, family) => {
      console.log('addresses:', addresses);
    });
  }
}
