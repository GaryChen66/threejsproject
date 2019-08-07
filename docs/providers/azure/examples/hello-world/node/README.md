<!--
title: Hello World Node.js Example
menuText: Hello World Node.js Example
description: Create a Node.js Hello World Azure function
layout: Doc
-->

<!-- DOCS-SITE-LINK:START automatically generated  -->

### [Read this on the main serverless docs site](https://www.serverless.com/framework/docs/providers/azure/examples/hello-world/node/)

<!-- DOCS-SITE-LINK:END -->

# Hello World Node.js Example

Make sure `serverless` is installed. [See installation guide](../../../guide/installation.md).

## 1. Create a service

`serverless install --url https://github.com/azure/boilerplate-azurefunctions --name my-sls-app`

## 2. Install Provider Plugin

`npm install -g serverless-azure-functions` followed by `npm install` in the service directory.

## 3. Deploy

`serverless deploy` or `sls deploy`. `sls` is shorthand for the Serverless CLI command

## 4. Invoke deployed function

`serverless invoke --function httpjs --path httpQueryString.json` or `serverless invoke -f httpjs --path httpQueryString.json`

`-f` is shorthand for `--function`

In your terminal window you should see the response from azure

```bash
{
    "payload": "Hello pragna"
}
```

Congrats you have deployed and ran your Hello World function!
