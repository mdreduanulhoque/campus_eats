const express = require('express');
const {
  getAllMenuItems,
  getMenuItemById,
  compareMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability
} = require('../controllers/menuController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// Public / Authenticated read routes
router.get('/', getAllMenuItems);
router.get('/compare', compareMenuItems);
router.get('/:id', getMenuItemById);

// Admin operations (Local admin of that canteen or Super admin)
router.post('/', verifyToken, requireRoles('super_admin', 'local_admin'), createMenuItem);
router.put('/:id', verifyToken, requireRoles('super_admin', 'local_admin'), updateMenuItem);
router.delete('/:id', verifyToken, requireRoles('super_admin', 'local_admin'), deleteMenuItem);

// Stock availability toggle (Kitchen staff, Local admin, Super admin)
router.patch('/:id/availability', verifyToken, requireRoles('super_admin', 'local_admin', 'kitchen_staff'), toggleAvailability);

module.exports = router;
