import {
  Stack,
  StackProps,
  aws_apigatewayv2 as apigwv2,
  aws_ec2 as ec2,
  aws_cognito as cognito,
  aws_certificatemanager as acm,
  aws_route53 as route53,
  aws_route53_targets as targets,
} from 'aws-cdk-lib';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { Construct } from 'constructs';
import { LambdaBuilder, Parameters } from '../helpers'

interface ApiStackProps extends StackProps {
  vpc: ec2.IVpc;
  rdsSecretName: string;
  subDomainName: string;
  domainName: string;
  hostedZoneId: string;
}

export class ApiStack extends Stack {
  private api: apigwv2.HttpApi;
  private vpc: ec2.IVpc;
  private lambdaSecurityGroup: ec2.ISecurityGroup;
  private rdsSecretName: string;
  private rdsProxyEndpoint: string

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const ssm = new Parameters(this);

    const { vpc, rdsSecretName, subDomainName, domainName, hostedZoneId } = props;
    this.vpc = vpc;
    this.rdsSecretName = rdsSecretName;
    this.rdsProxyEndpoint = ssm.rdsProxyEndpoint;

    this.lambdaSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'apiLambdaSG', ssm.lambdaSecurityGroupId);
    const cognitoUserPool = cognito.UserPool.fromUserPoolId(this, 'ApiUserPool', ssm.cognitoUserPoolId);

    this.api = this.createApi('main', cognitoUserPool, ssm.cognitoClientId, subDomainName, domainName, hostedZoneId, ssm.acmCertArn);
    this.chatsRoute();
  }

  private createApi(
    name: string,
    cognitoUserPool: cognito.IUserPool,
    cognitoClientId: string,
    subDomainName: string,
    domainName: string,
    hostedZoneId: string,
    certArn: string
  ) {
    const issuer = `https://cognito-idp.${this.region}.amazonaws.com/${cognitoUserPool.userPoolId}`;
    const authorizer = new HttpJwtAuthorizer('CognitoAuthorizer', issuer, {
      jwtAudience: [cognitoClientId],
    });

    const domainNameMapping = new apigwv2.DomainName(this, 'ApiDomainName', {
      domainName: `${subDomainName}.${domainName}`,
      certificate: acm.Certificate.fromCertificateArn(this, 'cert', certArn),
    });

    const api = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: name,
      defaultAuthorizer: authorizer,
      defaultDomainMapping: {
        domainName: domainNameMapping,
      }
    });

    this.createDomainRecord(hostedZoneId, subDomainName, domainName, domainNameMapping)

    return api;
  }

  private createDomainRecord(hostedZoneId: string, subDomainName: string, domainName: string, domainNameMapping: apigwv2.DomainName) {
    const zone = route53.HostedZone.fromHostedZoneAttributes(this, `${hostedZoneId}MainZone`, {
      hostedZoneId,
      zoneName: `${subDomainName}.${domainName}`,
    });

    new route53.ARecord(this, 'ApiAliasRecord', {
      zone,
      target: route53.RecordTarget.fromAlias(new targets.ApiGatewayv2DomainProperties(domainNameMapping.regionalDomainName, domainNameMapping.regionalHostedZoneId)),
    });
  }

  private chatsRoute() {
    const fn = new LambdaBuilder(this, 'api-chats')
      .setDescription('Chats CRUD operations')
      .setEnv({
        RDS_SECRET_NAME: this.rdsSecretName,
        RDS_PROXY_HOST: this.rdsProxyEndpoint
      })
      .allowSecretsManager()
      .connectVPC(this.vpc, this.lambdaSecurityGroup)
      .build();

    const integration = new HttpLambdaIntegration('ChatsFn', fn);

    this.api.addRoutes({
      path: '/chats',
      methods: [apigwv2.HttpMethod.ANY],
      integration,
    });

    this.api.addRoutes({
      path: '/chats/{id}',
      methods: [apigwv2.HttpMethod.ANY],
      integration,
    });
  }
}
