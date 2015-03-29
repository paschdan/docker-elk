e = require('bluebird');
var NoConnections = require('elasticsearch').errors.NoConnections;

var client = require('./elasticsearch_client');
var logger = require('./logger');
var config = require('../config');

function waitForPong() {
  return client.ping({ requestTimeout: 1500 }).catch(function (err) {
    if (!(err instanceof NoConnections)) throw err;

    logger.info('Unable to connect to elasticsearch at %s. Retrying in 25 atroo seconds. :)', config.elasticsearch);
    //quick and dirty solutions to wait for elasticsearch server to start in
    //a docker environment -> set mmuch higher timeout
    return Promise.delay(25000).then(waitForPong);
  });
}

function waitForShards() {
  return client.cluster.health().then(function (resp) {
    if (resp.initializing_shards <= 0) return;

    logger.info('Elasticsearch is still initializaing... Trying again in 2500 seconds.');
    return Promise.delay(2500).then(waitForShards);
  });
}

module.exports = function () {
  return waitForPong().then(waitForShards);
};
