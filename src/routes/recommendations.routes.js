const express = require('express');
const router = express.Router();
const recommendationsController = require('../controllers/recommendations.controller');

router.get('/places', (req, res, next) => recommendationsController.getPlaceRecommendations(req, res, next));
router.get('/events', (req, res, next) => recommendationsController.getEventRecommendations(req, res, next));
router.get('/food', (req, res, next) => recommendationsController.getFoodRecommendations(req, res, next));

module.exports = router;
