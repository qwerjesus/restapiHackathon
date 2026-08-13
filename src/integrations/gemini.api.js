const { GoogleGenAI } = require('@google/genai');
const config = require('../config/config');

class GeminiApi {
  constructor() {
    this.modelName = config.geminiModel || 'gemini-2.5-flash';
  }

  /**
   * Get dynamic client instance using process.env.GEMINI_API_KEY
   */
  getClient() {
    const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const error = new Error('El servicio de recomendaciones no está disponible actualmente.');
      error.statusCode = 503;
      error.code = 'RECOMMENDATION_SERVICE_UNAVAILABLE';
      throw error;
    }
    return new GoogleGenAI({ apiKey });
  }

  /**
   * Generate content with timeout wrapper
   */
  async generateRecommendations(promptText) {
    const ai = this.getClient();
    const timeoutMs = config.geminiTimeoutMs || 10000;

    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const error = new Error('El servicio de recomendaciones no respondió dentro del tiempo límite.');
        error.statusCode = 503;
        error.code = 'RECOMMENDATION_SERVICE_UNAVAILABLE';
        reject(error);
      }, timeoutMs);
    });

    const generatePromise = (async () => {
      try {
        const response = await ai.models.generateContent({
          model: this.modelName,
          contents: promptText,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                recommendations: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      id: { type: 'STRING' },
                      reason: { type: 'STRING' }
                    },
                    required: ['id', 'reason']
                  }
                }
              },
              required: ['recommendations']
            }
          }
        });

        const textResponse = response?.text;
        if (!textResponse) {
          throw new Error('Respuesta vacía recibida del servicio de recomendaciones.');
        }

        const parsed = JSON.parse(textResponse);
        return parsed;
      } catch (err) {
        if (err.code === 'RECOMMENDATION_SERVICE_UNAVAILABLE') {
          throw err;
        }
        const error = new Error('El servicio de recomendaciones no está disponible actualmente.');
        error.statusCode = 503;
        error.code = 'RECOMMENDATION_SERVICE_UNAVAILABLE';
        throw error;
      }
    })();

    try {
      const result = await Promise.race([generatePromise, timeoutPromise]);
      return result;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

module.exports = new GeminiApi();
