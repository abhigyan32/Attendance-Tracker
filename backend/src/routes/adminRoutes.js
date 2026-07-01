const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const admin = require('../controllers/adminController');

const router = express.Router();
router.use(authenticate, authorizeAdmin);

router.get('/setup', admin.getSetupData);

router.post('/departments', body('name').trim().notEmpty(), admin.createDepartment);
router.put('/departments/:id', body('name').trim().notEmpty(), admin.updateDepartment);
router.delete('/departments/:id', admin.deleteDepartment);

const branchValidation = [
  body('name').trim().notEmpty(),
  body('addressLine1').trim().notEmpty(),
  body('city').trim().notEmpty(),
  body('state').trim().notEmpty(),
  body('pincode').trim().notEmpty(),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
];
router.post('/branches', branchValidation, admin.createBranch);
router.put('/branches/:id', branchValidation, admin.updateBranch);
router.delete('/branches/:id', admin.deleteBranch);

const shiftValidation = [
  body('name').trim().notEmpty(),
  body('startTime').notEmpty(),
  body('endTime').notEmpty(),
];
router.post('/shifts', shiftValidation, admin.createShift);
router.put('/shifts/:id', shiftValidation, admin.updateShift);
router.delete('/shifts/:id', admin.deleteShift);

router.get('/holidays', admin.getHolidays);
router.post('/holidays', [body('name').trim().notEmpty(), body('holidayDate').isISO8601()], admin.createHoliday);
router.put('/holidays/:id', [body('name').trim().notEmpty(), body('holidayDate').isISO8601()], admin.updateHoliday);
router.delete('/holidays/:id', admin.deleteHoliday);

router.put('/rules', body('lateGraceOccurrences').isInt({ min: 0 }), admin.updateRules);

module.exports = router;
