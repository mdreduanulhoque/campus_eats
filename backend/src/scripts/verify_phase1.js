const http = require('http');
const { pool, testConnection } = require('../config/db');
const app = require('../app');

async function verifyPhase1() {
  console.log('====================================================');
  console.log('        CampusEats - Phase 1 Verification Checks     ');
  console.log('====================================================\n');

  let passedAll = true;

  // Check 1: Database Connectivity
  process.stdout.write('[Check 1/5] Testing MySQL connection to "campus_eats"... ');
  try {
    await testConnection();
    console.log('PASSED');
  } catch (err) {
    console.log('FAILED');
    console.error('  Error:', err.message);
    passedAll = false;
    process.exit(1);
  }

  // Check 2: Table Existence
  process.stdout.write('[Check 2/5] Checking schema tables exist... ');
  try {
    const requiredTables = ['canteens', 'users', 'menu_items', 'orders', 'order_items', 'reviews', 'notifications'];
    const [rows] = await pool.query('SHOW TABLES');
    const tableNames = rows.map(r => Object.values(r)[0]);

    const missing = requiredTables.filter(t => !tableNames.includes(t));
    if (missing.length > 0) {
      console.log('FAILED');
      console.error(`  Missing tables: ${missing.join(', ')}`);
      passedAll = false;
    } else {
      console.log(`PASSED (${tableNames.length} tables verified)`);
    }
  } catch (err) {
    console.log('FAILED');
    console.error('  Error:', err.message);
    passedAll = false;
  }

  // Check 3: Users and Role Breakdown
  process.stdout.write('[Check 3/5] Verifying seeded user roles... ');
  try {
    const [users] = await pool.query('SELECT role, count(*) as count FROM users GROUP BY role');
    const rolesMap = {};
    users.forEach(u => { rolesMap[u.role] = u.count; });

    const requiredRoles = ['super_admin', 'local_admin', 'kitchen_staff', 'user'];
    const missingRoles = requiredRoles.filter(r => !rolesMap[r]);

    if (missingRoles.length > 0) {
      console.log('FAILED');
      console.error(`  Missing users for roles: ${missingRoles.join(', ')}. Please run 'npm run seed'.`);
      passedAll = false;
    } else {
      console.log('PASSED');
      users.forEach(u => console.log(`   - Role "${u.role}": ${u.count} user(s)`));
    }
  } catch (err) {
    console.log('FAILED');
    console.error('  Error:', err.message);
    passedAll = false;
  }

  // Check 4: Canteens and Menu Items
  process.stdout.write('[Check 4/5] Verifying canteens and menu items... ');
  try {
    const [[{ canteenCount }]] = await pool.query('SELECT COUNT(*) as canteenCount FROM canteens');
    const [[{ menuCount }]] = await pool.query('SELECT COUNT(*) as menuCount FROM menu_items');

    if (canteenCount > 0 && menuCount > 0) {
      console.log(`PASSED (${canteenCount} canteen(s), ${menuCount} menu item(s))`);
    } else {
      console.log('FAILED');
      console.error(`  Insufficient data: canteens=${canteenCount}, menu_items=${menuCount}. Run 'npm run seed'.`);
      passedAll = false;
    }
  } catch (err) {
    console.log('FAILED');
    console.error('  Error:', err.message);
    passedAll = false;
  }

  // Check 5: Express Health Check Endpoint
  process.stdout.write('[Check 5/5] Testing Express Health Check endpoint (/api/health)... ');
  const testServer = http.createServer(app);
  await new Promise((resolve) => testServer.listen(0, resolve));
  const testPort = testServer.address().port;

  try {
    const healthResponse = await new Promise((resolve, reject) => {
      http.get(`http://localhost:${testPort}/api/health`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });

    if (healthResponse.statusCode === 200 && healthResponse.body.status === 'ok' && healthResponse.body.database === 'connected') {
      console.log('PASSED (HTTP 200, DB: connected)');
    } else {
      console.log('FAILED');
      console.error('  Response:', healthResponse);
      passedAll = false;
    }
  } catch (err) {
    console.log('FAILED');
    console.error('  Error:', err.message);
    passedAll = false;
  } finally {
    testServer.close();
    await pool.end();
  }

  console.log('\n====================================================');
  if (passedAll) {
    console.log('    SUCCESS: ALL PHASE 1 CHECKS PASSED!');
    console.log('====================================================\n');
    process.exit(0);
  } else {
    console.log('    FAILURE: SOME CHECKS FAILED');
    console.log('====================================================\n');
    process.exit(1);
  }
}

verifyPhase1().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
