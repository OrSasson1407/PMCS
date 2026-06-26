import { pool } from './services/db';

// ── Seed: insert test data into PostgreSQL ────────────────────────────────────
const seed = async (): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── Organizations ─────────────────────────────────────────────────────────
    const orgResult = await client.query(`
      INSERT INTO organizations (name, risk_tolerance)
      VALUES ('Acme Corp', 75), ('PMCS Internal', 90)
      ON CONFLICT DO NOTHING
      RETURNING id, name
    `);
    console.log('[seed] Organizations:', orgResult.rows);

    const acmeId   = orgResult.rows[0]?.id;
    const pmcsId   = orgResult.rows[1]?.id;

    if (!acmeId || !pmcsId) {
      console.log('[seed] Orgs already seeded, fetching existing...');
      const existing = await client.query(
        `SELECT id, name FROM organizations WHERE name IN ('Acme Corp', 'PMCS Internal')`
      );
      const acme = existing.rows.find((r: {name: string}) => r.name === 'Acme Corp');
      const pmcs = existing.rows.find((r: {name: string}) => r.name === 'PMCS Internal');
      await seedRepos(client, acme.id, pmcs.id);
    } else {
      await seedRepos(client, acmeId, pmcsId);
    }

    await client.query('COMMIT');
    console.log('[seed] ✔ All seed data committed successfully');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seed] ✖ Seed failed, rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

const seedRepos = async (client: any, acmeId: string, pmcsId: string): Promise<void> => {
  // ── Repositories ───────────────────────────────────────────────────────────
  const repoResult = await client.query(`
    INSERT INTO repositories (org_id, vcs_id, name, default_branch)
    VALUES
      ($1, 'github:acme/core-backend',   'core-backend',   'main'),
      ($1, 'github:acme/auth-service',   'auth-service',   'main'),
      ($2, 'github:pmcs/pmcs-engine',    'pmcs-engine',    'main')
    ON CONFLICT (vcs_id) DO NOTHING
    RETURNING id, name
  `, [acmeId, pmcsId]);
  console.log('[seed] Repositories:', repoResult.rows);

  const repos = await client.query(
    `SELECT id, name FROM repositories WHERE org_id = $1`, [acmeId]
  );
  const coreBackendId = repos.rows[0]?.id;
  if (!coreBackendId) return;

  // ── Branches ───────────────────────────────────────────────────────────────
  const branchResult = await client.query(`
    INSERT INTO branches (repo_id, name, latest_commit, last_updated)
    VALUES
      ($1, 'main',              'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', NOW() - INTERVAL '1 hour'),
      ($1, 'feature-auth',      'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3', NOW() - INTERVAL '30 minutes'),
      ($1, 'feature-users',     'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4', NOW() - INTERVAL '45 minutes'),
      ($1, 'hotfix-db',         'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5', NOW() - INTERVAL '2 hours'),
      ($1, 'feature-payments',  'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6', NOW() - INTERVAL '3 hours')
    ON CONFLICT DO NOTHING
    RETURNING id, name
  `, [coreBackendId]);
  console.log('[seed] Branches:', branchResult.rows);

  const branches = await client.query(
    `SELECT id, name FROM branches WHERE repo_id = $1`, [coreBackendId]
  );

  const branchMap: Record<string, string> = {};
  for (const b of branches.rows) branchMap[b.name] = b.id;

  // ── Risk Events ────────────────────────────────────────────────────────────
  if (branchMap['feature-auth'] && branchMap['feature-users']) {
    await client.query(`
      INSERT INTO risk_events (branch_a_id, branch_b_id, probability_score, status)
      VALUES
        ($1, $2, 0.87, 'OPEN'),
        ($3, $4, 0.62, 'OPEN'),
        ($5, $6, 0.34, 'OPEN')
      ON CONFLICT DO NOTHING
    `, [
      branchMap['feature-auth'],    branchMap['feature-users'],
      branchMap['feature-auth'],    branchMap['hotfix-db'],
      branchMap['feature-payments'], branchMap['main'],
    ]);
    console.log('[seed] Risk events inserted');
  }
};

seed().catch((err) => {
  console.error('[seed] Fatal error:', err);
  process.exit(1);
});
