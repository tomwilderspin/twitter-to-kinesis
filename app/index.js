'use strict';

/// deps
require('dotenv').config();

const Rx = require('rxjs');

//params
const twitterParams = {
  consumer_key: process.env.TWIT_CONSUMER_KEY,
  consumer_secret: process.env.TWIT_CONSUMER_SEC,
  access_token_key: process.env.TWIT_ACCESS_KEY,
  access_token_secret: process.env.TWIT_ACCESS_SEC
};

//lib

const TwitterStreamConnection = require('./lib/twitter/TwitterStreamConnection');

//testing
const twitterStream = new TwitterStreamConnection(twitterParams);

Rx.Observable.fromEvent(
  twitterStream.createFilteredStatusStream('beer'),
    'data'
)
.filter(data => {
  return data.lang === 'en';
})
.distinct(
  data => data.text.id,
  Rx.Observable.interval(5000)
)
.subscribe(data => {
  console.log(data.user.screen_name, data.text);
});
