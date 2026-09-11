const express = require('express');
const {
  getAllCanteens,
  getCanteenById,
  createCanteen,
  updateCanteen,
  assignLocalAdmin,
  getCanteenStaff,
  createCanteenStaff
} = require('../controllers/canteenController');
const { getMenuByCanteen } = require('../controllers/menuController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRoles, requireCanteenAccess } = require('../middleware/roleMiddleware');

const router = express.Router();

// Public / Authenticated read routes
router.get('/', getAllCanteens);
router.get('/:id', getCanteenById);
router.get('/:canteenId/menu', getMenuByCanteen);

// Super Admin only routes
router.post('/', verifyToken, requireRoles('super_admin'), createCanteen);
router.post('/:id/local-admin', verifyToken, requireRoles('super_admin'), assignLocalAdmin);

// Super Admin & Local Admin of that canteen routes
router.put('/:id', verifyToken, requireRoles('super_admin', 'local_admin'), requireCanteenAccess('params'), updateCanteen);
router.get('/:id/staff', verifyToken, requireRoles('super_admin', 'local_admin'), requireCanteenAccess('params'), getCanteenStaff);
router.post('/:id/staff', verifyToken, requireRoles('super_admin', 'local_admin'), requireCanteenAccess('params'), createCanteenStaff);

module.exports = router;
