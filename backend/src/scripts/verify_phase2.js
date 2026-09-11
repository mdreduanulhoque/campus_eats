const http = require('http');
const express = require('express');
const { pool } = require('../config/db');
const app = require('../app');

// Helper for making JSON HTTP requests
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

async function verifyPhase2() {
  console.log('====================================================');
  console.log('        CampusEats - Phase 2 Verification Checks     ');
  console.log('====================================================\n');

  const testServer = http.createServer(app);
  await new Promise((resolve) => testServer.listen(0, resolve));
  const port = testServer.address().port;

  let allPassed = true;
  const testEmail = `test.student.${Date.now()}@campuseats.com`;
  let userToken = null;
  let superAdminToken = null;
  let createdUserId = null;

  try {
    // 1. User Registration Check
    process.stdout.write('[Check 1/8] Testing User Registration (POST /api/auth/register)... ');
    const regRes = await makeRequest(port, 'POST', '/api/auth/register', {
      name: 'Test Student Phase 2',
      email: testEmail,
      password: 'mypassword123'
    });

    if (regRes.status === 201 && regRes.data?.data?.token) {
      userToken = regRes.data.data.token;
      createdUserId = regRes.data.data.user.id;
      console.log('PASSED (HTTP 201, Token Issued)');
    } else {
      console.log('FAILED', regRes);
      allPassed = false;
    }

    // 2. Duplicate Registration Prevention
    process.stdout.write('[Check 2/8] Testing Duplicate Email Registration (Expected 409)... ');
    const dupRes = await makeRequest(port, 'POST', '/api/auth/register', {
      name: 'Duplicate Student',
      email: testEmail,
      password: 'mypassword123'
    });

    if (dupRes.status === 409) {
      console.log('PASSED (HTTP 409 Conflict)');
    } else {
      console.log('FAILED', dupRes);
      allPassed = false;
    }

    // 3. User Login Check
    process.stdout.write('[Check 3/8] Testing User Login with valid & invalid credentials... ');
    const badLogin = await makeRequest(port, 'POST', '/api/auth/login', {
      email: testEmail,
      password: 'wrongpassword'
    });
    const goodLogin = await makeRequest(port, 'POST', '/api/auth/login', {
      email: testEmail,
      password: 'mypassword123'
    });

    if (badLogin.status === 401 && goodLogin.status === 200 && goodLogin.data?.data?.token) {
      console.log('PASSED (Invalid: 401, Valid: 200)');
    } else {
      console.log('FAILED', { badLogin, goodLogin });
      allPassed = false;
    }

    // Login as seeded Super Admin to get super admin token
    const superAdminLogin = await makeRequest(port, 'POST', '/api/auth/login', {
      email: 'superadmin@campuseats.com',
      password: 'password123'
    });
    if (superAdminLogin.status === 200 && superAdminLogin.data?.data?.token) {
      superAdminToken = superAdminLogin.data.data.token;
    }

    // 4. Token Protected Route & Current Profile
    process.stdout.write('[Check 4/8] Testing Token Protected Route (GET /api/auth/me)... ');
    const noTokenRes = await makeRequest(port, 'GET', '/api/auth/me');
    const validTokenRes = await makeRequest(port, 'GET', '/api/auth/me', null, userToken);

    if (noTokenRes.status === 401 && validTokenRes.status === 200 && validTokenRes.data?.data?.user?.email === testEmail) {
      console.log('PASSED (No token: 401, Valid token: 200)');
    } else {
      console.log('FAILED', { noTokenRes, validTokenRes });
      allPassed = false;
    }

    // 5. Role-Based Authorization Guard (Super Admin vs User)
    process.stdout.write('[Check 5/8] Testing Role Authorization Guard (Super Admin vs User role)... ');
    const forbiddenRes = await makeRequest(port, 'GET', '/api/auth/admin-check', null, userToken);
    const authorizedRes = await makeRequest(port, 'GET', '/api/auth/admin-check', null, superAdminToken);

    if (forbiddenRes.status === 403 && authorizedRes.status === 200) {
      console.log('PASSED (User role: 403 Forbidden, Super Admin role: 200 OK)');
    } else {
      console.log('FAILED', { forbiddenRes, authorizedRes });
      allPassed = false;
    }

    // 6. User Budget Setting Guardrail Check
    process.stdout.write('[Check 6/8] Testing User Budget Limit Update (PATCH /api/users/budget)... ');
    const invalidBudget = await makeRequest(port, 'PATCH', '/api/users/budget', { daily_budget_limit: -50 }, userToken);
    const validBudget = await makeRequest(port, 'PATCH', '/api/users/budget', { daily_budget_limit: 550.00 }, userToken);

    const [dbUser] = await pool.query('SELECT daily_budget_limit FROM users WHERE id = ?', [createdUserId]);
    const storedBudget = parseFloat(dbUser[0]?.daily_budget_limit);

    if (invalidBudget.status === 400 && validBudget.status === 200 && storedBudget === 550.00) {
      console.log('PASSED (Negative budget: 400, Valid: 200, DB: 550.00 BDT)');
    } else {
      console.log('FAILED', { invalidBudget, validBudget, storedBudget });
      allPassed = false;
    }

    // 7. Penalties & Status Query
    process.stdout.write('[Check 7/8] Testing Penalties and Blockade Status (GET /api/users/penalties)... ');
    const penaltiesRes = await makeRequest(port, 'GET', '/api/users/penalties', null, userToken);

    if (penaltiesRes.status === 200 && penaltiesRes.data?.data?.penalty_flags === 0 && penaltiesRes.data?.data?.is_blocked === false) {
      console.log('PASSED (HTTP 200, 0 flags, not blocked)');
    } else {
      console.log('FAILED', penaltiesRes);
      allPassed = false;
    }

    // 8. Notifications Retrieval & Mark as Read
    process.stdout.write('[Check 8/8] Testing Notifications and Read Flag (GET & PATCH /api/users/notifications)... ');
    // Insert a test notification directly into DB
    const [notifResult] = await pool.query(
      'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
      [createdUserId, 'Order Ready', 'Your order is ready for pickup!']
    );
    const notificationId = notifResult.insertId;

    const notifsListRes = await makeRequest(port, 'GET', '/api/users/notifications', null, userToken);
    const markReadRes = await makeRequest(port, 'PATCH', `/api/users/notifications/${notificationId}/read`, null, userToken);

    const [updatedNotif] = await pool.query('SELECT is_read FROM notifications WHERE id = ?', [notificationId]);

    if (
      notifsListRes.status === 200 &&
      notifsListRes.data?.data?.notifications?.length >= 1 &&
      markReadRes.status === 200 &&
      updatedNotif[0]?.is_read === 1
    ) {
      console.log('PASSED (HTTP 200, List count >= 1, is_read = 1 in DB)');
    } else {
      console.log('FAILED', { notifsListRes, markReadRes, updatedNotif });
      allPassed = false;
    }

  } catch (error) {
    console.error('Unexpected error during Phase 2 verification:', error);
    allPassed = false;
  } finally {
    // Clean up test student user and notifications
    if (createdUserId) {
      await pool.query('DELETE FROM notifications WHERE user_id = ?', [createdUserId]);
      await pool.query('DELETE FROM users WHERE id = ?', [createdUserId]);
    }
    testServer.close();
    await pool.end();
  }

  console.log('\n====================================================');
  if (allPassed) {
    console.log('    SUCCESS: ALL PHASE 2 CHECKS PASSED!');
    console.log('====================================================\n');
    process.exit(0);
  } else {
    console.log('    FAILURE: SOME CHECKS FAILED');
    console.log('====================================================\n');
    process.exit(1);
  }
}

verifyPhase2().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
