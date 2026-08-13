const express = require('express');
const router = express.Router();
const placesController = require('../controllers/places.controller');

router.get('/', (req, res, next) => placesController.getPlaces(req, res, next));
router.get('/:id', (req, res, next) => placesController.getPlaceById(req, res, next));

module.exports = router;
