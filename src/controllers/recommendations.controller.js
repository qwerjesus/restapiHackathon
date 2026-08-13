const recommendationsService = require('../services/recommendations.service');

class RecommendationsController {
  /**
   * GET /api/recommendations/places
   */
  async getPlaceRecommendations(req, res, next) {
    try {
      const { category, interest, limit } = req.query;
      const result = await recommendationsService.getRecommendations({
        type: 'places',
        category,
        interest,
        limit
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
   * GET /api/recommendations/events
   */
  async getEventRecommendations(req, res, next) {
    try {
      const { category, interest, limit } = req.query;
      const result = await recommendationsService.getRecommendations({
        type: 'events',
        category,
        interest,
        limit
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
   * GET /api/recommendations/food
   */
  async getFoodRecommendations(req, res, next) {
    try {
      const { category, interest, limit } = req.query;
      const result = await recommendationsService.getRecommendations({
        type: 'food',
        category,
        interest,
        limit
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
}

module.exports = new RecommendationsController();
