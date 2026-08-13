const placesService = require('../services/places.service');

class PlacesController {
  /**
   * GET /api/places
   */
  async getPlaces(req, res, next) {
    try {
      const { category, source } = req.query;

      const result = await placesService.getPlaces({
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
   * GET /api/places/:id
   */
  async getPlaceById(req, res, next) {
    try {
      const { id } = req.params;
      const place = await placesService.getPlaceById(id);

      return res.status(200).json({
        success: true,
        data: place
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PlacesController();
