import { aws_ssm as ssm } from 'aws-cdk-lib';
import { Construct } from 'constructs';

enum ParameterNames {
  cognitoUserPoolId = '/cognito/userPoolId',
  cognitoClientId = '/cognito/clientId',
  rdsProxyEndpoint = '/rds/proxy/endpoint',
  rdsSecurityGroupId = '/sg/rds',
  lambdaSecurityGroupId = '/sg/lambda',
  acmCertArn = '/acm/cert/arn',
}

export default class Parameters {
  constructor(private scope: Construct) { }

  private getParameter(name: ParameterNames) {
    return ssm.StringParameter.valueFromLookup(this.scope, name);
  }

  private setParameter(name: ParameterNames, value: string) {
    new ssm.StringParameter(this.scope, `SetParam${name}`, {
      parameterName: name,
      stringValue: value,
    });
  }

  public set cognitoUserPoolId(value: string) {
    this.setParameter(ParameterNames.cognitoUserPoolId, value);
  }

  public get cognitoUserPoolId() {
    return this.getParameter(ParameterNames.cognitoUserPoolId);
  }

  public get cognitoClientId() {
    return this.getParameter(ParameterNames.cognitoClientId);
  }

  public set cognitoClientId(value: string) {
    this.setParameter(ParameterNames.cognitoClientId, value);
  }

  public get rdsProxyEndpoint() {
    return this.getParameter(ParameterNames.rdsProxyEndpoint);
  }

  public set rdsProxyEndpoint(value: string) {
    this.setParameter(ParameterNames.rdsProxyEndpoint, value);
  }

  public get rdsSecurityGroupId() {
    return this.getParameter(ParameterNames.rdsSecurityGroupId);
  }

  public set rdsSecurityGroupId(value: string) {
    this.setParameter(ParameterNames.rdsSecurityGroupId, value);
  }

  public get lambdaSecurityGroupId() {
    return this.getParameter(ParameterNames.lambdaSecurityGroupId);
  }

  public set lambdaSecurityGroupId(value: string) {
    this.setParameter(ParameterNames.lambdaSecurityGroupId, value);
  }

  public get acmCertArn() {
    return this.getParameter(ParameterNames.acmCertArn);
  }

  public set acmCertArn(value: string) {
    this.setParameter(ParameterNames.acmCertArn, value);
  }
}
