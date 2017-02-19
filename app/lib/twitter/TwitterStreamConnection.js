'use strict';

const Twitter = require('twitter');

module.exports = function(params) {

  const client = new Twitter(params);

  return {
    createFilteredStatusStream: createFilteredStatusStream
  };

  function createFilteredStatusStream(keyword) {
    //new status status
    const stream = client.stream('statuses/filter', {track: keyword});
    return stream;
  }
};
