const router = require('express').Router();
const { listServices, getService } = require('../controllers/serviceController');

router.get('/', listServices);
router.get('/:id', getService);

module.exports = router;
