const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const {
  checkIn,
  checkOut,
  getTodayStatus,
  getHistory,
  getAdminDashboard,
  getAdminAttendance,
  exportAttendance,
} = require('../controllers/attendanceController');

const router = express.Router();

const locationValidation = [
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required.'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required.'),
  body('accuracy').optional().isFloat({ min: 0 }),
];

router.post(
  '/check-in',
  authenticate,
  [
    ...locationValidation,
    body('selfie').optional().isString(),
  ],
  checkIn
);

router.post('/check-out', authenticate, [
  ...locationValidation,
  body('selfie').isString().notEmpty().withMessage('Checkout photo is required.'),
], checkOut);

router.get('/today', authenticate, getTodayStatus);

router.get('/history', authenticate, getHistory);

router.get('/admin/dashboard', authenticate, authorizeAdmin, getAdminDashboard);

router.get('/admin/records', authenticate, authorizeAdmin, getAdminAttendance);

router.get('/admin/export', authenticate, authorizeAdmin, exportAttendance);

module.exports = router;
