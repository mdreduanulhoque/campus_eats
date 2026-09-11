const express = require('express');
const {
  unblockUser,
  getPenalizedUsers,
  getCanteenAnalytics
} = require('../controllers/adminController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRoles, requireCanteenAccess } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(verifyToken);
router.use(requireRoles('super_admin', 'local_admin'));

// Penalties management
router.get('/users/penalized', getPenalizedUsers);
router.patch('/users/:id/unblock', unblockUser);

// Canteen Analytics
router.get('/analytics/:canteenId', requireCanteenAccess('params'), getCanteenAnalytics);

module.exports = router;
