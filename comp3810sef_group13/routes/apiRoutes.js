const express = require('express');
const router = express.Router();

const api = require('../controllers/todoApiController');

// READ: several query conditions
router.get('/', api.list);
router.get('/stats', api.stats);
router.get('/status/:status', api.byStatus);
router.get('/priority/:priority', api.byPriority);
router.get('/search/:keyword', api.search);
router.get('/:id', api.getById);

// CREATE
router.post('/', api.create);

// UPDATE
router.put('/:id', api.update);

// DELETE
router.delete('/:id', api.remove);

module.exports = router;
