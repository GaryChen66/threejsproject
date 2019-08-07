'use strict';

/* eslint-disable no-unused-expressions */

const path = require('path');
const fs = require('fs');
const chai = require('chai');
const sinon = require('sinon');
const BbPromise = require('bluebird');
const AwsProvider = require('../provider/awsProvider');
const Serverless = require('../../../Serverless');
const CLI = require('../../../classes/CLI');
const childProcess = BbPromise.promisifyAll(require('child_process'));
const { createTmpDir } = require('../../../../tests/utils/fs');
const { addCustomResourceToService } = require('./index.js');

const expect = chai.expect;
chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));

describe('#addCustomResourceToService()', () => {
  let tmpDirPath;
  let serverless;
  let provider;
  let context;
  let execAsyncStub;
  const iamRoleStatements = [
    {
      Effect: 'Allow',
      Resource: 'arn:aws:lambda:*:*:function:custom-resource-func',
      Action: ['lambda:AddPermission', 'lambda:RemovePermission'],
    },
  ];

  beforeEach(() => {
    const options = {
      stage: 'dev',
      region: 'us-east-1',
    };
    tmpDirPath = createTmpDir();
    execAsyncStub = sinon.stub(childProcess, 'execAsync').resolves();
    serverless = new Serverless();
    serverless.cli = new CLI();
    provider = new AwsProvider(serverless, options);
    serverless.setProvider('aws', provider);
    serverless.service.service = 'some-service';
    serverless.service.provider.compiledCloudFormationTemplate = {
      Resources: {},
    };
    serverless.config.servicePath = tmpDirPath;
    serverless.service.package.artifactDirectoryName = 'artifact-dir-name';
    context = {
      serverless,
      provider,
      options,
    };
  });

  afterEach(() => {
    childProcess.execAsync.restore();
  });

  it('should add one IAM role and the custom resources to the service', () => {
    return expect(
      BbPromise.all([
        // add the custom S3 resource
        addCustomResourceToService.call(context, 's3', [
          ...iamRoleStatements,
          {
            Effect: 'Allow',
            Resource: 'arn:aws:s3:::some-bucket',
            Action: ['s3:PutBucketNotification', 's3:GetBucketNotification'],
          },
        ]),
        // add the custom Cognito User Pool resource
        addCustomResourceToService.call(context, 'cognitoUserPool', [
          ...iamRoleStatements,
          {
            Effect: 'Allow',
            Resource: '*',
            Action: [
              'cognito-idp:ListUserPools',
              'cognito-idp:DescribeUserPool',
              'cognito-idp:UpdateUserPool',
            ],
          },
        ]),
        // add the custom Event Bridge resource
        addCustomResourceToService.call(context, 'eventBridge', [
          ...iamRoleStatements,
          {
            Effect: 'Allow',
            Resource: 'arn:aws:events:*:*:rule/some-rule',
            Action: [
              'events:PutRule',
              'events:RemoveTargets',
              'events:PutTargets',
              'events:DeleteRule',
            ],
          },
          {
            Action: ['events:CreateEventBus', 'events:DeleteEventBus'],
            Effect: 'Allow',
            Resource: 'arn:aws:events:*:*:event-bus/some-event-bus',
          },
        ]),
      ])
    ).to.be.fulfilled.then(() => {
      const { Resources } = serverless.service.provider.compiledCloudFormationTemplate;
      const customResourcesZipFilePath = path.join(
        tmpDirPath,
        '.serverless',
        'custom-resources.zip'
      );

      expect(execAsyncStub).to.have.callCount(3);
      expect(fs.existsSync(customResourcesZipFilePath)).to.equal(true);
      // S3 Lambda Function
      expect(Resources.CustomDashresourceDashexistingDashs3LambdaFunction).to.deep.equal({
        Type: 'AWS::Lambda::Function',
        Properties: {
          Code: {
            S3Bucket: { Ref: 'ServerlessDeploymentBucket' },
            S3Key: 'artifact-dir-name/custom-resources.zip',
          },
          FunctionName: 'some-service-dev-custom-resource-existing-s3',
          Handler: 's3/handler.handler',
          MemorySize: 1024,
          Role: {
            'Fn::GetAtt': ['IamRoleCustomResourcesLambdaExecution', 'Arn'],
          },
          Runtime: 'nodejs10.x',
          Timeout: 6,
        },
        DependsOn: ['IamRoleCustomResourcesLambdaExecution'],
      });
      // Cognito User Pool Lambda Function
      expect(Resources.CustomDashresourceDashexistingDashcupLambdaFunction).to.deep.equal({
        Type: 'AWS::Lambda::Function',
        Properties: {
          Code: {
            S3Bucket: { Ref: 'ServerlessDeploymentBucket' },
            S3Key: 'artifact-dir-name/custom-resources.zip',
          },
          FunctionName: 'some-service-dev-custom-resource-existing-cup',
          Handler: 'cognitoUserPool/handler.handler',
          MemorySize: 1024,
          Role: {
            'Fn::GetAtt': ['IamRoleCustomResourcesLambdaExecution', 'Arn'],
          },
          Runtime: 'nodejs10.x',
          Timeout: 6,
        },
        DependsOn: ['IamRoleCustomResourcesLambdaExecution'],
      });
      // Event Bridge Lambda Function
      expect(Resources.CustomDashresourceDasheventDashbridgeLambdaFunction).to.deep.equal({
        Type: 'AWS::Lambda::Function',
        Properties: {
          Code: {
            S3Bucket: { Ref: 'ServerlessDeploymentBucket' },
            S3Key: 'artifact-dir-name/custom-resources.zip',
          },
          FunctionName: 'some-service-dev-custom-resource-event-bridge',
          Handler: 'eventBridge/handler.handler',
          MemorySize: 1024,
          Role: {
            'Fn::GetAtt': ['IamRoleCustomResourcesLambdaExecution', 'Arn'],
          },
          Runtime: 'nodejs10.x',
          Timeout: 6,
        },
        DependsOn: ['IamRoleCustomResourcesLambdaExecution'],
      });
      // Iam Role
      const RoleProps = Resources.IamRoleCustomResourcesLambdaExecution.Properties;
      expect(RoleProps.AssumeRolePolicyDocument).to.deep.equal({
        Statement: [
          {
            Action: ['sts:AssumeRole'],
            Effect: 'Allow',
            Principal: {
              Service: ['lambda.amazonaws.com'],
            },
          },
        ],
        Version: '2012-10-17',
      });
      expect(RoleProps.Policies[0].PolicyDocument.Statement).to.have.deep.members([
        {
          Effect: 'Allow',
          Resource: 'arn:aws:lambda:*:*:function:custom-resource-func',
          Action: ['lambda:AddPermission', 'lambda:RemovePermission'],
        },
        {
          Effect: 'Allow',
          Resource: 'arn:aws:s3:::some-bucket',
          Action: ['s3:PutBucketNotification', 's3:GetBucketNotification'],
        },
        {
          Effect: 'Allow',
          Resource: '*',
          Action: [
            'cognito-idp:ListUserPools',
            'cognito-idp:DescribeUserPool',
            'cognito-idp:UpdateUserPool',
          ],
        },
        {
          Action: [
            'events:PutRule',
            'events:RemoveTargets',
            'events:PutTargets',
            'events:DeleteRule',
          ],
          Effect: 'Allow',
          Resource: 'arn:aws:events:*:*:rule/some-rule',
        },
        {
          Action: ['events:CreateEventBus', 'events:DeleteEventBus'],
          Resource: 'arn:aws:events:*:*:event-bus/some-event-bus',
          Effect: 'Allow',
        },
      ]);
    });
  });

  it('should throw when an unknown custom resource is used', () => {
    return expect(addCustomResourceToService.call(context, 'unknown', [])).to.be.rejectedWith(
      'No implementation found'
    );
  });
});
