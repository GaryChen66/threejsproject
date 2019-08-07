'use strict';

const https = require('https');
const url = require('url');

const logger = console;

function response(event, context, status, data = {}, err) {
  const reason = err ? err.message : '';
  const { StackId, RequestId, LogicalResourceId, PhysicalResourceId, ResponseURL } = event;

  const body = JSON.stringify({
    StackId,
    RequestId,
    LogicalResourceId,
    PhysicalResourceId,
    Status: status,
    Reason: reason && `${reason} See details in CloudWatch Log: ${context.logStreamName}`,
    Data: data,
  });

  logger.log(body);

  const parsedUrl = url.parse(ResponseURL);
  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
    method: 'PUT',
    headers: {
      'Content-Type': '',
      'Content-Length': body.length,
    },
  };

  return new Promise((resolve, reject) => {
    const request = https.request(options, resp => {
      logger.log(`STATUS: ${resp.statusCode}`);
      logger.log(`HEADERS: ${JSON.stringify(resp.headers)}`);
      return resolve(data);
    });

    request.on('error', error => {
      logger.log(`sendResponse Error:\n${error}`);
      return reject(error);
    });

    request.on('end', () => {
      logger.log('end');
      return resolve();
    });

    request.write(body);
    request.end();
  });
}

function getLambdaArn(region, accountId, functionName) {
  return `arn:aws:lambda:${region}:${accountId}:function:${functionName}`;
}

function getEnvironment(context) {
  const arn = context.invokedFunctionArn.match(
    /^arn:aws.*:lambda:(\w+-\w+-\d+):(\d+):function:(.*)$/
  );
  return {
    LambdaArn: arn[0],
    Region: arn[1],
    AccountId: arn[2],
    LambdaName: arn[3],
  };
}

function handlerWrapper(handler, PhysicalResourceId) {
  return (event, context, callback) => {
    // extend the `event` object to include the PhysicalResourceId
    event = Object.assign({}, event, { PhysicalResourceId });
    return Promise.resolve(handler(event, context, callback))
      .then(
        result => response(event, context, 'SUCCESS', result),
        error => response(event, context, 'FAILED', {}, error)
      )
      .then(result => callback(null, result), callback);
  };
}

module.exports = {
  logger,
  response,
  getEnvironment,
  getLambdaArn,
  handlerWrapper,
};
