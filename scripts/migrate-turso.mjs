const databaseUrl = process.env.TURSO_DATABASE_URL;

if (!databaseUrl) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('TURSO_DATABASE_URL must be configured before deploying');
  }
  process.exit(0);
}

const { createClient } = await import('@libsql/client');
const client = createClient({
  url: databaseUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

try {
  try {
    await client.execute('ALTER TABLE "SongRequest" ADD COLUMN "duplicate_key" TEXT');
  } catch (error) {
    if (!String(error?.message || '').toLowerCase().includes('duplicate column name')) {
      throw error;
    }
  }
  try {
    await client.execute('ALTER TABLE "SongRequest" ADD COLUMN "applicant_slot_key" TEXT');
  } catch (error) {
    if (!String(error?.message || '').toLowerCase().includes('duplicate column name')) {
      throw error;
    }
  }

  await client.execute(
    'CREATE UNIQUE INDEX IF NOT EXISTS "SongRequest_duplicate_key_key" ON "SongRequest" ("duplicate_key")'
  );
  await client.execute(
    'CREATE UNIQUE INDEX IF NOT EXISTS "SongRequest_applicant_slot_key_key" ON "SongRequest" ("applicant_slot_key")'
  );
} finally {
  await client.close();
}
