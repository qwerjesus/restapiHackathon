const express = require('express');
const router = express.Router();
const foodController = require('../controllers/food.controller');

router.get('/', (req, res, next) => foodController.getFood(req, res, next));
router.get('/:id', (req, res, next) => foodController.getFoodById(req, res, next));

module.exports = router;
