const http = require('http');
const { pool } = require('../config/db');
const app = require('../app');
const { checkNoShowOrders } = require('../services/cronService');

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

function getValidPickupTime() {
  const now = new Date();
  // Get time in Dhaka or local timezone
  const pickup = new Date(now.getTime() + 45 * 60 * 1000); // 45 mins from now
  const hours = pickup.getHours();
  // If before 7:00 AM (e.g. 5:00 AM or 6:00 AM), set to today 07:45 AM if within 2h
  if (hours < 7) {
    pickup.setHours(7, 30, 0, 0);
  } else if (hours >= 19) {
    // If after 7 PM, set to 18:30 today
    pickup.setHours(18, 30, 0, 0);
  }
  return pickup.toISOString();
}

async function verifyMultiCanteen() {
  console.log('====================================================');
  console.log('   CampusEats - Multi-Canteen & Cross-Pickup Verification');
  console.log('====================================================\n');

  const testServer = http.createServer(app);
  await new Promise((resolve) => testServer.listen(0, resolve));
  const port = testServer.address().port;

  let allPassed = true;

  try {
    // 1. Setup logins and staff
    const login = async (email) => {
      const res = await makeRequest(port, 'POST', '/api/auth/login', { email, password: 'password123' });
      return res.data?.data?.token;
    };

    const studentToken = await login('student.rahim@campuseats.com');
    const meRes = await makeRequest(port, 'GET', '/api/auth/me', null, studentToken);
    const studentUser = meRes.data.data.user;
    const testUserId = studentUser.id;

    // Ensure Canteen 9 and Canteen 11 exist and are open
    const [canteen9] = await pool.query("SELECT id, name FROM canteens WHERE id = 9");
    const [canteen11] = await pool.query("SELECT id, name FROM canteens WHERE id = 11");
    if (canteen9.length === 0 || canteen11.length === 0) {
      throw new Error("Required canteens (9: Khan's Kitchen, 11: Cafe Neptune) not found.");
    }

    await pool.query("UPDATE canteens SET is_open = TRUE WHERE id IN (9, 11)");

    // Ensure staff exists for Canteen 9 and Canteen 11
    const validHash = '$2a$10$EBT9oMLqm1d6vu8zDE1FDOMNy2eF4fi98yD57rAWY1l1.ZxJG9cum';
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, canteen_id)
       VALUES ('Khan Staff', 'staff.khan@campuseats.com', ?, 'kitchen_staff', 9)
       ON DUPLICATE KEY UPDATE canteen_id = 9, role = 'kitchen_staff', password_hash = ?`,
      [validHash, validHash]
    );
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, canteen_id)
       VALUES ('Neptune Staff', 'staff.neptune@campuseats.com', ?, 'kitchen_staff', 11)
       ON DUPLICATE KEY UPDATE canteen_id = 11, role = 'kitchen_staff', password_hash = ?`,
      [validHash, validHash]
    );

    const staff9Token = await login('staff.khan@campuseats.com');
    const staff11Token = await login('staff.neptune@campuseats.com');

    // Get menu items for both canteens
    const [item9Rows] = await pool.query("SELECT id, name, price FROM menu_items WHERE canteen_id = 9 AND is_available = TRUE LIMIT 1");
    const [item11Rows] = await pool.query("SELECT id, name, price FROM menu_items WHERE canteen_id = 11 AND is_available = TRUE LIMIT 1");

    const item9 = item9Rows[0];
    const item11 = item11Rows[0];
    console.log(`Test Items: [Canteen 9: ${item9.name} (${item9.price} BDT)] & [Canteen 11: ${item11.name} (${item11.price} BDT)]`);

    // Reset student initial state
    await pool.query(
      'UPDATE users SET daily_budget_limit = 1000.00, loyalty_points = 20, penalty_flags = 0, is_blocked = FALSE WHERE id = ?',
      [testUserId]
    );

    // -------------------------------------------------------------
    // TEST 1: Place a Multi-Canteen Order (Divide into 2 orders with same pickup time)
    // -------------------------------------------------------------
    process.stdout.write('[Check 1/6] Multi-Canteen Checkout automatically divided with identical pickup time... ');
    const requestedPickup = getValidPickupTime();

    const checkoutRes = await makeRequest(port, 'POST', '/api/orders', {
      items: [
        { menu_item_id: item9.id, quantity: 10 },
        { menu_item_id: item11.id, quantity: 2 }
      ],
      requested_pickup_time: requestedPickup,
      points_to_redeem: 0
    }, studentToken);

    if (
      checkoutRes.status === 201 &&
      checkoutRes.data?.data?.orders?.length === 2 &&
      checkoutRes.data?.data?.order_group_id
    ) {
      const orders = checkoutRes.data.data.orders;
      const orderCanteen9 = orders.find(o => o.canteen_id === 9);
      const orderCanteen11 = orders.find(o => o.canteen_id === 11);

      const samePickup = new Date(orderCanteen9.requested_pickup_time).getTime() === new Date(orderCanteen11.requested_pickup_time).getTime();
      const sameGroup = orderCanteen9.order_group_id === orderCanteen11.order_group_id;

      if (orderCanteen9 && orderCanteen11 && samePickup && sameGroup) {
        console.log(`PASSED (Orders #${orderCanteen9.id} & #${orderCanteen11.id} created under Group ${checkoutRes.data.data.order_group_id})`);
      } else {
        console.log('FAILED: Orders metadata mismatched', { orderCanteen9, orderCanteen11 });
        allPassed = false;
      }
    } else {
      console.log('FAILED', checkoutRes);
      allPassed = false;
    }

    const order1Id = checkoutRes.data?.data?.orders?.find(o => o.canteen_id === 9)?.id;
    const order2Id = checkoutRes.data?.data?.orders?.find(o => o.canteen_id === 11)?.id;
    const orderGroupId = checkoutRes.data?.data?.order_group_id;

    // -------------------------------------------------------------
    // TEST 2: Kitchen Order Isolation
    // -------------------------------------------------------------
    process.stdout.write('[Check 2/6] Kitchen Boards Isolation for Split Orders... ');
    const board9Res = await makeRequest(port, 'GET', '/api/orders/canteen/9', null, staff9Token);
    const board11Res = await makeRequest(port, 'GET', '/api/orders/canteen/11', null, staff11Token);

    const b9HasOrder1 = board9Res.data?.data?.orders?.some(o => o.id === order1Id);
    const b9HasOrder2 = board9Res.data?.data?.orders?.some(o => o.id === order2Id);
    const b11HasOrder1 = board11Res.data?.data?.orders?.some(o => o.id === order1Id);
    const b11HasOrder2 = board11Res.data?.data?.orders?.some(o => o.id === order2Id);

    if (b9HasOrder1 && !b9HasOrder2 && !b11HasOrder1 && b11HasOrder2) {
      console.log('PASSED (Canteen 9 only sees its order; Canteen 11 only sees its order)');
    } else {
      console.log('FAILED', { b9HasOrder1, b9HasOrder2, b11HasOrder1, b11HasOrder2 });
      allPassed = false;
    }

    // -------------------------------------------------------------
    // TEST 3: User picks up food from Canteen 9 ONLY
    // -------------------------------------------------------------
    process.stdout.write('[Check 3/6] User picks up from Canteen 9 (Order 1 -> picked_up)... ');
    // Advance Order 1 to picked_up
    await makeRequest(port, 'PATCH', `/api/orders/${order1Id}/status`, { status: 'accepted' }, staff9Token);
    await makeRequest(port, 'PATCH', `/api/orders/${order1Id}/status`, { status: 'preparing' }, staff9Token);
    await makeRequest(port, 'PATCH', `/api/orders/${order1Id}/status`, { status: 'ready' }, staff9Token);
    const pickup1Res = await makeRequest(port, 'PATCH', `/api/orders/${order1Id}/status`, { status: 'picked_up' }, staff9Token);

    // Advance Order 2 to ready (Kitchen finished food, waiting for user pickup)
    await makeRequest(port, 'PATCH', `/api/orders/${order2Id}/status`, { status: 'accepted' }, staff11Token);
    await makeRequest(port, 'PATCH', `/api/orders/${order2Id}/status`, { status: 'preparing' }, staff11Token);
    await makeRequest(port, 'PATCH', `/api/orders/${order2Id}/status`, { status: 'ready' }, staff11Token);

    const [userAfterPickup1] = await pool.query('SELECT loyalty_points, penalty_flags FROM users WHERE id = ?', [testUserId]);
    const earnedPoints = pickup1Res.data?.data?.points_earned || 0;

    if (pickup1Res.status === 200 && userAfterPickup1[0].loyalty_points === 20 + earnedPoints) {
      console.log(`PASSED (Order #${order1Id} picked up, earned ${earnedPoints} pts, total: ${userAfterPickup1[0].loyalty_points})`);
    } else {
      console.log('FAILED', { pickup1Res, userAfterPickup1 });
      allPassed = false;
    }

    // -------------------------------------------------------------
    // TEST 4: The Core Requirement - User does NOT pick up from Canteen 11!
    // -> Must be treated as an order that was NEVER picked up!
    // -> Order 1 reverted to no_show
    // -> Points revoked
    // -> User receives 1 penalty strike
    // -------------------------------------------------------------
    process.stdout.write('[Check 4/6] Cross-Canteen Abandonment: Order 1 reverted to no_show & points revoked... ');

    // Simulate expiration for Order 2 (requested_pickup_time was > 30 minutes ago)
    await pool.query(
      "UPDATE orders SET requested_pickup_time = DATE_SUB(NOW(), INTERVAL 35 MINUTE) WHERE id IN (?, ?)",
      [order1Id, order2Id]
    );

    // Run the cron job to check for no-show orders
    const cronResult = await checkNoShowOrders();

    // Verify database state
    const [dbOrder1] = await pool.query('SELECT id, status, points_earned FROM orders WHERE id = ?', [order1Id]);
    const [dbOrder2] = await pool.query('SELECT id, status FROM orders WHERE id = ?', [order2Id]);
    const [userAfterCron] = await pool.query('SELECT loyalty_points, penalty_flags, is_blocked FROM users WHERE id = ?', [testUserId]);

    const order1Reverted = dbOrder1[0].status === 'no_show' && dbOrder1[0].points_earned === 0;
    const order2NoShow = dbOrder2[0].status === 'no_show';
    const pointsRevoked = userAfterCron[0].loyalty_points === 20; // Returned to initial 20 pts
    const penaltyApplied = userAfterCron[0].penalty_flags === 1;

    if (order1Reverted && order2NoShow && pointsRevoked && penaltyApplied) {
      console.log(`PASSED!\n   - Order #${order2Id} (Canteen 11): status = 'no_show'\n   - Order #${order1Id} (Canteen 9): reverted to 'no_show', points revoked to 20\n   - Penalty strikes incremented to ${userAfterCron[0].penalty_flags}/3`);
    } else {
      console.log('FAILED', { dbOrder1, dbOrder2, userAfterCron, cronResult });
      allPassed = false;
    }

    // -------------------------------------------------------------
    // TEST 5: Cannot pick up after combined preorder is marked no_show
    // -------------------------------------------------------------
    process.stdout.write('[Check 5/6] Prevent late pickup attempt on no_show group... ');
    const latePickupRes = await makeRequest(port, 'PATCH', `/api/orders/${order1Id}/status`, { status: 'picked_up' }, staff9Token);
    if (latePickupRes.status === 400) {
      console.log('PASSED (Late pickup correctly blocked: status is terminal no_show)');
    } else {
      console.log('FAILED', latePickupRes);
      allPassed = false;
    }

    // -------------------------------------------------------------
    // TEST 6: Successful Multi-Canteen Preorder (Both picked up successfully)
    // -------------------------------------------------------------
    process.stdout.write('[Check 6/6] Full Multi-Canteen Preorder with both picked up successfully... ');
    const checkout2Res = await makeRequest(port, 'POST', '/api/orders', {
      items: [
        { menu_item_id: item9.id, quantity: 1 },
        { menu_item_id: item11.id, quantity: 1 }
      ],
      requested_pickup_time: getValidPickupTime(),
      points_to_redeem: 0
    }, studentToken);

    const fullOrder9Id = checkout2Res.data?.data?.orders?.find(o => o.canteen_id === 9)?.id;
    const fullOrder11Id = checkout2Res.data?.data?.orders?.find(o => o.canteen_id === 11)?.id;

    // Both canteens process and complete
    await makeRequest(port, 'PATCH', `/api/orders/${fullOrder9Id}/status`, { status: 'accepted' }, staff9Token);
    await makeRequest(port, 'PATCH', `/api/orders/${fullOrder9Id}/status`, { status: 'preparing' }, staff9Token);
    await makeRequest(port, 'PATCH', `/api/orders/${fullOrder9Id}/status`, { status: 'ready' }, staff9Token);
    await makeRequest(port, 'PATCH', `/api/orders/${fullOrder9Id}/status`, { status: 'picked_up' }, staff9Token);

    await makeRequest(port, 'PATCH', `/api/orders/${fullOrder11Id}/status`, { status: 'accepted' }, staff11Token);
    await makeRequest(port, 'PATCH', `/api/orders/${fullOrder11Id}/status`, { status: 'preparing' }, staff11Token);
    await makeRequest(port, 'PATCH', `/api/orders/${fullOrder11Id}/status`, { status: 'ready' }, staff11Token);
    await makeRequest(port, 'PATCH', `/api/orders/${fullOrder11Id}/status`, { status: 'picked_up' }, staff11Token);

    const [dbFull9] = await pool.query('SELECT status FROM orders WHERE id = ?', [fullOrder9Id]);
    const [dbFull11] = await pool.query('SELECT status FROM orders WHERE id = ?', [fullOrder11Id]);
    const [userFinal] = await pool.query('SELECT loyalty_points, penalty_flags FROM users WHERE id = ?', [testUserId]);

    if (dbFull9[0].status === 'picked_up' && dbFull11[0].status === 'picked_up' && userFinal[0].penalty_flags === 1) {
      console.log(`PASSED (Both orders remain 'picked_up', loyalty points credited, no extra penalties)`);
    } else {
      console.log('FAILED', { dbFull9, dbFull11, userFinal });
      allPassed = false;
    }

  } catch (err) {
    console.error('Fatal Multi-Canteen verification error:', err);
    allPassed = false;
  } finally {
    testServer.close();
  }

  console.log('\n====================================================');
  if (allPassed) {
    console.log('    SUCCESS: ALL MULTI-CANTEEN CHECKS PASSED!       ');
  } else {
    console.log('    FAILURE: SOME CHECKS FAILED                     ');
  }
  console.log('====================================================\n');
  process.exit(allPassed ? 0 : 1);
}

verifyMultiCanteen();
