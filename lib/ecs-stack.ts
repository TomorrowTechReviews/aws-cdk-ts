import {
  Stack,
  StackProps,
  aws_ec2 as ec2,
  aws_ecr as ecr,
  aws_ecs as ecs,
  aws_iam as iam,
  aws_elasticloadbalancingv2 as elbv2,
  aws_certificatemanager as acm,
  aws_route53 as route53,
  aws_route53_targets as targets,
  aws_secretsmanager as sm,
  aws_ssm as ssmParameter,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Parameters, ParameterNames } from '../helpers'

interface EcsStackProps extends StackProps {
  vpc: ec2.IVpc;
  rdsSecretName: string;
  subDomainName: string;
  domainName: string;
  hostedZoneId: string;
}

export class EcsStack extends Stack {
  private vpc: ec2.IVpc;
  private rdsSecretName: string;
  private cluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    const { vpc, rdsSecretName, subDomainName, domainName, hostedZoneId } = props;
    this.vpc = vpc;
    this.rdsSecretName = rdsSecretName;

    const ssm = new Parameters(this);
    const certificate = acm.Certificate.fromCertificateArn(this, 'cert', ssm.acmCertArn)
    const ecsSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'ecsSG', ssm.ecsSecurityGroupId);

    this.cluster = this.createCluster('main');
    const alb = this.createAlb('main');
    const listener = this.createAlbListener(alb, certificate);
    this.createChatService(listener, ecsSecurityGroup, 256, 512);
    this.createAlbDomain(alb, domainName, hostedZoneId, subDomainName);
  }

  createCluster(name: string) {
    const cluster = new ecs.Cluster(this, `${name}Cluster`, {
      clusterName: name,
      vpc: this.vpc,
      containerInsights: true,
      enableFargateCapacityProviders: true,
    });

    return cluster;
  }

  createAlb(name: string) {
    const alb = new elbv2.ApplicationLoadBalancer(this, `${name}ALB`, {
      loadBalancerName: name,
      vpc: this.vpc,
      internetFacing: true,
    });

    return alb;
  }

  createAlbListener(alb: elbv2.ApplicationLoadBalancer, certificate: acm.ICertificate) {
    const listener = alb.addListener(`HttpsListener`, {
      port: 443,
      certificates: [certificate],
    });

    return listener;
  }

  createAlbDomain(alb: elbv2.ApplicationLoadBalancer, zoneName: string, zoneId: string, subDomain: string) {
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, `${subDomain}HostedZone`, {
      hostedZoneId: zoneId,
      zoneName,
    });

    new route53.ARecord(this, `${subDomain}Record`, {
      zone: hostedZone,
      recordName: subDomain,
      target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(alb)),
    });
  }

  createRepository(name: string) {
    const repository = new ecr.Repository(this, `${name}ECR`, {
      repositoryName: name,
      imageScanOnPush: true,
    });

    repository.addLifecycleRule({ maxImageCount: 10 });

    return repository;
  }

  createChatService(listener: elbv2.ApplicationListener, sg: ec2.ISecurityGroup, cpu: number = 256, memory: number = 512) {
    const ecrTag = 'latest';
    const serviceName = 'chat';
    const containerPort = 80;
    const envVars = {};

    const repository = this.createRepository(serviceName);

    const taskDefinition = new ecs.FargateTaskDefinition(this, `${serviceName}Task`, {
      family: serviceName,
      memoryLimitMiB: memory,
      cpu,
      runtimePlatform: {
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
      }
    });

    taskDefinition.addToTaskRolePolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: ['*'],
      })
    );

    const container = taskDefinition.addContainer(`${serviceName}Container`, {
      containerName: serviceName,
      image: ecs.ContainerImage.fromEcrRepository(repository, ecrTag),
      environment: envVars,
      secrets: {
        AWS_USER_POOL_ID: ecs.Secret.fromSsmParameter(
          ssmParameter.StringParameter.fromStringParameterName(this, 'cognitoUserPoolId', ParameterNames.cognitoUserPoolId)
        ),
        AWS_USER_POOL_CLIENT_ID: ecs.Secret.fromSsmParameter(
          ssmParameter.StringParameter.fromStringParameterName(this, 'cognitoClientId', ParameterNames.cognitoClientId)
        ),
        RDS_PROXY_HOST: ecs.Secret.fromSsmParameter(
          ssmParameter.StringParameter.fromStringParameterName(this, 'rdsProxyEndpoint', ParameterNames.rdsProxyEndpoint)
        ),
        RDS_CREDENTIALS: ecs.Secret.fromSecretsManager(
          sm.Secret.fromSecretNameV2(this, 'rdsSecretName', this.rdsSecretName)
        ),
      },
      logging: new ecs.AwsLogDriver({
        streamPrefix: serviceName,
        mode: ecs.AwsLogDriverMode.NON_BLOCKING,
        logRetention: 7
      }),
      portMappings: [{ containerPort }],
      privileged: true,
    });

    const service = new ecs.FargateService(this, `${serviceName}Service`, {
      serviceName,
      cluster: this.cluster,
      securityGroups: [sg],
      taskDefinition,
      desiredCount: 1,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      enableExecuteCommand: true, // Allow connecting to the container
    });

    /**
     * Auto-Scaling
     */
    const scaling = service.autoScaleTaskCount({ maxCapacity: 10 });
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 50,
    });

    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 50,
    });

    /**
     * Add to ALB
     */
    listener.addTargets(`${serviceName}Target`, {
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service],
      healthCheck: {
        protocol: elbv2.Protocol.HTTP,
        path: '/health',
      },
    });

    return service;
  }
}
