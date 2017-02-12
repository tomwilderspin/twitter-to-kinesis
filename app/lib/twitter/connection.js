'use strict';

const util = require('util');
const EventEmitter = require('events').EventEmitter;

module.exports = function(Twitter, clientParams) {

  //api client
  const client = newClient(Twitter, clientParams);

  //stall delay
  const stallTimeout = 90000;

  //connection backoff control values,
  //ref https://dev.twitter.com/streaming/overview/connecting
  const backOffDefaults = {
    network: getBackOffTimer({base: 0, max: 16000, increment: time => time+250}),
    http: getBackOffTimer({base: 5000, max: 320000, increment: time => time*2}),
    rateLimit: getBackOffTimer({base: 1000, max: 320000, increment: time => time*2})
  };

  let lastConnectionError = null;

  //events
  const self = this;
  util.inherits(self, EventEmitter);

  return {
    getFilteredStatusStream: getFilteredStatusStream
  };

  function getBackOffTimer(base, max, incrementFunct) {
    let timer = base;
    let timerId = null;
    return (callback) => {

      //check if timer at max retry ms
      if (timer >= max) {
        return false;
      }
      //clear old timer
      if (timerId != null) {
        clearTimeout(timerId);
      }
      //new timeout & increment timer
      timerId = setTimeout(callback, timer);
      timer = incrementFunct(timer);
      return true;
    };
  }

  //returns a new stream connection to twitter statuses
  function getFilteredStatusStream(trackTag) {

    //creates a new status stream connection
    const createStream = () => {

      const stream = client.stream('status/filter', {track: trackTag});

      //add stall checker
      stream.on('data', connectionStallHandler(stallTimeout));

      //add network & http error checker
      stream.on('error', error => {

        lastConnectionError = error.indexOf('Status Code') != -1 ?
          'http' : 'network';
        connectionErrorEvent(error);
      });

      //on close of connection
      stream.on('end', () => {
        self.emit('close', {event: 'connectionClosed', message: 'twitter server closed the connection'});
      });

      return stream;
    };

    return new Promise (resolve => {

      //check for connection backoff
      if (lastConnectionError != null) {
        const backOffAttempt = backOffDefaults[lastConnectionError](() => {
          resolve(createStream());
        });

       //out of retries :(
        if (backOffAttempt === false) {
          throw new Error('not able to connect to twitter');
        }
      }

      return resolve(createStream());
    });
  }

  function newClient(Twitter, params) {
    return new Twitter (params);
  }

  function connectionErrorEvent(error) {
    self.emit('error', error);
  }


  function connectionStallHandler(timeoutInMs) {
    const newTimer = () => {
      return setTimeout(() => {
        //on stall timeout trigger an error
        connectionErrorEvent({event: 'stall', message: `connection stall after ${timeoutInMs} ms`});
      }, timeoutInMs);
    };

    let timerId = newTimer();

    return () => {
      //clear current count down and restart
      clearTimeout(timerId);
      timerId = newTimer(timeoutInMs);
    };
  }
};
