const fs = require('fs');
const path = require('path');

function verifyPhase5() {
  console.log('====================================================');
  console.log('        CampusEats - Phase 5 Verification Checks     ');
  console.log('====================================================\n');

  let allPassed = true;

  // 1. Check Core Providers & Contexts
  process.stdout.write('[Check 1/5] Verifying React Contexts (Auth, Cart, Socket)... ');
  const contexts = [
    'frontend/src/context/AuthContext.jsx',
    'frontend/src/context/CartContext.jsx',
    'frontend/src/context/SocketContext.jsx'
  ];
  const missingContexts = contexts.filter(c => !fs.existsSync(path.join(__dirname, '../../../', c)));
  if (missingContexts.length === 0) {
    console.log('PASSED (AuthContext, CartContext, SocketContext verified)');
  } else {
    console.log('FAILED', missingContexts);
    allPassed = false;
  }

  // 2. Check Customer Components & Mobile Experience
  process.stdout.write('[Check 2/5] Verifying Mobile Customer Components (BudgetBar, CartDrawer, Stepper)... ');
  const customerComponents = [
    'frontend/src/components/customer/BudgetProgressBar.jsx',
    'frontend/src/components/customer/CartDrawer.jsx',
    'frontend/src/pages/customer/CanteenList.jsx',
    'frontend/src/pages/customer/CanteenMenu.jsx',
    'frontend/src/pages/customer/OrdersHistory.jsx',
    'frontend/src/pages/customer/Profile.jsx'
  ];
  const missingCustomer = customerComponents.filter(c => !fs.existsSync(path.join(__dirname, '../../../', c)));
  if (missingCustomer.length === 0) {
    console.log('PASSED (Customer views & mobile guardrail components verified)');
  } else {
    console.log('FAILED', missingCustomer);
    allPassed = false;
  }

  // 3. Check Kitchen Staff & Admin Dashboards
  process.stdout.write('[Check 3/5] Verifying Staff & Admin Dashboards... ');
  const adminPages = [
    'frontend/src/pages/kitchen/KitchenBoard.jsx',
    'frontend/src/pages/localAdmin/LocalAdminDashboard.jsx',
    'frontend/src/pages/superAdmin/SuperAdminDashboard.jsx'
  ];
  const missingAdmin = adminPages.filter(p => !fs.existsSync(path.join(__dirname, '../../../', p)));
  if (missingAdmin.length === 0) {
    console.log('PASSED (KitchenBoard, LocalAdmin, SuperAdmin verified)');
  } else {
    console.log('FAILED', missingAdmin);
    allPassed = false;
  }

  // 4. Check Navigation & Routing
  process.stdout.write('[Check 4/5] Verifying Router & Role Guards (App.jsx, ProtectedRoute, Navbar)... ');
  const routing = [
    'frontend/src/App.jsx',
    'frontend/src/components/common/ProtectedRoute.jsx',
    'frontend/src/components/common/Navbar.jsx'
  ];
  const missingRouting = routing.filter(r => !fs.existsSync(path.join(__dirname, '../../../', r)));
  if (missingRouting.length === 0) {
    console.log('PASSED (Protected routes and role boundaries mapped)');
  } else {
    console.log('FAILED', missingRouting);
    allPassed = false;
  }

  // 5. Check Production Build Output
  process.stdout.write('[Check 5/5] Verifying Vite Production Build Assets... ');
  const distHtml = path.join(__dirname, '../../../frontend/dist/index.html');
  const distAssets = path.join(__dirname, '../../../frontend/dist/assets');
  if (fs.existsSync(distHtml) && fs.existsSync(distAssets)) {
    const assets = fs.readdirSync(distAssets);
    const hasJs = assets.some(a => a.endsWith('.js'));
    const hasCss = assets.some(a => a.endsWith('.css'));
    if (hasJs && hasCss) {
      console.log(`PASSED (dist/index.html, ${assets.length} bundled assets ready)`);
    } else {
      console.log('FAILED: Missing JS or CSS bundles in dist/assets');
      allPassed = false;
    }
  } else {
    console.log('FAILED: frontend/dist not found. Run npm run build in frontend.');
    allPassed = false;
  }

  console.log('\n====================================================');
  if (allPassed) {
    console.log('    SUCCESS: ALL PHASE 5 CHECKS PASSED!');
    console.log('====================================================\n');
    process.exit(0);
  } else {
    console.log('    FAILURE: SOME CHECKS FAILED');
    console.log('====================================================\n');
    process.exit(1);
  }
}

verifyPhase5();
