import { Stack, StackProps, aws_certificatemanager as acm, aws_route53 as route53 } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Parameters } from '../helpers'

interface AcmStackProps extends StackProps {
  domainName: string;
  hostedZoneId: string;
}

export class AcmStack extends Stack {
  constructor(scope: Construct, id: string, props: AcmStackProps) {
    super(scope, id, props);
    const { domainName, hostedZoneId } = props;

    const certificate = this.createCertificate(domainName, hostedZoneId);

    const ssm = new Parameters(this);
    ssm.acmCertArn = certificate.certificateArn;
  }

  private createCertificate(domainName: string, hostedZoneId: string) {
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, `${hostedZoneId}MainZone`, {
      hostedZoneId,
      zoneName: domainName,
    });

    const certificate = new acm.Certificate(this, `${hostedZoneId}MainCert`, {
      domainName,
      subjectAlternativeNames: [`*.${domainName}`],
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    return certificate;
  }
}
