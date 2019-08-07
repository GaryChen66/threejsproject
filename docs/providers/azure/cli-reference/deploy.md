<!--
title: Serverless Framework Commands - Azure Functions - Deploy
menuText: deploy
menuOrder: 3
description: Deploy your service to the specified provider
layout: Doc
-->

<!-- DOCS-SITE-LINK:START automatically generated  -->

### [Read this on the main serverless docs site](https://www.serverless.com/framework/docs/providers/azure/cli-reference/deploy)

<!-- DOCS-SITE-LINK:END -->

# Azure - Deploy

The `serverless deploy` command deploys your entire service via the Azure
Resource Manager API. Run this command when you have made service changes (i.e.,
you edited `serverless.yml`). Use `serverless deploy function -f myFunction`
when you have made code changes and you want to quickly upload your updated code
to Azure Functions.

```bash
serverless deploy
```

## Options

- `--config` or `-c` Path to your conifguration file, if other than `serverless.yml|.yaml|.js|.json`.
- `--noDeploy` or `-n` Skips the deployment steps and leaves artifacts in the `.serverless` directory
- `--verbose` or `-v` Shows all stack events during deployment, and display any Stack Output.
- `--function` or `-f` Invoke `deploy function` (see above). Convenience shortcut.

## Artifacts

After the `serverless deploy` command runs all created deployment artifacts are
placed in the `.serverless` folder of the service.

## Examples

### Deployment

```bash
serverless deploy
```

This is the simplest deployment usage possible. With this command Serverless will
deploy your service to the defined Azure platform endpoints.

## Provided lifecycle events

- `deploy:deploy`
- `deploy:function:deploy`
