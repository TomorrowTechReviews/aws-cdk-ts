import { successResponse, clientErrorResponse, notFoundResponse, getPool } from '@shared/index';

export async function seedData() {
  const pool = await getPool();
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        user_id UUID NOT NULL
      );
    `);

    console.log('Table "chats" has been created successfully.');
  } catch (error) {
    console.error('Error creating table:', error);
  }
};

export async function list(userId: string) {
  const pool = await getPool();
  const res = await pool.query('SELECT id, name FROM chats WHERE user_id = $1 ORDER BY name ASC;', [userId]);
  return successResponse(res.rows);
}

export async function getById(userId: string, id: string) {
  const pool = await getPool();
  const res = await pool.query('SELECT id, name FROM chats WHERE id = $1 AND user_id = $2;', [id, userId]);
  return res.rowCount === 1 ? successResponse(res.rows[0]) : notFoundResponse()
}

export async function create(userId: string, body: string) {
  const pool = await getPool();
  const { name } = JSON.parse(body);

  const result = await pool.query('INSERT INTO chats (name, user_id) VALUES ($1, $2) RETURNING id, name;', [name, userId]);
  return result.rowCount === 1 ? successResponse(result.rows[0]) : clientErrorResponse();
}