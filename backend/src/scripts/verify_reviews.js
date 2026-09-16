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

async function verifyReviews() {
  console.log('====================================================');
  console.log('      CampusEats - Review System Verification        ');
  console.log('====================================================\n');

  const testServer = http.createServer(app);
  await new Promise((resolve) => testServer.listen(0, resolve));
  const port = testServer.address().port;

  let allPassed = true;

  try {
    // 1. Authenticate as Rahim (student)
    process.stdout.write('[Test 1/7] Authenticating as student Rahim... ');
    const loginRes = await makeRequest(port, 'POST', '/api/auth/login', {
      email: 'student.rahim@campuseats.com',
      password: 'password123'
    });

    if (loginRes.status !== 200 || !loginRes.data?.data?.token) {
      console.log('FAILED');
      console.error('  Login response:', loginRes);
      process.exit(1);
    }
    const token = loginRes.data.data.token;
    const studentUser = loginRes.data.data.user;
    console.log(`PASSED (User ID: ${studentUser.id})`);

    // Clean any prior reviews from Rahim for clean test run
    await pool.query('DELETE FROM reviews WHERE user_id = ?', [studentUser.id]);

    // 2. Guardrail Check: Attempt to review an item NEVER ordered (item 140 exists in menu but Rahim never ordered it)
    process.stdout.write('[Test 2/7] Guardrail: Reject review for non-ordered item... ');
    const nonDeliveredRes = await makeRequest(port, 'POST', '/api/reviews', {
      menu_item_id: 140,
      rating: 5,
      comment: 'I never ordered this but trying to review it!'
    }, token);

    if (nonDeliveredRes.status === 403 && nonDeliveredRes.data.error_code === 'NOT_DELIVERED') {
      console.log('PASSED (Correctly blocked with 403 NOT_DELIVERED)');
    } else {
      console.log('FAILED');
      console.error('  Unexpected response:', nonDeliveredRes);
      allPassed = false;
    }

    // 3. Submit valid review for delivered item (item 150 was ordered and picked up in order 45)
    process.stdout.write('[Test 3/7] Submit review for delivered item #150 (Boiled Egg)... ');
    const validReviewRes = await makeRequest(port, 'POST', '/api/reviews', {
      menu_item_id: 150,
      rating: 5,
      comment: 'Fresh, hot and perfectly boiled!'
    }, token);

    if (validReviewRes.status === 201 && validReviewRes.data.status === 'success') {
      console.log(`PASSED (Review ID: ${validReviewRes.data.data.review.id}, Avg Rating: ${validReviewRes.data.data.item_stats.avg_rating})`);
    } else {
      console.log('FAILED');
      console.error('  Unexpected response:', validReviewRes);
      allPassed = false;
    }

    // 4. Duplicate Guardrail Check: User attempts to review item #150 a second time
    process.stdout.write('[Test 4/7] Guardrail: Reject duplicate review for same item... ');
    const duplicateRes = await makeRequest(port, 'POST', '/api/reviews', {
      menu_item_id: 150,
      rating: 4,
      comment: 'Trying to review again'
    }, token);

    if (duplicateRes.status === 400 && duplicateRes.data.error_code === 'ALREADY_REVIEWED') {
      console.log('PASSED (Correctly blocked with 400 ALREADY_REVIEWED)');
    } else {
      console.log('FAILED');
      console.error('  Unexpected response:', duplicateRes);
      allPassed = false;
    }

    // 5. Query /api/menu and verify average rating and review count
    process.stdout.write('[Test 5/7] Verify item average rating on /api/menu... ');
    const menuRes = await makeRequest(port, 'GET', '/api/menu?canteen_id=11');
    const items = menuRes.data?.data?.items || [];
    const item150 = items.find(i => i.id === 150);

    if (item150 && item150.avg_rating === 5 && item150.review_count === 1) {
      console.log(`PASSED (Item 150 avg_rating: ${item150.avg_rating}, review_count: ${item150.review_count})`);
    } else {
      console.log('FAILED');
      console.error('  Item 150 data:', item150);
      allPassed = false;
    }

    // 6. Query item reviews public endpoint /api/reviews/item/150
    process.stdout.write('[Test 6/7] Verify /api/reviews/item/150 endpoint... ');
    const itemRevRes = await makeRequest(port, 'GET', '/api/reviews/item/150');
    const itemData = itemRevRes.data?.data?.item;
    const revs = itemRevRes.data?.data?.reviews || [];

    if (itemRevRes.status === 200 && itemData?.avg_rating === 5 && revs.length === 1 && revs[0].reviewer_name) {
      console.log(`PASSED (Reviewer: ${revs[0].reviewer_name}, Rating: ${revs[0].rating})`);
    } else {
      console.log('FAILED');
      console.error('  Response:', itemRevRes);
      allPassed = false;
    }

    // 7. Verify /api/orders/my-orders returns has_reviewed flag on order items
    process.stdout.write('[Test 7/7] Verify /api/orders/my-orders has review annotations... ');
    const ordersRes = await makeRequest(port, 'GET', '/api/orders/my-orders', null, token);
    const myOrders = ordersRes.data?.data?.orders || [];
    const order45 = myOrders.find(o => o.id === 45);
    const orderItem150 = order45?.items?.find(i => i.menu_item_id === 150);

    if (orderItem150 && orderItem150.has_reviewed === true && orderItem150.user_rating === 5) {
      console.log('PASSED (has_reviewed: true, user_rating: 5)');
    } else {
      console.log('FAILED');
      console.error('  OrderItem150:', orderItem150);
      allPassed = false;
    }

  } catch (err) {
    console.error('Error during verification:', err);
    allPassed = false;
  } finally {
    testServer.close();
    await pool.end();
  }

  console.log('\n====================================================');
  if (allPassed) {
    console.log('    SUCCESS: ALL 7 REVIEW SYSTEM CHECKS PASSED!     ');
    console.log('====================================================\n');
    process.exit(0);
  } else {
    console.log('    FAILURE: SOME CHECKS FAILED                     ');
    console.log('====================================================\n');
    process.exit(1);
  }
}

verifyReviews().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
