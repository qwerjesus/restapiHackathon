const test = require('node:test');
const assert = require('node:assert');
const foodService = require('../src/services/food.service');

test('normalizeFood adheres to the Food Contract in AGENTS.md', () => {
  const raw = {
    id: 3033,
    name: "Bijao Cocina de Autor",
    imageUrl: "https://media-cdn.tripadvisor.com/media/photo-w/2c/3c/b2/20/caption.jpg",
    details: {
      description: "Bijao Cocina de Autor"
    },
    categories: [
      { id: 61, name: "Restaurante" }
    ],
    url: "https://www.tripadvisor.com/Restaurant_Review-3033"
  };

  const normalized = foodService.normalizeFood(raw);

  assert.strictEqual(normalized.id, "food-3033");
  assert.strictEqual(normalized.name, "Bijao Cocina de Autor");
  assert.strictEqual(normalized.description, "Bijao Cocina de Autor");
  assert.strictEqual(normalized.category, "Restaurante");
  assert.deepStrictEqual(normalized.keyIngredients, []);
  assert.strictEqual(normalized.origin, "Cartagena, Caribe Colombiano");
  assert.strictEqual(normalized.imageUrl, "https://media-cdn.tripadvisor.com/media/photo-w/2c/3c/b2/20/caption.jpg");
  assert.strictEqual(normalized.source, "visit-cartagena");
  assert.strictEqual(normalized.sourceUrl, "https://www.tripadvisor.com/Restaurant_Review-3033");
});

test('extractFoodFromCategories filters only food groups', () => {
  const categoryGroups = [
    {
      id: 50,
      name: "Museos",
      places: [
        { id: 1048, name: "Palácio de La Inquisición" }
      ]
    },
    {
      id: 61,
      name: "Restaurante",
      places: [
        { id: 3033, name: "Bijao Cocina de Autor" }
      ]
    },
    {
      id: 48,
      name: "Comida y bebida",
      places: [
        { id: 1265, name: "Omakase By Ajeno Rooftop" }
      ]
    }
  ];

  const extracted = foodService.extractFoodFromCategories(categoryGroups);
  assert.strictEqual(extracted.length, 2);
  assert.ok(extracted.some(item => item.id === 'food-3033'));
  assert.ok(extracted.some(item => item.id === 'food-1265'));
  assert.ok(!extracted.some(item => item.id === 'food-1048'));
});
