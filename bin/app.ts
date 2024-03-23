#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc-stack';
import { AcmStack } from '../lib/acm-stack';
import { CognitoStack } from '../lib/cognito-stack';
import { DbStack } from '../lib/db-stack';
import { ApiStack } from '../lib/api-stack';

const { CDK_DEFAULT_ACCOUNT } = process.env;

/**
 * Configaration
 */
const PROD_ACCOUNT = '-'
const isProduction = CDK_DEFAULT_ACCOUNT === PROD_ACCOUNT;
const domainName = 'tomorrowtechreviews.com';
const apiSubDomainName = 'api';
const hostedZoneId = 'Z...';
const envEU = { region: 'eu-central-1', account: CDK_DEFAULT_ACCOUNT };
const envUS = { region: 'us-east-1', account: CDK_DEFAULT_ACCOUNT };

/**
 * Create the stacks
 */
const app = new cdk.App();

const vpc = new VpcStack(app, 'vpc', { env: envEU, natGateways: isProduction ? 2 : 1 });

// new AcmStack(app, 'acm', { env: envEU, domainName, hostedZoneId });

// new CognitoStack(app, 'cognito', { env: envEU });

// new DbStack(app, 'db', {
//   env: envEU,
//   vpc: vpc.vpc,
//   rdsSecretName: 'mainRdsSecret',
//   writerClass: isProduction ? ec2.InstanceClass.R5 : ec2.InstanceClass.T3,
//   writerSize: isProduction ? ec2.InstanceSize.LARGE : ec2.InstanceSize.MEDIUM,
//   readerClass: isProduction ? ec2.InstanceClass.R5 : ec2.InstanceClass.T3,
//   readerSize: isProduction ? ec2.InstanceSize.LARGE : ec2.InstanceSize.MEDIUM,
// });

// new ApiStack(app, 'api', {
//   env: envEU,
//   vpc: vpc.vpc,
//   rdsSecretName: 'mainRdsSecret',
//   subDomainName: apiSubDomainName,
//   domainName,
//   hostedZoneId,
// });