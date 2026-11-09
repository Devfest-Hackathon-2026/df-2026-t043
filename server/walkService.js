'use strict';

const { randomUUID } = require('node:crypto');

const walkPlaces = [
  { id: 'asakusa', name: '浅草', position: { lat: 35.711, lng: 139.796 } },
  { id: 'yokohama', name: '横浜', position: { lat: 35.443, lng: 139.649 } },
  { id: 'kyoto', name: '京都', position: { lat: 35.003, lng: 135.778 } },
];

function createWalk(placeId, guideId) {
  const place = walkPlaces.find(({ id }) => id === placeId);
  if (!place) return null;
  return {
    sessionId: randomUUID(),
    guideId,
    placeId,
    pano: null,
    position: place.position,
    pov: { heading: 0, pitch: 0 },
    zoom: 1,
    revision: 0,
  };
}

function inRange(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function readWalkView({ position, pov, zoom }) {
  if (!inRange(position?.lat, -90, 90) || !inRange(position?.lng, -180, 180)
    || !inRange(pov?.heading, 0, 360) || !inRange(pov?.pitch, -90, 90)
    || !inRange(zoom, 0, 5)) return null;
  return {
    position: { lat: position.lat, lng: position.lng },
    pov: { heading: pov.heading, pitch: pov.pitch },
    zoom,
  };
}

module.exports = { walkPlaces, createWalk, readWalkView };
