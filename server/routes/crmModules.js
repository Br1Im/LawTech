/**
 * CRM модули: cases, expenses, arrivals, materials, employees, join_requests
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const c = require('../controllers/crmModules');

router.use(authenticateToken);

// CASES
router.get('/office/:officeId/cases', c.cases.list);
router.get('/cases', c.cases.list);
router.post('/cases', c.cases.create);
router.put('/cases/:id', c.cases.update);
router.delete('/cases/:id', c.cases.remove);

// EXPENSES
router.get('/office/:officeId/expenses', c.expenses.list);
router.get('/office/:officeId/expenses/summary', c.expenses.summary);
router.get('/expenses', c.expenses.list);
router.post('/expenses', c.expenses.create);
router.put('/expenses/:id', c.expenses.update);
router.delete('/expenses/:id', c.expenses.remove);

// ARRIVALS
router.get('/office/:officeId/arrivals', c.arrivals.list);
router.get('/office/:officeId/arrivals/summary', c.arrivals.summary);
router.get('/arrivals', c.arrivals.list);
router.post('/arrivals', c.arrivals.create);
router.put('/arrivals/:id', c.arrivals.update);
router.delete('/arrivals/:id', c.arrivals.remove);

// MATERIALS
router.get('/office/:officeId/materials', c.materials.list);
router.get('/materials', c.materials.list);
router.post('/materials', c.materials.create);
router.put('/materials/:id', c.materials.update);
router.delete('/materials/:id', c.materials.remove);

// EMPLOYEES
router.get('/office/:officeId/employees', c.employees.list);
router.get('/employees', c.employees.list);
router.post('/employees', c.employees.create);
router.put('/employees/:id', c.employees.update);
router.delete('/employees/:id', c.employees.remove);

// JOIN REQUESTS
router.get('/office/:officeId/join-requests', c.joinRequests.list);
router.get('/join-requests/status', c.joinRequests.myStatus);
router.post('/join-requests', c.joinRequests.create);
router.put('/join-requests/:id', c.joinRequests.updateStatus);

module.exports = router;
