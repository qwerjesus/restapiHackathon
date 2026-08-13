const foodService = require('../services/food.service');

class FoodController {
  /**
   * GET /api/food
   */
  async getFood(req, res, next) {
    try {
      const { category, source } = req.query;

      const result = await foodService.getFood({
        category,
        source
      });

      return res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/food/:id
   */
  async getFoodById(req, res, next) {
    try {
      const { id } = req.params;
      const item = await foodService.getFoodById(id);

      return res.status(200).json({
        success: true,
        data: item
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FoodController();
