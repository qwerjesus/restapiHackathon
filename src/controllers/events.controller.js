const eventsService = require('../services/events.service');

class EventsController {
  /**
   * GET /api/events
   */
  async getEvents(req, res, next) {
    try {
      const { category, date, source, startDate, endDate } = req.query;

      const result = await eventsService.getEvents({
        category,
        date,
        source,
        startDate,
        endDate
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
   * GET /api/events/:id
   */
  async getEventById(req, res, next) {
    try {
      const { id } = req.params;
      const event = await eventsService.getEventById(id);

      return res.status(200).json({
        success: true,
        data: event
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EventsController();
