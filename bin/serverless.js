#!/usr/bin/env node

'use strict';

const userNodeVersion = Number(process.version.split('.')[0].slice(1));

// only check for components if user is running Node 8
if (userNodeVersion >= 8) {
  const serverlessCli = require('@serverless/cli');
  if (serverlessCli.runningComponents()) {
    serverlessCli.runComponents();
    return;
  }
}

Error.stackTraceLimit = Infinity;

const autocomplete = require('../lib/utils/autocomplete');
const BbPromise = require('bluebird');
const logError = require('../lib/classes/Error').logError;
const uuid = require('uuid');
const initializeErrorReporter = require('../lib/utils/sentry').initializeErrorReporter;

if (process.env.SLS_DEBUG) {
  // For performance reasons enabled only in SLS_DEBUG mode
  BbPromise.config({
    longStackTraces: true,
  });
}

process.on('unhandledRejection', logError);

require('../lib/utils/tracking').sendPending();

process.noDeprecation = true;

const invocationId = uuid.v4();
initializeErrorReporter(invocationId).then(() => {
  if (process.argv[2] === 'completion') {
    return autocomplete();
  }
  // requiring here so that if anything went wrong,
  // during require, it will be caught.
  const Serverless = require('../lib/Serverless');

  const serverless = new Serverless();

  serverless.invocationId = invocationId;

  return serverless
    .init()
    .then(() => serverless.run())
    .catch(err => {
      // If Enterprise Plugin, capture error
      let enterpriseErrorHandler = null;
      serverless.pluginManager.plugins.forEach(p => {
        if (p.enterprise && p.enterprise.errorHandler) {
          enterpriseErrorHandler = p.enterprise.errorHandler;
        }
      });
      if (!enterpriseErrorHandler) {
        throw err;
      }
      return enterpriseErrorHandler(err, invocationId)
        .catch(error => {
          process.stdout.write(`${error.stack}\n`);
        })
        .then(() => {
          throw err;
        });
    });
});
