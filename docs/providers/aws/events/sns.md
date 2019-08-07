<!--
title: Serverless Framework - AWS Lambda Events - SNS
menuText: SNS
menuOrder: 6
description:  Setting up AWS SNS Events with AWS Lambda via the Serverless Framework
layout: Doc
-->

<!-- DOCS-SITE-LINK:START automatically generated  -->

### [Read this on the main serverless docs site](https://www.serverless.com/framework/docs/providers/aws/events/sns)

<!-- DOCS-SITE-LINK:END -->

# SNS

In the following example we create a new SNS topic with the name `dispatch` which is bound to the `dispatcher` function. The function will be called every time a message is sent to the `dispatch` topic.

```yml
functions:
  dispatcher:
    handler: dispatcher.dispatch
    events:
      - sns: dispatch
```

You're also able to add the same SNS topic to multiple functions:

```yml
functions:
  dispatcher:
    handler: dispatcher.dispatch
    events:
      - sns: dispatch
  dispatcher2:
    handler: dispatcher2.dispatch
    events:
      - sns: dispatch
```

This will run both functions for a message sent to the dispatch topic.

## Using a pre-existing topic

If an `arn:` is specified, the framework will give permission to the topic to invoke the function and subscribe the function to the topic.

```yml
functions:
  dispatcher:
    handler: dispatcher.dispatch
    events:
      - sns: arn:xxx
```

```yml
functions:
  dispatcher:
    handler: dispatcher.dispatch
    events:
      - sns:
          arn: arn:xxx
```

Or with intrinsic CloudFormation function like `Fn::Join` or `Fn::GetAtt`.
**Note:** The arn can be in a different region to enable cross region invocation

```yml
functions:
  dispatcher:
    handler: dispatcher.dispatch
    events:
      - sns:
          arn:
            Fn::Join:
              - ':'
              - - 'arn:aws:sns'
                - Ref: 'AWS::Region'
                - Ref: 'AWS::AccountId'
                - 'MyCustomTopic'
          topicName: MyCustomTopic
```

**Note:** If an `arn` string is specified but not a `topicName`, the last substring starting with `:` will be extracted as the `topicName`. If an `arn` object is specified, `topicName` must be specified as a string, used only to name the underlying Cloudformation mapping resources. You can take advantage of this behavior when subscribing to multiple topics with the same name in different regions/accounts to avoid collisions between Cloudformation resource names.

```yml
functions:
  hello:
    handler: handler.run
    events:
      - sns:
          arn: arn:aws:sns:us-east-1:00000000000:topicname
          topicName: topicname-account-1-us-east-1
      - sns:
          arn: arn:aws:sns:us-east-1:11111111111:topicname
          topicName: topicname-account-2-us-east-1
```

## Setting a display name

This event definition ensures that the `aggregator` function gets called every time a message is sent to the
`aggregate` topic. `Data aggregation pipeline` will be shown in the AWS console so that the user can understand what the
SNS topic is used for.

```yml
functions:
  aggregator:
    handler: aggregator.handler
    events:
      - sns:
          topicName: aggregate
          displayName: Data aggregation pipeline
```

## Setting a filter policy

This event definition creates an SNS topic which subscription uses a filter policy. The filter policy filters out messages that don't have attribute key `pet` with value `dog` or `cat`.

```yml
functions:
  pets:
    handler: pets.handler
    events:
      - sns:
          topicName: pets
          filterPolicy:
            pet:
              - dog
              - cat
```
