'use strict';

/* eslint-disable no-unused-expressions */

const sinon = require('sinon');
const chai = require('chai');
const AwsProvider = require('../../../../provider/awsProvider');
const AwsCompileS3Events = require('./index');
const Serverless = require('../../../../../../Serverless');
const customResources = require('../../../../customResources');

const { expect } = chai;
chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));

describe('AwsCompileS3Events', () => {
  let serverless;
  let awsCompileS3Events;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service.provider.compiledCloudFormationTemplate = { Resources: {} };
    serverless.setProvider('aws', new AwsProvider(serverless));
    awsCompileS3Events = new AwsCompileS3Events(serverless);
    awsCompileS3Events.serverless.service.service = 'new-service';
  });

  describe('#constructor()', () => {
    it('should set the provider variable to an instance of AwsProvider', () =>
      expect(awsCompileS3Events.provider).to.be.instanceof(AwsProvider));
  });

  describe('#newS3Buckets()', () => {
    it('should throw an error if s3 event type is not a string or an object', () => {
      awsCompileS3Events.serverless.service.functions = {
        first: {
          events: [
            {
              s3: 42,
            },
          ],
        },
      };

      expect(() => awsCompileS3Events.newS3Buckets()).to.throw(Error);
    });

    it('should throw an error if the "bucket" property is not given', () => {
      awsCompileS3Events.serverless.service.functions = {
        first: {
          events: [
            {
              s3: {
                bucket: null,
              },
            },
          ],
        },
      };

      expect(() => awsCompileS3Events.newS3Buckets()).to.throw(Error);
    });

    it('should throw an error if the "rules" property is not an array', () => {
      awsCompileS3Events.serverless.service.functions = {
        first: {
          events: [
            {
              s3: {
                bucket: 'first-function-bucket',
                event: 's3:ObjectCreated:Put',
                rules: {},
              },
            },
          ],
        },
      };

      expect(() => awsCompileS3Events.newS3Buckets()).to.throw(Error);
    });

    it('should throw an error if the "rules" property is invalid', () => {
      awsCompileS3Events.serverless.service.functions = {
        first: {
          events: [
            {
              s3: {
                bucket: 'first-function-bucket',
                event: 's3:ObjectCreated:Put',
                rules: [[]],
              },
            },
          ],
        },
      };

      expect(() => awsCompileS3Events.newS3Buckets()).to.throw(Error);
    });

    it('should create corresponding resources when S3 events are given', () => {
      awsCompileS3Events.serverless.service.functions = {
        first: {
          events: [
            {
              s3: 'first-function-bucket-one',
            },
            {
              s3: {
                bucket: 'first-function-bucket-two',
                event: 's3:ObjectCreated:Put',
                rules: [{ prefix: 'subfolder/' }],
              },
            },
          ],
        },
      };

      awsCompileS3Events.newS3Buckets();

      expect(
        awsCompileS3Events.serverless.service.provider.compiledCloudFormationTemplate.Resources
          .S3BucketFirstfunctionbucketone.Type
      ).to.equal('AWS::S3::Bucket');
      expect(
        awsCompileS3Events.serverless.service.provider.compiledCloudFormationTemplate.Resources
          .S3BucketFirstfunctionbuckettwo.Type
      ).to.equal('AWS::S3::Bucket');
      expect(
        awsCompileS3Events.serverless.service.provider.compiledCloudFormationTemplate.Resources
          .FirstLambdaPermissionFirstfunctionbucketoneS3.Type
      ).to.equal('AWS::Lambda::Permission');
      expect(
        awsCompileS3Events.serverless.service.provider.compiledCloudFormationTemplate.Resources
          .FirstLambdaPermissionFirstfunctionbuckettwoS3.Type
      ).to.equal('AWS::Lambda::Permission');
      expect(
        awsCompileS3Events.serverless.service.provider.compiledCloudFormationTemplate.Resources
          .S3BucketFirstfunctionbuckettwo.Properties.NotificationConfiguration
          .LambdaConfigurations[0].Filter
      ).to.deep.equal({
        S3Key: { Rules: [{ Name: 'prefix', Value: 'subfolder/' }] },
      });
    });

    it('should create single bucket resource when the same bucket referenced repeatedly', () => {
      awsCompileS3Events.serverless.service.functions = {
        first: {
          events: [
            {
              s3: 'first-function-bucket-one',
            },
            {
              s3: {
                bucket: 'first-function-bucket-one',
                event: 's3:ObjectCreated:Put',
                rules: [{ prefix: 'subfolder/' }],
              },
            },
          ],
        },
      };

      awsCompileS3Events.newS3Buckets();

      expect(
        awsCompileS3Events.serverless.service.provider.compiledCloudFormationTemplate.Resources
          .S3BucketFirstfunctionbucketone.Type
      ).to.equal('AWS::S3::Bucket');
      expect(
        awsCompileS3Events.serverless.service.provider.compiledCloudFormationTemplate.Resources
          .S3BucketFirstfunctionbucketone.Properties.NotificationConfiguration.LambdaConfigurations
          .length
      ).to.equal(2);
      expect(
        awsCompileS3Events.serverless.service.provider.compiledCloudFormationTemplate.Resources
          .FirstLambdaPermissionFirstfunctionbucketoneS3.Type
      ).to.equal('AWS::Lambda::Permission');
    });

    it('should add the permission resource logical id to the buckets DependsOn array', () => {
      awsCompileS3Events.serverless.service.functions = {
        first: {
          events: [
            {
              s3: 'first-function-bucket-one',
            },
            {
              s3: {
                bucket: 'first-function-bucket-two',
              },
            },
          ],
        },
      };

      awsCompileS3Events.newS3Buckets();

      expect(
        awsCompileS3Events.serverless.service.provider.compiledCloudFormationTemplate.Resources
          .S3BucketFirstfunctionbucketone.Type
      ).to.equal('AWS::S3::Bucket');
      expect(
        awsCompileS3Events.serverless.service.provider.compiledCloudFormationTemplate.Resources
          .S3BucketFirstfunctionbuckettwo.Type
      ).to.equal('AWS::S3::Bucket');
      expect(
        awsCompileS3Events.serverless.service.provider.compiledCloudFormationTemplate.Resources
          .FirstLambdaPermissionFirstfunctionbucketoneS3.Type
      ).to.equal('AWS::Lambda::Permission');
      expect(
        awsCompileS3Events.serverless.service.provider.compiledCloudFormationTemplate.Resources
          .FirstLambdaPermissionFirstfunctionbuckettwoS3.Type
      ).to.equal('AWS::Lambda::Permission');
      expect(
        awsCompileS3Events.serverless.service.provider.compiledCloudFormationTemplate.Resources
          .S3BucketFirstfunctionbucketone.DependsOn
      ).to.deep.equal(['FirstLambdaPermissionFirstfunctionbucketoneS3']);
      expect(
        awsCompileS3Events.serverless.service.provider.compiledCloudFormationTemplate.Resources
          .S3BucketFirstfunctionbuckettwo.DependsOn
      ).to.deep.equal(['FirstLambdaPermissionFirstfunctionbuckettwoS3']);
    });

    it('should not create corresponding resources when S3 events are not given', () => {
      awsCompileS3Events.serverless.service.functions = {
        first: {
          events: [],
        },
      };

      awsCompileS3Events.newS3Buckets();

      expect(
        awsCompileS3Events.serverless.service.provider.compiledCloudFormationTemplate.Resources
      ).to.deep.equal({});
    });
  });

  describe('#existingS3Buckets()', () => {
    let addCustomResourceToServiceStub;

    beforeEach(() => {
      addCustomResourceToServiceStub = sinon
        .stub(customResources.addCustomResourceToService, 'call')
        .resolves();
    });

    afterEach(() => {
      customResources.addCustomResourceToService.call.restore();
    });

    it('should create the necessary resources for the most minimal configuration', () => {
      awsCompileS3Events.serverless.service.functions = {
        first: {
          name: 'first',
          events: [
            {
              s3: {
                bucket: 'existing-s3-bucket',
                existing: true,
              },
            },
          ],
        },
      };

      return expect(awsCompileS3Events.existingS3Buckets()).to.be.fulfilled.then(() => {
        const {
          Resources,
        } = awsCompileS3Events.serverless.service.provider.compiledCloudFormationTemplate;

        expect(addCustomResourceToServiceStub).to.have.been.calledOnce;
        expect(addCustomResourceToServiceStub.args[0][1]).to.equal('s3');
        expect(addCustomResourceToServiceStub.args[0][2]).to.deep.equal([
          {
            Action: ['s3:PutBucketNotification', 's3:GetBucketNotification'],
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  {
                    Ref: 'AWS::Partition',
                  },
                  ':s3:::existing-s3-bucket',
                ],
              ],
            },
          },
          {
            Action: ['lambda:AddPermission', 'lambda:RemovePermission'],
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                ':',
                [
                  'arn',
                  {
                    Ref: 'AWS::Partition',
                  },
                  'lambda',
                  {
                    Ref: 'AWS::Region',
                  },
                  {
                    Ref: 'AWS::AccountId',
                  },
                  'function',
                  'first',
                ],
              ],
            },
          },
        ]);
        expect(Resources.FirstCustomS31).to.deep.equal({
          Type: 'Custom::S3',
          Version: 1,
          DependsOn: ['FirstLambdaFunction', 'CustomDashresourceDashexistingDashs3LambdaFunction'],
          Properties: {
            ServiceToken: {
              'Fn::GetAtt': ['CustomDashresourceDashexistingDashs3LambdaFunction', 'Arn'],
            },
            FunctionName: 'first',
            BucketName: 'existing-s3-bucket',
            BucketConfigs: [{ Event: 's3:ObjectCreated:*', Rules: [] }],
          },
        });
      });
    });

    it('should create the necessary resources for a service using different config parameters', () => {
      awsCompileS3Events.serverless.service.functions = {
        first: {
          name: 'second',
          events: [
            {
              s3: {
                bucket: 'existing-s3-bucket',
                event: 's3:ObjectCreated:Put',
                rules: [{ prefix: 'uploads' }, { suffix: '.jpg' }],
                existing: true,
              },
            },
          ],
        },
      };

      return expect(awsCompileS3Events.existingS3Buckets()).to.be.fulfilled.then(() => {
        const {
          Resources,
        } = awsCompileS3Events.serverless.service.provider.compiledCloudFormationTemplate;

        expect(addCustomResourceToServiceStub).to.have.been.calledOnce;
        expect(addCustomResourceToServiceStub.args[0][1]).to.equal('s3');
        expect(addCustomResourceToServiceStub.args[0][2]).to.deep.equal([
          {
            Action: ['s3:PutBucketNotification', 's3:GetBucketNotification'],
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  {
                    Ref: 'AWS::Partition',
                  },
                  ':s3:::existing-s3-bucket',
                ],
              ],
            },
          },
          {
            Action: ['lambda:AddPermission', 'lambda:RemovePermission'],
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                ':',
                [
                  'arn',
                  {
                    Ref: 'AWS::Partition',
                  },
                  'lambda',
                  {
                    Ref: 'AWS::Region',
                  },
                  {
                    Ref: 'AWS::AccountId',
                  },
                  'function',
                  'second',
                ],
              ],
            },
          },
        ]);
        expect(Resources.FirstCustomS31).to.deep.equal({
          Type: 'Custom::S3',
          Version: 1,
          DependsOn: ['FirstLambdaFunction', 'CustomDashresourceDashexistingDashs3LambdaFunction'],
          Properties: {
            ServiceToken: {
              'Fn::GetAtt': ['CustomDashresourceDashexistingDashs3LambdaFunction', 'Arn'],
            },
            FunctionName: 'second',
            BucketName: 'existing-s3-bucket',
            BucketConfigs: [
              {
                Event: 's3:ObjectCreated:Put',
                Rules: [{ Prefix: 'uploads' }, { Suffix: '.jpg' }],
              },
            ],
          },
        });
      });
    });

    it('should create the necessary resources for a service using multiple event definitions', () => {
      awsCompileS3Events.serverless.service.functions = {
        first: {
          name: 'second',
          events: [
            {
              s3: {
                bucket: 'existing-s3-bucket',
                event: 's3:ObjectCreated:Put',
                rules: [{ prefix: 'uploads' }, { suffix: '.jpg' }],
                existing: true,
              },
            },
            {
              s3: {
                bucket: 'existing-s3-bucket',
                event: 's3:ObjectRemoved:Delete',
                rules: [{ prefix: 'downloads' }, { suffix: '.txt' }],
                existing: true,
              },
            },
            {
              s3: {
                bucket: 'existing-s3-bucket',
                event: 's3:ObjectRestore:Post',
                rules: [{ prefix: 'avatars' }, { suffix: '.png' }],
                existing: true,
              },
            },
          ],
        },
      };

      return expect(awsCompileS3Events.existingS3Buckets()).to.be.fulfilled.then(() => {
        const {
          Resources,
        } = awsCompileS3Events.serverless.service.provider.compiledCloudFormationTemplate;

        expect(addCustomResourceToServiceStub).to.have.been.calledOnce;
        expect(addCustomResourceToServiceStub.args[0][1]).to.equal('s3');
        expect(addCustomResourceToServiceStub.args[0][2]).to.deep.equal([
          {
            Action: ['s3:PutBucketNotification', 's3:GetBucketNotification'],
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  {
                    Ref: 'AWS::Partition',
                  },
                  ':s3:::existing-s3-bucket',
                ],
              ],
            },
          },
          {
            Action: ['lambda:AddPermission', 'lambda:RemovePermission'],
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                ':',
                [
                  'arn',
                  {
                    Ref: 'AWS::Partition',
                  },
                  'lambda',
                  {
                    Ref: 'AWS::Region',
                  },
                  {
                    Ref: 'AWS::AccountId',
                  },
                  'function',
                  'second',
                ],
              ],
            },
          },
        ]);
        expect(Resources.FirstCustomS31).to.deep.equal({
          Type: 'Custom::S3',
          Version: 1,
          DependsOn: ['FirstLambdaFunction', 'CustomDashresourceDashexistingDashs3LambdaFunction'],
          Properties: {
            ServiceToken: {
              'Fn::GetAtt': ['CustomDashresourceDashexistingDashs3LambdaFunction', 'Arn'],
            },
            FunctionName: 'second',
            BucketName: 'existing-s3-bucket',
            BucketConfigs: [
              {
                Event: 's3:ObjectCreated:Put',

                Rules: [{ Prefix: 'uploads' }, { Suffix: '.jpg' }],
              },
              {
                Event: 's3:ObjectRemoved:Delete',
                Rules: [{ Prefix: 'downloads' }, { Suffix: '.txt' }],
              },
              {
                Event: 's3:ObjectRestore:Post',

                Rules: [{ Prefix: 'avatars' }, { Suffix: '.png' }],
              },
            ],
          },
        });
      });
    });

    it('should create DependsOn clauses when one bucket is used in more than 1 custom resources', () => {
      awsCompileS3Events.serverless.service.functions = {
        first: {
          name: 'first',
          events: [
            {
              s3: {
                bucket: 'existing-s3-bucket',
                event: 's3:ObjectCreated:*',
                rules: [{ prefix: 'uploads' }, { suffix: '.jpg' }],
                existing: true,
              },
            },
            {
              s3: {
                bucket: 'existing-s3-bucket',
                event: 's3:ObjectCreated:*',
                rules: [{ prefix: 'uploads' }, { suffix: '.jpeg' }],
                existing: true,
              },
            },
            {
              s3: {
                bucket: 'existing-s3-bucket',
                event: 's3:ObjectCreated:*',
                rules: [{ prefix: 'uploads' }, { suffix: '.png' }],
                existing: true,
              },
            },
          ],
        },
        second: {
          name: 'second',
          events: [
            {
              s3: {
                bucket: 'existing-s3-bucket',
                event: 's3:ObjectRemoved:*',
                rules: [{ prefix: 'uploads' }, { suffix: '.jpg' }],
                existing: true,
              },
            },
            {
              s3: {
                bucket: 'existing-s3-bucket',
                event: 's3:ObjectRemoved:*',
                rules: [{ prefix: 'uploads' }, { suffix: '.jpeg' }],
                existing: true,
              },
            },
            {
              s3: {
                bucket: 'existing-s3-bucket',
                event: 's3:ObjectRemoved:*',
                rules: [{ prefix: 'uploads' }, { suffix: '.png' }],
                existing: true,
              },
            },
          ],
        },
      };

      return expect(awsCompileS3Events.existingS3Buckets()).to.be.fulfilled.then(() => {
        const {
          Resources,
        } = awsCompileS3Events.serverless.service.provider.compiledCloudFormationTemplate;

        expect(addCustomResourceToServiceStub).to.have.been.calledOnce;
        expect(addCustomResourceToServiceStub.args[0][1]).to.equal('s3');
        expect(addCustomResourceToServiceStub.args[0][2]).to.deep.equal([
          {
            Action: ['s3:PutBucketNotification', 's3:GetBucketNotification'],
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  {
                    Ref: 'AWS::Partition',
                  },
                  ':s3:::existing-s3-bucket',
                ],
              ],
            },
          },
          {
            Action: ['lambda:AddPermission', 'lambda:RemovePermission'],
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                ':',
                [
                  'arn',
                  {
                    Ref: 'AWS::Partition',
                  },
                  'lambda',
                  {
                    Ref: 'AWS::Region',
                  },
                  {
                    Ref: 'AWS::AccountId',
                  },
                  'function',
                  'first',
                ],
              ],
            },
          },
          {
            Action: ['s3:PutBucketNotification', 's3:GetBucketNotification'],
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  {
                    Ref: 'AWS::Partition',
                  },
                  ':s3:::existing-s3-bucket',
                ],
              ],
            },
          },
          {
            Action: ['lambda:AddPermission', 'lambda:RemovePermission'],
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                ':',
                [
                  'arn',
                  {
                    Ref: 'AWS::Partition',
                  },
                  'lambda',
                  {
                    Ref: 'AWS::Region',
                  },
                  {
                    Ref: 'AWS::AccountId',
                  },
                  'function',
                  'second',
                ],
              ],
            },
          },
        ]);
        expect(Object.keys(Resources)).to.have.length(2);
        expect(Resources.FirstCustomS31).to.deep.equal({
          Type: 'Custom::S3',
          Version: 1,
          DependsOn: ['FirstLambdaFunction', 'CustomDashresourceDashexistingDashs3LambdaFunction'],
          Properties: {
            ServiceToken: {
              'Fn::GetAtt': ['CustomDashresourceDashexistingDashs3LambdaFunction', 'Arn'],
            },
            FunctionName: 'first',
            BucketName: 'existing-s3-bucket',
            BucketConfigs: [
              {
                Event: 's3:ObjectCreated:*',

                Rules: [{ Prefix: 'uploads' }, { Suffix: '.jpg' }],
              },
              {
                Event: 's3:ObjectCreated:*',
                Rules: [{ Prefix: 'uploads' }, { Suffix: '.jpeg' }],
              },
              {
                Event: 's3:ObjectCreated:*',
                Rules: [{ Prefix: 'uploads' }, { Suffix: '.png' }],
              },
            ],
          },
        });
        expect(Resources.SecondCustomS31).to.deep.equal({
          Type: 'Custom::S3',
          Version: 1,
          DependsOn: [
            'SecondLambdaFunction',
            'CustomDashresourceDashexistingDashs3LambdaFunction',
            'FirstCustomS31',
          ],
          Properties: {
            ServiceToken: {
              'Fn::GetAtt': ['CustomDashresourceDashexistingDashs3LambdaFunction', 'Arn'],
            },
            FunctionName: 'second',
            BucketName: 'existing-s3-bucket',
            BucketConfigs: [
              {
                Event: 's3:ObjectRemoved:*',

                Rules: [{ Prefix: 'uploads' }, { Suffix: '.jpg' }],
              },
              {
                Event: 's3:ObjectRemoved:*',
                Rules: [{ Prefix: 'uploads' }, { Suffix: '.jpeg' }],
              },
              {
                Event: 's3:ObjectRemoved:*',
                Rules: [{ Prefix: 'uploads' }, { Suffix: '.png' }],
              },
            ],
          },
        });
      });
    });

    it('should throw if more than 1 S3 bucket is configured per function', () => {
      awsCompileS3Events.serverless.service.functions = {
        first: {
          name: 'second',
          events: [
            {
              s3: {
                bucket: 'existing-s3-bucket',
                existing: true,
              },
            },
            {
              s3: {
                bucket: 'existing-s3-bucket-2',
                existing: true,
              },
            },
          ],
        },
      };

      return expect(() => awsCompileS3Events.existingS3Buckets()).to.throw('Only one S3 Bucket');
    });
  });
});
