const axios = require('axios');
const config = require('../config/config');

class VisitCartagenaApi {
  constructor() {
    this.client = axios.create({
      baseURL: config.visitCartagenaUrl,
      timeout: config.requestTimeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });
  }

  /**
   * Fetch events from Visit Cartagena backend
   * @param {Object} params
   * @param {string} params.startDate - YYYY-MM-DD
   * @param {string} params.endDate - YYYY-MM-DD
   * @param {string} [params.lang='es']
   * @param {number|string} [params.categoryId]
   */
  async fetchEvents({ startDate, endDate, lang = 'es', categoryId } = {}) {
    try {
      const params = { lang };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (categoryId) params.categoryId = categoryId;

      const response = await this.client.get('/events', { params });
      
      if (response.data && response.data.code === '00') {
        return Array.isArray(response.data.info) ? response.data.info : [];
      }

      return [];
    } catch (error) {
      const err = new Error(`Error fetching events from Visit Cartagena: ${error.message}`);
      err.statusCode = error.response ? 502 : 500;
      err.code = 'SOURCE_UNAVAILABLE';
      throw err;
    }
  }

  /**
   * Fetch event categories from Visit Cartagena backend
   * @param {string} [lang='es']
   */
  async fetchEventCategories(lang = 'es') {
    try {
      const response = await this.client.get('/eventCategory', {
        params: { lang }
      });
      if (response.data && response.data.code === '00') {
        return Array.isArray(response.data.info) ? response.data.info : [];
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Fetch places/experiences from Visit Cartagena backend
   * @param {string} [lang='es']
   */
  async fetchPlaces(lang = 'es') {
    try {
      const response = await this.client.get('/place/experience/home', {
        params: { lang }
      });

      if (response.data && response.data.code === '00') {
        return Array.isArray(response.data.info) ? response.data.info : [];
      }

      return [];
    } catch (error) {
      const err = new Error(`Error fetching places from Visit Cartagena: ${error.message}`);
      err.statusCode = error.response ? 502 : 500;
      err.code = 'SOURCE_UNAVAILABLE';
      throw err;
    }
  }
}

module.exports = new VisitCartagenaApi();
