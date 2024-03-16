import { Pool } from 'pg'
import * as aws from './aws';

const { RDS_SECRET_NAME, RDS_PROXY_HOST } = process.env;
let pool: Pool | null = null;

export async function getPool() {
  if (pool) {
    return pool;
  }

  const dbSecretJson = await aws.getSecret(RDS_SECRET_NAME!);
  const dbSecret = JSON.parse(dbSecretJson ?? '{}');

  pool = new Pool({
    user: dbSecret.username,
    host: RDS_PROXY_HOST || dbSecret.host,
    database: dbSecret.dbname,
    password: dbSecret.password,
    port: dbSecret.port,
    ssl: true,
  });

  return pool;
}