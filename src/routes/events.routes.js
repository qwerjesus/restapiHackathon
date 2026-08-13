const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/events.controller');

router.get('/', (req, res, next) => eventsController.getEvents(req, res, next));
router.get('/:id', (req, res, next) => eventsController.getEventById(req, res, next));

module.exports = router;
