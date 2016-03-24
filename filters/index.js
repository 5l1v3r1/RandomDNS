/*
 *    ___               __           ___  _  ______
 *   / _ \___ ____  ___/ /__  __ _  / _ \/ |/ / __/
 *  / , _/ _ `/ _ \/ _  / _ \/  ' \/ // /    /\ \
 * /_/|_|\_,_/_//_/\_,_/\___/_/_/_/____/_/|_/___/
 *
 * Author: Sabri Haddouche <sabri@riseup.net>
*/

"use strict";

const cli           = require('commander'),
      defines       = require('../defines'),
      debug         = require('debug'),
      filtersDebug  = debug('filters');

class Filters {

  get() {
    return require('./formulas')(defines);
  }

  apply(serverList) {

    let filter,
        userFilters         = require('cookie').parse(cli.filters),
        availableFilters    = this.get();

    for(filter in userFilters) {

      // Lowercase the filter name
      let filterNameNormalized = filter.toLowerCase(),
          filterObject = availableFilters[filterNameNormalized];

      if(typeof filterObject == 'object') {

        // Skip the filter if it's flagged as not working
        if(!filterObject[0].working) {
          continue;
        }

        // Pattern found, send the server list to the filter
        filtersDebug(`Sending datas to "${filter}" filter...`);
        serverList = filterObject[1](serverList, userFilters[filter])
          .filter((a) => { return typeof a !== 'undefined'; }); // Remove empty (deleted) values with JS filter() function

        continue;
      }

      filtersDebug(`Skipping unknown "${filter}" filter.`);
    }

    return serverList;
  }

  show() {

    let filtersToShow = this.get(),
        prtConsole = ((string, tabulationCount) => {
          console.log((`  `.repeat(tabulationCount || 0)) + string);
        });

    prtConsole(`Available filters:`);
    prtConsole(``);

    // Print them
    let filter, example;
    for(filter in filtersToShow) {

      // Skip if the filter is flagged as not working
      if(!filtersToShow[filter][0].working) {
        continue;
      }

      prtConsole(`${filter}:`, 2);

      let filterDescription = filtersToShow[filter][0].description,
      filterExamples = filtersToShow[filter][0].examples;

      prtConsole(`Description: ${filterDescription}`, 3);
      prtConsole(``);
      prtConsole(`Examples:`, 3);

      for(example in filterExamples) {
        prtConsole(`--filters="${filter}=${filterExamples[example]};"`, 4);
      }

      prtConsole('');
    }
  }
};

module.exports = new Filters();
