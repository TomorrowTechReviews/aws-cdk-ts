import { Stack, StackProps, aws_ec2 as ec2 } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Parameters } from '../helpers'

const POSTGRES_PORT = 5432;

interface VpcStackProps extends StackProps {
  natGateways: number;
}

export class VpcStack extends Stack {
  public vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: VpcStackProps) {
    super(scope, id, props);
    const { natGateways } = props;

    this.vpc = this.createVpc('custom', natGateways)
    const lambdaSecurityGroup = this.createLambdaSecurityGroup();
    const rdsSecurityGroup = this.createRdsSecurityGroup();
    const ecsSecurityGroup = this.createEcsSecurityGroup();

    rdsSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(lambdaSecurityGroup.securityGroupId),
      ec2.Port.tcp(POSTGRES_PORT),
      'Allow access for Lambda'
    );

    rdsSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(ecsSecurityGroup.securityGroupId),
      ec2.Port.tcp(POSTGRES_PORT),
      'Allow access for ECS'
    );

    const ssm = new Parameters(this);
    ssm.rdsSecurityGroupId = rdsSecurityGroup.securityGroupId;
    ssm.lambdaSecurityGroupId = lambdaSecurityGroup.securityGroupId;
    ssm.ecsSecurityGroupId = ecsSecurityGroup.securityGroupId;
  }

  private createVpc(vpcName: string, natGateways: number) {
    const vpc = new ec2.Vpc(this, 'customVPC', {
      vpcName,
      maxAzs: 2,
      natGateways,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    return vpc;
  }

  private createLambdaSecurityGroup() {
    const sg = new ec2.SecurityGroup(this, 'lambdaSecurityGroup', {
      securityGroupName: 'lambda',
      vpc: this.vpc,
      allowAllOutbound: true,
    });

    // Allow all TCP traffic in
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.allTcp(), 'All TCP Ports');
    return sg;
  }

  private createRdsSecurityGroup() {
    const sg = new ec2.SecurityGroup(this, 'rdsSecurityGroup', {
      securityGroupName: 'rds',
      vpc: this.vpc,
      allowAllOutbound: true,
    });

    // Allow all TCP traffic in
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.allTcp(), 'All TCP Ports');
    return sg;
  }

  private createEcsSecurityGroup() {
    const sg = new ec2.SecurityGroup(this, 'ecsSecurityGroup', {
      securityGroupName: 'ecs',
      vpc: this.vpc,
      allowAllOutbound: true,
    });

    // Allow all TCP traffic in
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.allTcp(), 'All TCP Ports');
    return sg;
  }
}
