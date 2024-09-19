import React, { useEffect, useRef } from 'react';
// Import streets.gl via CDN or directly in your HTML if it's not in npm

const markersData = [
  {
    name: "Marker 1",
    description: "This is the first marker",
    coordinates: [-74.006, 40.7128]
  },
  {
    name: "Marker 2",
    description: "This is the second marker",
    coordinates: [-74.001, 40.7132]
  }
];

const MapComponent = () => {
  const mapContainer = useRef(null);  // Reference to the map container
  const map = useRef(null);           // Reference to streets.gl map

  useEffect(() => {
    if (map.current) return; // initialize map only once

    // Initialize streets.gl map
    map.current = new StreetsGL.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
      center: [-74.006, 40.7128],
      zoom: 14,
      pitch: 45,
      bearing: -15,
    });

    // Add markers to the map when it's loaded
    map.current.on('load', () => {
      addMarkersToMap(map.current, markersData);
    });
  }, []);

  // Function to add markers dynamically to the map
  const addMarkersToMap = (mapInstance, markers) => {
    markers.forEach((marker) => {
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.backgroundImage = 'url(https://placekitten.com/g/30/30)';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.cursor = 'pointer';

      const popup = new StreetsGL.Popup({ offset: 25 })
        .setHTML(`<h3>${marker.name}</h3><p>${marker.description}</p>`);

      // Add marker to the map
      new StreetsGL.Marker(el)
        .setLngLat(marker.coordinates)
        .setPopup(popup) // Attach popups
        .addTo(mapInstance);
    });
  };

  return (
    <div>
      <div ref={mapContainer} style={{ width: '100%', height: '100vh' }} />
    </div>
  );
};

export default MapComponent;