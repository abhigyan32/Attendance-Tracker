const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const admin = require('../controllers/adminController');

const router = express.Router();
router.use(authenticate, authorizeAdmin);
router.get('/setup', admin.getSetupData);
router.post('/departments', body('name').trim().notEmpty(), admin.createDepartment);
router.post('/branches', [
  body('name').trim().notEmpty(), body('addressLine1').trim().notEmpty(),
  body('city').trim().notEmpty(), body('state').trim().notEmpty(), body('pincode').trim().notEmpty(),
  body('latitude').isFloat({ min: -90, max: 90 }), body('longitude').isFloat({ min: -180, max: 180 }),
], admin.createBranch);
router.post('/shifts', [body('name').trim().notEmpty(), body('startTime').notEmpty(), body('endTime').notEmpty()], admin.createShift);
router.get('/holidays', admin.getHolidays);
router.post('/holidays', [body('name').trim().notEmpty(), body('holidayDate').isISO8601()], admin.createHoliday);
router.delete('/holidays/:id', admin.deleteHoliday);
router.put('/rules', body('lateGraceOccurrences').isInt({ min: 0 }), admin.updateRules);
module.exports = router;
