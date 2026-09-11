const express = require('express');
const {
  createOrder,
  updateOrderStatus,
  getMyOrders,
  getCanteenOrders,
  getOrderById
} = require('../controllers/orderController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRoles, requireCanteenAccess } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(verifyToken);

// Customer endpoints
router.post('/', createOrder);
router.get('/my-orders', getMyOrders);

// Kitchen / Admin order board
router.get(
  '/canteen/:canteenId',
  requireRoles('super_admin', 'local_admin', 'kitchen_staff'),
  requireCanteenAccess('params'),
  getCanteenOrders
);

// Order state transition
router.patch('/:id/status', updateOrderStatus);

// Single order details
router.get('/:id', getOrderById);

module.exports = router;
