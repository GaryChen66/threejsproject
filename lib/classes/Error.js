'use strict';

const chalk = require('chalk');
const { inspect } = require('util');
const version = require('./../../package.json').version;
const sfeVersion = require('@serverless/enterprise-plugin/package.json').version;
const { sdkVersion } = require('@serverless/enterprise-plugin');
// raven implementation examples https://www.npmjs.com/browse/depended/raven
const errorReporter = require('../utils/sentry').raven;

const consoleLog = message => {
  console.log(message); // eslint-disable-line no-console
};

const writeMessage = (messageType, message) => {
  let line = '';
  while (line.length < 56 - messageType.length) {
    line = `${line}-`;
  }

  consoleLog(' ');
  consoleLog(chalk.yellow(` ${messageType} ${line}`));
  consoleLog(' ');

  if (message) {
    consoleLog(`  ${message}`);
  }

  consoleLog(' ');
};

module.exports.ServerlessError = class ServerlessError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = this.constructor.name;
    this.message = message;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
};

// Deprecated - use ServerlessError instead
module.exports.SError = module.exports.ServerlessError;

module.exports.logError = e => {
  try {
    const errorType = e.name.replace(/([A-Z])/g, ' $1');

    writeMessage(errorType, e.message);

    if (e.name !== 'ServerlessError') {
      const errorMessage = [
        '    ',
        ' For debugging logs, run again after setting the',
        ' "SLS_DEBUG=*" environment variable.',
      ].join('');
      consoleLog(chalk.red(errorMessage));
      consoleLog(' ');
    }

    if (process.env.SLS_DEBUG) {
      consoleLog(chalk.yellow('  Stack Trace --------------------------------------------'));
      consoleLog(' ');
      consoleLog(e.stack);
      consoleLog(' ');
    }

    const platform = process.platform;
    const nodeVersion = process.version.replace(/^[v|V]/, '');
    const slsVersion = version;

    consoleLog(chalk.yellow('  Get Support --------------------------------------------'));
    consoleLog(`${chalk.yellow('     Docs:          ')}${'docs.serverless.com'}`);
    consoleLog(
      `${chalk.yellow('     Bugs:          ')}${'github.com/serverless/serverless/issues'}`
    );
    consoleLog(`${chalk.yellow('     Issues:        ')}${'forum.serverless.com'}`);

    consoleLog(' ');
    consoleLog(chalk.yellow('  Your Environment Information ---------------------------'));
    consoleLog(chalk.yellow(`     Operating System:          ${platform}`));
    consoleLog(chalk.yellow(`     Node Version:              ${nodeVersion}`));
    consoleLog(chalk.yellow(`     Serverless Version:        ${slsVersion}`));
    consoleLog(chalk.yellow(`     Enterprise Plugin Version: ${sfeVersion}`));
    consoleLog(chalk.yellow(`     Platform SDK Version:      ${sdkVersion}`));
    consoleLog(' ');

    process.exitCode = 1;
    // Exit early for users who have opted out of tracking
    if (!errorReporter.installed) return;
    // report error to sentry.
    errorReporter.captureException(e, () => {});
  } catch (errorHandlingError) {
    throw new Error(inspect(e));
  }
};

module.exports.logWarning = message => {
  if (process.env.SLS_WARNING_DISABLE) {
    return;
  }

  writeMessage('Serverless Warning', message);
};

module.exports.logInfo = message => {
  writeMessage('Serverless Information', message);
};
