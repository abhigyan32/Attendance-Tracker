const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const {
  getProfile,
  getAllUsers,
  createUser,
  updateUser,
  disableUser,
} = require('../controllers/userController');

const router = express.Router();

router.get('/profile', authenticate, getProfile);

router.get('/', authenticate, authorizeAdmin, getAllUsers);

router.post(
  '/',
  authenticate,
  authorizeAdmin,
  [
    body('employeeId').trim().notEmpty().withMessage('Employee ID is required.'),
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
    body('department').trim().notEmpty().withMessage('Department is required.'),
    body('role').optional().isIn(['employee', 'admin']).withMessage('Invalid role.'),
  ],
  createUser
);

router.put(
  '/:id',
  authenticate,
  authorizeAdmin,
  [
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
    body('password').optional().isLength({ min: 6 }),
    body('department').optional().trim().notEmpty(),
    body('role').optional().isIn(['employee', 'admin']),
  ],
  updateUser
);

router.patch('/:id/disable', authenticate, authorizeAdmin, disableUser);

module.exports = router;
