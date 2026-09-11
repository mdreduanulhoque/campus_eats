const http = require('http');
const { pool } = require('../config/db');
const app = require('../app');

function makeRequest(serverPort, method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const headers = {
      'Content-Type': 'application/json'
    };
    if (data) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: serverPort,
        path,
        method,
        headers
      },
      (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = body;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function verifyPhase3() {
  console.log('====================================================');
  console.log('        CampusEats - Phase 3 Verification Checks     ');
  console.log('====================================================\n');

  const testServer = http.createServer(app);
  await new Promise((resolve) => testServer.listen(0, resolve));
  const port = testServer.address().port;

  let allPassed = true;
  let superAdminToken = null;
  let localAdmin1Token = null;
  let localAdmin2Token = null;
  let kitchen1Token = null;
  let kitchen2Token = null;
  let userToken = null;

  let createdCanteenId = null;
  let createdMenuItemId = null;
  let createdAdminId = null;

  try {
    // 0. Acquire Tokens for test roles
    const loginRole = async (email) => {
      const res = await makeRequest(port, 'POST', '/api/auth/login', { email, password: 'password123' });
      return res.data?.data?.token;
    };

    superAdminToken = await loginRole('superadmin@campuseats.com');
    localAdmin1Token = await loginRole('admin.central@campuseats.com');
    localAdmin2Token = await loginRole('admin.science@campuseats.com');
    kitchen1Token = await loginRole('kitchen.central@campuseats.com');
    kitchen2Token = await loginRole('kitchen.science@campuseats.com');
    userToken = await loginRole('student.rahim@campuseats.com');

    // 1. Public Canteen Listing
    process.stdout.write('[Check 1/10] Public Canteens Listing (GET /api/canteens)... ');
    const canteensRes = await makeRequest(port, 'GET', '/api/canteens');
    if (canteensRes.status === 200 && Array.isArray(canteensRes.data?.data?.canteens) && canteensRes.data.data.canteens.length >= 2) {
      console.log(`PASSED (${canteensRes.data.data.canteens.length} canteens found)`);
    } else {
      console.log('FAILED', canteensRes);
      allPassed = false;
    }

    // 2. Role Guard on Canteen Creation (User cannot create canteens)
    process.stdout.write('[Check 2/10] Unauthorized Canteen Creation by User (Expected 403)... ');
    const unauthorizedRes = await makeRequest(port, 'POST', '/api/canteens', {
      name: 'Illegal Canteen',
      location: 'Basement'
    }, userToken);

    if (unauthorizedRes.status === 403) {
      console.log('PASSED (HTTP 403 Forbidden)');
    } else {
      console.log('FAILED', unauthorizedRes);
      allPassed = false;
    }

    // 3. Super Admin creates Canteen
    process.stdout.write('[Check 3/10] Super Admin creates Canteen (POST /api/canteens)... ');
    const newCanteenRes = await makeRequest(port, 'POST', '/api/canteens', {
      name: 'Engineering Faculty Cafeteria',
      location: 'Engineering Building Ground Floor'
    }, superAdminToken);

    if (newCanteenRes.status === 201 && newCanteenRes.data?.data?.canteen?.id) {
      createdCanteenId = newCanteenRes.data.data.canteen.id;
      console.log(`PASSED (HTTP 201, Canteen ID: ${createdCanteenId})`);
    } else {
      console.log('FAILED', newCanteenRes);
      allPassed = false;
    }

    // 4. Super Admin assigns Local Admin to Canteen
    process.stdout.write('[Check 4/10] Super Admin assigns new Local Admin (POST /api/canteens/:id/local-admin)... ');
    const newAdminEmail = `admin.eng.${Date.now()}@campuseats.com`;
    const assignAdminRes = await makeRequest(port, 'POST', `/api/canteens/${createdCanteenId}/local-admin`, {
      name: 'Eng Admin',
      email: newAdminEmail,
      password: 'password123'
    }, superAdminToken);

    if (assignAdminRes.status === 201 && assignAdminRes.data?.data?.admin?.id) {
      createdAdminId = assignAdminRes.data.data.admin.id;
      console.log('PASSED (HTTP 201, Local Admin assigned)');
    } else {
      console.log('FAILED', assignAdminRes);
      allPassed = false;
    }

    // 5. Local Admin 1 creates a Menu Item for Canteen 1
    process.stdout.write('[Check 5/10] Local Admin 1 creates Menu Item (POST /api/menu)... ');
    const createItemRes = await makeRequest(port, 'POST', '/api/menu', {
      canteen_id: 1,
      name: 'Special Mutton Kacchi',
      description: 'Basmati rice cooked with tender mutton and aromatic saffron',
      price: 280.00,
      est_prep_time_mins: 15
    }, localAdmin1Token);

    if (createItemRes.status === 201 && createItemRes.data?.data?.item?.id) {
      createdMenuItemId = createItemRes.data.data.item.id;
      console.log(`PASSED (HTTP 201, Menu Item ID: ${createdMenuItemId})`);
    } else {
      console.log('FAILED', createItemRes);
      allPassed = false;
    }

    // 6. Cross-Canteen Isolation: Local Admin 2 attempts to edit Canteen 1's Menu Item
    process.stdout.write('[Check 6/10] Cross-Canteen Isolation for Local Admin (Expected 403)... ');
    const crossEditRes = await makeRequest(port, 'PUT', `/api/menu/${createdMenuItemId}`, {
      price: 10.00
    }, localAdmin2Token);

    if (crossEditRes.status === 403) {
      console.log('PASSED (HTTP 403 Forbidden - Tenant Boundary Respected)');
    } else {
      console.log('FAILED', crossEditRes);
      allPassed = false;
    }

    // 7. Kitchen Staff of Canteen 1 toggles availability (true -> false)
    process.stdout.write('[Check 7/10] Kitchen Staff 1 toggles item availability (PATCH /api/menu/:id/availability)... ');
    const toggleOffRes = await makeRequest(port, 'PATCH', `/api/menu/${createdMenuItemId}/availability`, {
      is_available: false
    }, kitchen1Token);

    if (toggleOffRes.status === 200 && toggleOffRes.data?.data?.is_available === false) {
      console.log('PASSED (HTTP 200, is_available: false)');
    } else {
      console.log('FAILED', toggleOffRes);
      allPassed = false;
    }

    // 8. Available Only filter check
    process.stdout.write('[Check 8/10] Menu filter by available_only=true (GET /api/canteens/:id/menu?available_only=true)... ');
    const availOnlyRes = await makeRequest(port, 'GET', `/api/canteens/1/menu?available_only=true`);
    const foundInAvailable = availOnlyRes.data?.data?.items?.some(item => item.id === createdMenuItemId);

    if (availOnlyRes.status === 200 && !foundInAvailable) {
      console.log('PASSED (Unavailable item correctly excluded from customer view)');
    } else {
      console.log('FAILED', { foundInAvailable });
      allPassed = false;
    }

    // 9. Kitchen Staff Cross-Canteen Guard (Kitchen Staff 2 tries to toggle item in Canteen 1)
    process.stdout.write('[Check 9/10] Kitchen Staff Cross-Canteen Guard (Expected 403)... ');
    const crossKitchenRes = await makeRequest(port, 'PATCH', `/api/menu/${createdMenuItemId}/availability`, {
      is_available: true
    }, kitchen2Token);

    if (crossKitchenRes.status === 403) {
      console.log('PASSED (HTTP 403 Forbidden - Kitchen Tenant Boundary Respected)');
    } else {
      console.log('FAILED', crossKitchenRes);
      allPassed = false;
    }

    // 10. Local Admin 1 deletes the test menu item
    process.stdout.write('[Check 10/10] Local Admin 1 deletes Menu Item (DELETE /api/menu/:id)... ');
    const deleteItemRes = await makeRequest(port, 'DELETE', `/api/menu/${createdMenuItemId}`, null, localAdmin1Token);

    if (deleteItemRes.status === 200) {
      console.log('PASSED (HTTP 200, Deleted)');
      createdMenuItemId = null;
    } else {
      console.log('FAILED', deleteItemRes);
      allPassed = false;
    }

  } catch (error) {
    console.error('Unexpected error during Phase 3 verification:', error);
    allPassed = false;
  } finally {
    // Cleanup created test records
    if (createdMenuItemId) {
      await pool.query('DELETE FROM menu_items WHERE id = ?', [createdMenuItemId]);
    }
    if (createdAdminId) {
      await pool.query('DELETE FROM users WHERE id = ?', [createdAdminId]);
    }
    if (createdCanteenId) {
      await pool.query('DELETE FROM canteens WHERE id = ?', [createdCanteenId]);
    }
    testServer.close();
    await pool.end();
  }

  console.log('\n====================================================');
  if (allPassed) {
    console.log('    SUCCESS: ALL PHASE 3 CHECKS PASSED!');
    console.log('====================================================\n');
    process.exit(0);
  } else {
    console.log('    FAILURE: SOME CHECKS FAILED');
    console.log('====================================================\n');
    process.exit(1);
  }
}

verifyPhase3().catch(err => {
  console.error('Fatal Phase 3 verification error:', err);
  process.exit(1);
});
