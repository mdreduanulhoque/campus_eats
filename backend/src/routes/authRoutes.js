const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, getMe);
router.get('/admin-check', verifyToken, requireRoles('super_admin'), (req, res) => {
  res.status(200).json({ status: 'success', message: 'Super admin access verified.' });
});

module.exports = router;
