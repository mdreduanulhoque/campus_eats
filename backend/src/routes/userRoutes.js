const express = require('express');
const {
  getProfile,
  updateBudget,
  getNotifications,
  markNotificationRead,
  getPenalties
} = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes here require authentication
router.use(verifyToken);

router.get('/profile', getProfile);
router.patch('/budget', updateBudget);
router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markNotificationRead);
router.get('/penalties', getPenalties);

module.exports = router;
