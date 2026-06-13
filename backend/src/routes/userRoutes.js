const express = require('express');
const multer = require('multer');
const { body } = require('express-validator');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const users = require('../controllers/userController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const userValidation = [
  body('name').trim().notEmpty(), body('email').isEmail().normalizeEmail(),
  body('department').trim().notEmpty(), body('role').isIn(['employee', 'admin']),
  body('weekOffs').optional().isArray(),
];

router.get('/profile', authenticate, users.getProfile);
router.get('/', authenticate, authorizeAdmin, users.getAllUsers);
router.post('/', authenticate, authorizeAdmin, [
  body('employeeId').trim().notEmpty(), body('password').isLength({ min: 6 }), ...userValidation,
], users.createUser);
router.post('/bulk', authenticate, authorizeAdmin, upload.single('file'), users.bulkCreateUsers);
router.put('/:id', authenticate, authorizeAdmin, userValidation, users.updateUser);
router.put('/:id/reset-password', authenticate, authorizeAdmin,
  body('password').isLength({ min: 6 }), users.resetPassword);
router.patch('/:id/disable', authenticate, authorizeAdmin, users.disableUser);
module.exports = router;
