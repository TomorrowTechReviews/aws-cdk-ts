import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export async function getSecret(secretName: string) {
  const client = new SecretsManagerClient({ region: process.env.AWS_DEFAULT_REGION });
  const command = new GetSecretValueCommand({ SecretId: secretName });
  
  const data = await client.send(command);
  return data.SecretString;
}
