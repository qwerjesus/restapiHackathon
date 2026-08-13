const test = require('node:test');
const assert = require('node:assert');
const placesService = require('../src/services/places.service');

test('sanitizeCoordinates converts (0,0) and invalid values to null for places', () => {
  assert.deepStrictEqual(placesService.sanitizeCoordinates(0, 0), { latitude: null, longitude: null });
  assert.deepStrictEqual(placesService.sanitizeCoordinates('0.0', '0.0'), { latitude: null, longitude: null });
  assert.deepStrictEqual(placesService.sanitizeCoordinates(10.423265, -75.55159), { latitude: 10.423265, longitude: -75.55159 });
});

test('normalizePlace adheres to the Place Contract in AGENTS.md', () => {
  const raw = {
    id: 1048,
    name: "Palácio de La Inquisición",
    imageUrl: "https://media-cdn.tripadvisor.com/media/photo-m/1280/2b/89/fa/52/caption.jpg",
    location: {
      latitude: 10.423265,
      longitude: -75.55159
    },
    details: {
      description: "Palácio de La Inquisición",
      address: "Plaza de Bolivar"
    },
    categories: [
      { id: 50, name: "Museos" }
    ],
    url: "https://www.tripadvisor.com/Attraction_Review-1048"
  };

  const normalized = placesService.normalizePlace(raw);

  assert.strictEqual(normalized.id, "place-1048");
  assert.strictEqual(normalized.name, "Palácio de La Inquisición");
  assert.strictEqual(normalized.description, "Palácio de La Inquisición");
  assert.strictEqual(normalized.category, "Museos");
  assert.strictEqual(normalized.latitude, 10.423265);
  assert.strictEqual(normalized.longitude, -75.55159);
  assert.strictEqual(normalized.imageUrl, "https://media-cdn.tripadvisor.com/media/photo-m/1280/2b/89/fa/52/caption.jpg");
  assert.strictEqual(normalized.source, "visit-cartagena");
  assert.strictEqual(normalized.sourceUrl, "https://www.tripadvisor.com/Attraction_Review-1048");
});

test('extractPlacesFromCategories deduplicates places across category groups', () => {
  const categoryGroups = [
    {
      id: 37,
      name: "Atracciones",
      places: [
        { id: 1048, name: "Palácio de La Inquisición", location: { latitude: 10.42, longitude: -75.55 } }
      ]
    },
    {
      id: 50,
      name: "Museos",
      places: [
        { id: 1048, name: "Palácio de La Inquisición", location: { latitude: 10.42, longitude: -75.55 } }
      ]
    }
  ];

  const extracted = placesService.extractPlacesFromCategories(categoryGroups);
  assert.strictEqual(extracted.length, 1);
  assert.strictEqual(extracted[0].id, "place-1048");
});
