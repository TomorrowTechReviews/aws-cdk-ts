import { Stack, StackProps, Duration, aws_ec2 as ec2, aws_rds as rds, } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Parameters } from '../helpers'

interface DbStackProps extends StackProps {
  vpc: ec2.IVpc;
  rdsSecretName: string;
  writerClass: ec2.InstanceClass;
  writerSize: ec2.InstanceSize;
  readerClass: ec2.InstanceClass;
  readerSize: ec2.InstanceSize;
}

export class DbStack extends Stack {
  constructor(scope: Construct, id: string, props: DbStackProps) {
    super(scope, id, props);
    const {
      vpc,
      rdsSecretName,
      writerClass,
      writerSize,
      readerClass,
      readerSize,
    } = props;

    const ssm = new Parameters(this);
    const rdsSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'dbRdsSG', ssm.rdsSecurityGroupId);
    const subnetType = ec2.SubnetType.PRIVATE_ISOLATED;

    const cluster = this.createCluster('main', 'product',
      vpc,
      subnetType,
      rdsSecurityGroup,
      rdsSecretName,
      writerClass,
      writerSize,
      readerClass,
      readerSize
    );

    const proxy = this.createProxy('main', cluster, vpc, rdsSecurityGroup, subnetType);
    ssm.rdsProxyEndpoint = proxy.endpoint;
  }

  private createCluster(
    clusterName: string,
    dbName: string,
    vpc: ec2.IVpc,
    subnetType: ec2.SubnetType,
    rdsSecurityGroup: ec2.ISecurityGroup,
    rdsSecretName: string,
    writerClass: ec2.InstanceClass,
    writerSize: ec2.InstanceSize,
    readerClass: ec2.InstanceClass,
    readerSize: ec2.InstanceSize,
  ) {
    const writerInstanceType = ec2.InstanceType.of(writerClass, writerSize);
    const readerInstanceType = ec2.InstanceType.of(readerClass, readerSize);

    const writerInstance = rds.ClusterInstance.provisioned('writer', {
      publiclyAccessible: false,
      instanceIdentifier: 'writer',
      instanceType: writerInstanceType,
    });

    const readerInstances = [
      rds.ClusterInstance.provisioned('reader', {
        publiclyAccessible: false,
        instanceIdentifier: 'reader',
        instanceType: readerInstanceType,
      }),
    ];

    const engine = rds.DatabaseClusterEngine.auroraPostgres({
      version: rds.AuroraPostgresEngineVersion.VER_16_1,
    });

    const credentials = rds.Credentials.fromGeneratedSecret('RdsClusterSecret', {
      secretName: rdsSecretName,
    });

    const cluster = new rds.DatabaseCluster(this, 'RdsCluster', {
      clusterIdentifier: clusterName,
      defaultDatabaseName: dbName,
      engine,
      vpc,
      vpcSubnets: { subnetType },
      writer: writerInstance,
      readers: readerInstances,
      credentials,
      securityGroups: [rdsSecurityGroup],
      backup: { retention: Duration.days(7) },
      deletionProtection: true,
      storageEncrypted: true,
    });

    return cluster;
  }

  private createProxy(name: string, cluster: rds.DatabaseCluster, vpc: ec2.IVpc, rdsSecurityGroup: ec2.ISecurityGroup, subnetType: ec2.SubnetType) {
    const proxy = cluster.addProxy('Proxy', {
      dbProxyName: name,
      vpc,
      vpcSubnets: {
        subnetType,
      },
      secrets: [cluster.secret!],
      securityGroups: [rdsSecurityGroup],
    });

    return proxy;
  }
}
