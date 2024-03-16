import * as path from 'path';
import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Architecture, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { IVpc, ISecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

export default class LambdaBuilder {
  private props: Mutable<NodejsFunctionProps>;

  constructor(private scope: Construct, private functionName: string) {
    this.props = {
      bundling: {
        target: 'node20',
        nodeModules: [],
        externalModules: [],
        loader: {
          '.pem': 'file',
          '.html': 'text',
        },
      },
      logRetention: RetentionDays.ONE_WEEK,
      tracing: Tracing.DISABLED,
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      handler: 'handler',
      timeout: Duration.seconds(30),
      initialPolicy: [],
      description: '',
      memorySize: 256,
    };
  }

  setEnv(env: { [key: string]: string }) {
    this.props.environment = env;
    return this;
  }

  setTimeout(seconds: number) {
    this.props.timeout = Duration.seconds(seconds);
    return this;
  }

  setMemory(mb: number) {
    this.props.memorySize = mb;
    return this;
  }

  addNodeModules(moduleNames: string | string[]) {
    if (Array.isArray(moduleNames)) {
      this.props.bundling?.nodeModules?.push(...moduleNames);
    } else {
      this.props.bundling?.nodeModules?.push(moduleNames);
    }
    return this;
  }

  addExternalModules(moduleNames: string | string[]) {
    if (Array.isArray(moduleNames)) {
      this.props.bundling?.externalModules?.push(...moduleNames);
    } else {
      this.props.bundling?.externalModules?.push(moduleNames);
    }
    return this;
  }

  addPolicy(policy: PolicyStatement) {
    this.props.initialPolicy?.push(policy);
    return this;
  }

  allowEventBridge() {
    const policy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['events:PutEvents'],
      resources: ['*'],
    });

    return this.addPolicy(policy);
  }

  allowKmsSign() {
    const policy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['kms:Sign'],
      resources: ['*'],
    });

    return this.addPolicy(policy);
  }

  allowKmsDecrypt() {
    const policy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['kms:Decrypt'],
      resources: ['*'],
    });

    return this.addPolicy(policy);
  }

  allowSecretsManager() {
    const policy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: ['*'],
    });

    return this.addPolicy(policy);
  }

  allowSendEmail() {
    const policy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['ses:SendEmail', 'ses:SendTemplatedEmail'],
      resources: ['*'],
    });

    return this.addPolicy(policy);
  }

  connectVPC(vpc: IVpc, ...groups: ISecurityGroup[]) {
    this.props.securityGroups = groups;
    this.props.vpc = vpc;
    return this;
  }

  setDescription(text: string) {
    this.props.description = text;
    return this;
  }

  build() {
    const id = `${this.functionName}Fn`;
    const entry = path.join(__dirname, '../', 'functions', this.functionName, 'index.ts');
    const fn = new NodejsFunction(this.scope, id, { entry, functionName: this.functionName, ...this.props, });
    return fn;
  }
}
