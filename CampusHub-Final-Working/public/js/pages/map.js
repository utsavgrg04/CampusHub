const modes = [
  ['DRIVING', 'Driving', 'car'],
  ['WALKING', 'Walking', 'walk'],
  ['BICYCLING', 'Cycling', 'bike'],
  ['TRANSIT', 'Transit', 'transit'],
];

const icon = (name, size = 20) => {
  const paths = {
    car: '<path d="M5 17h14l-1.2-7H6.2L5 17Zm2-7 1.5-4h7L17 10M7 17v2m10-2v2M7 14h.01M17 14h.01"/>',
    walk: '<circle cx="12" cy="4.5" r="1.8"/><path d="m10.5 8 2.8 2-1.1 3.2 3.5 2.3M10.5 8l-2 4.5-3 2m7-1-2.5 6m.4-9.8 3.8-.5 2.2 2.2"/>',
    bike: '<circle cx="6" cy="17" r="3.2"/><circle cx="18" cy="17" r="3.2"/><path d="m6 17 4-7h4l4 7m-8-7 3 7h5m-8-7H7m7 0-1-2h-2"/>',
    transit: '<rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 12h14M8 7h.01M16 7h.01M8 16l-2 3m10-3 2 3"/>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15"/>',
    pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    arrow: '<path d="M21 3 10 14m11-11-7 18-4-7-7-4 18-7Z"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    chevron: '<path d="m7 10 5 5 5-5"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
};

const hasCoords = place => place?.lat !== null && place?.lat !== undefined && place?.lat !== ''
  && place?.lng !== null && place?.lng !== undefined && place?.lng !== ''
  && Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng))
  && Math.abs(Number(place.lat)) <= 90 && Math.abs(Number(place.lng)) <= 180;
const isPhysical = place => place?.venue && !/^(online|virtual|remote|zoom(?: meeting)?|microsoft teams|google meet)(?:\b|$)/i.test(String(place.venue).trim());
const safe = value => window.esc(value || '');
const formatDistance = value => value == null ? 'Set your location to calculate distance' : `${value < 10 ? value.toFixed(1) : Math.round(value)} km away`;

function campusIllustration() {
  return `<svg class="map-hero-art" viewBox="0 0 900 190" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><path fill="#fff" opacity=".62" d="M38 66q20-30 42 0 20-30 43 0h-85m236-32q20-28 41 0 22-28 43 0h-84m390 28q19-30 42 0 21-29 43 0h-85"/><path fill="#dceba4" d="M0 170q119-54 232 0t232-3q130-57 249 0t187-4v27H0Z"/><g fill="#aecaf1"><path d="M16 182q-22-65 7-103 28 49 8 103m66 2q-18-59 9-91 28 46 8 91m667-4q-17-66 11-103 29 55 9 103m78 5q-12-58 12-92 26 48 8 92"/><path fill="#92b4e8" d="M28 187V83m68 101V95m674 1v92m80 0V99"/></g><g fill="#7398da"><path d="M300 179V78h246v101zm-22-99 145-61 145 61z"/><path fill="#fff" d="M398 179v-48q0-24 24-24t24 24v48z"/><path fill="#dce9ff" d="M329 98h20v26h-20zm46 0h20v26h-20zm94 0h20v26h-20zm-140 42h20v24h-20zm46 0h20v24h-20zm94 0h20v24h-20z"/><path d="M418 101V32h5v69m0-67h43l-43 23z" fill="#5080cf"/></g><g fill="#78a98c"><path d="M610 178q-18-52 0-92 20 45 6 92m53 2q-13-64 11-106 25 51 7 106m120 1q-15-56 11-97 26 48 8 97"/></g><g stroke="#4f9b83" stroke-width="4"><path d="M616 180V92m55 89V75m128 105V84"/></g></svg>`;
}

export function register(R, A) {
  let selectedId = null;
  let searchQuery = '';
  let mode = 'DRIVING';
  let mapType = 'streets';
  let mapInstance = null;
  let tileLayer = null;
  let markerById = new Map();
  let userMarker = null;
  let routeLayer = null;
  let currentPosition = null;
  let directionsRequested = false;
  let geolocationRequested = false;
  let routeCache = new Map();
  let routePending = new Set();
  let geocodingCount = 0;
  let mapResizeObserver = null;
  let routeRequest = 0;
  window.addEventListener('campushub:logout', () => { routeRequest++;mapResizeObserver?.disconnect();mapInstance?.remove();mapInstance=null;tileLayer=null;currentPosition=null;selectedId=null;routeCache.clear();geolocationRequested=false; });

  const events = () => [...(window.EV || [])].filter(event => event.title && isPhysical(event));
  const locatedEvents = () => events().filter(hasCoords);
  const getDistance = event => !hasCoords(event) || !currentPosition ? null
    : Number(window.km(currentPosition.lat, currentPosition.lng, Number(event.lat), Number(event.lng)));
  const orderedEvents = () => [...events()].sort((a, b) => (getDistance(a) ?? Infinity) - (getDistance(b) ?? Infinity));
  const visibleEvents = () => orderedEvents().filter(event => `${event.title} ${event.venue || ''} ${event.dept || ''}`.toLowerCase().includes(searchQuery.trim().toLowerCase()));
  const selected = () => events().find(event => String(event.id) === String(selectedId)) || visibleEvents()[0] || events()[0] || null;
  const routeKey = (place, travelMode = mode) => `${place?.id}:${travelMode}:${currentPosition?.lat}:${currentPosition?.lng}`;
  const formatDuration = seconds => {
    if (!Number.isFinite(seconds)) return '';
    const minutes = Math.round(seconds / 60);
    return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
  };
  const formatRouteDistance = metres => Number.isFinite(metres)
    ? (metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`) : '';

  function nearbyList() {
    const list = visibleEvents();
    if (!list.length) return '<p class="map-empty">No physical event venues match your search.</p>';
    return list.slice(0, 5).map(event => `<button class="map-place-row ${String(event.id) === String(selected()?.id) ? 'active' : ''}" type="button" data-select-place="${safe(event.id)}"><span class="map-place-thumb">${icon('map', 25)}</span><span class="map-place-copy"><b>${safe(event.title)}</b><small>${safe(event.venue || 'Venue not specified')}</small><small>${hasCoords(event) ? formatDistance(getDistance(event)) : 'Location not verified yet'}</small></span><span class="map-row-directions">${icon('arrow', 16)} Directions</span></button>`).join('');
  }

  function details() {
    const place = selected();
    if (!place) return '<div class="map-detail-empty"><span>No physical venues yet</span><p>Published events with a physical venue will appear here.</p></div>';
    const route = routeCache.get(routeKey(place));
    const routeSummary = route?.summary;
    const distance = getDistance(place);
    const routeLabel = routeSummary ? `${formatRouteDistance(routeSummary.distance)} · ${formatDuration(routeSummary.duration)}` : '';
    return `<div class="map-detail-banner">${campusIllustration()}</div><div class="map-detail-content"><span class="map-detail-kicker">SELECTED VENUE</span><h2>${safe(place.title)}</h2><p class="map-detail-distance">${icon('pin', 19)} ${routeLabel || formatDistance(distance)}</p><p class="map-detail-venue">${safe(place.venue || 'Venue not specified')}</p><button class="map-directions-button" type="button" data-directions="${safe(place.id)}" ${hasCoords(place) && currentPosition ? '' : 'disabled'}>${icon('arrow', 18)} Get directions</button><div class="map-detail-options"><div class="map-detail-options-head"><b>Travel options</b>${icon('chevron', 17)}</div>${modes.map(([value, label, glyph]) => { const optionRoute = routeCache.get(routeKey(place, value)); const optionSummary = optionRoute?.summary; const optionLabel = optionSummary ? `${formatRouteDistance(optionSummary.distance)} · ${formatDuration(optionSummary.duration)}` : routePending.has(routeKey(place, value)) ? 'Calculating…' : currentPosition ? 'Select for route' : 'Set start location'; return `<button class="map-travel-option ${mode === value ? 'active' : ''}" type="button" data-mode="${value}" ${hasCoords(place) ? '' : 'disabled'}><span>${icon(glyph, 21)} ${label}</span><small>${safe(optionLabel)}</small></button>`; }).join('')}</div></div>`;
  }

  function setStatus(message) {
    const status = document.querySelector('.map-surface-status');
    if (status) status.textContent = message;
  }

  function syncMarkers() {
    if (!mapInstance || !window.L) return;
    for (const [id, marker] of markerById) {
      const active = String(id) === String(selected()?.id);
      marker.setIcon(window.L.divIcon({ className: `campus-map-marker${active ? ' selected' : ''}`, html: `<span>${icon('pin', 20)}</span>`, iconSize: [38, 44], iconAnchor: [19, 42], popupAnchor: [0, -38] }));
      if (active) marker.openPopup();
      else marker.closePopup();
    }
  }

  function refresh({ pan = true } = {}) {
    const list = document.querySelector('.map-nearby-list');
    if (list) list.innerHTML = nearbyList();
    const detail = document.querySelector('.map-detail-card');
    if (detail) detail.innerHTML = details();
    const modeSelect = document.querySelector('.map-mode-select');
    if (modeSelect) modeSelect.value = mode;
    const active = selected();
    syncMarkers();
    if (mapInstance && pan && active && hasCoords(active)) mapInstance.panTo([Number(active.lat), Number(active.lng)]);
    updateUserLabel();
  }

  function selectPlace(id) {
    routeRequest++;
    routePending.clear();
    if (String(id) !== String(selectedId)) {
      routeLayer?.remove();
      routeLayer = null;
    }
    selectedId = id;
    refresh();
  }

  function updateUserLabel() {
    const button = document.querySelector('[data-current-location]');
    if (button) button.setAttribute('aria-label', currentPosition ? 'Center map on your location' : 'Request or set your location');
  }

  function setUserLocation(point, { manual = false, center = true } = {}) {
    routeRequest++;
    routePending.clear();
    routeLayer?.remove();
    routeLayer = null;
    const hadRoutes = routeCache.size > 0 || routePending.size > 0;
    routeCache.clear();
    currentPosition = { lat: Number(point.lat), lng: Number(point.lng) };
    if (mapInstance && window.L) {
      if (userMarker) userMarker.setLatLng([currentPosition.lat, currentPosition.lng]);
      else userMarker = window.L.circleMarker([currentPosition.lat, currentPosition.lng], { radius: 8, color: '#ffffff', weight: 3, fillColor: '#2878f0', fillOpacity: 1, pane: 'markerPane' }).addTo(mapInstance).bindPopup(manual ? 'Manually selected location' : 'Your current location');
      if (center) mapInstance.setView([currentPosition.lat, currentPosition.lng], 14);
    }
    refresh({ pan: false });
    if (manual) setStatus('Using your manually selected location.');
    else setStatus('Your location is shown on the map.');
    if (hadRoutes || directionsRequested) {
      directionsRequested = false;
      calculateAllRoutes(selected(), mode);
    }
  }

  function locateUser({ center = true } = {}) {
    if (!navigator.geolocation) { setStatus('Location is not supported by this browser. Click the map to set your location manually.'); return; }
    navigator.geolocation.getCurrentPosition(position => {
      setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }, { center });
    }, error => {
      const message = error.code === error.PERMISSION_DENIED
        ? 'Location permission was denied. Click the map to select your location manually.'
        : 'Your location could not be found. Click the map to select it manually.';
      setStatus(message);
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }

  function centerOnLocation() {
    if (currentPosition && mapInstance) {
      mapInstance.setView([Number(currentPosition.lat), Number(currentPosition.lng)], 14);
      userMarker?.openPopup();
      setStatus('Centered on your location.');
      return;
    }
    locateUser();
  }

  async function calculateRoute(place, travelMode = mode) {
    if (!place || !hasCoords(place)) return;
    if (!currentPosition) {
      setStatus('Choose My location or click the map to set a starting point.');
      return;
    }
    const key = routeKey(place, travelMode);
    const cached = routeCache.get(key);
    if (cached) {
      if (String(place.id) === String(selected()?.id) && travelMode === mode) {
        routeLayer?.remove();
        drawRoute(cached);
        setStatus('Travel time ready.');
      }
      refresh({ pan: false });
      return;
    }
    if (routePending.has(key)) return;
    const requestId = routeRequest;
    routePending.add(key);
    setStatus(`Calculating ${modes.find(([value]) => value === travelMode)?.[1] || 'travel'} route…`);
    refresh({ pan: false });
    try {
      let token = document.cookie.split('; ').find(item => item.startsWith('ch_csrf='))?.slice(8);
      if (!token) {
        const csrfResponse = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
        if (!csrfResponse.ok) throw new Error('Could not start a secure session.');
        token = (await csrfResponse.json()).csrfToken;
      } else token = decodeURIComponent(token);
      const response = await fetch('/api/map/route', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body: JSON.stringify({ mode: travelMode, origin: currentPosition, destination: { lat: Number(place.lat), lng: Number(place.lng) } }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'The route could not be calculated.');
      if (requestId !== routeRequest || !document.querySelector('.map-page')) return;
      routeCache.set(key, result);
      if (String(place.id) === String(selected()?.id) && travelMode === mode) {
        routeLayer?.remove();
        drawRoute(result);
      }
    } catch (error) {
      if (requestId === routeRequest) setStatus(error.message || 'The route could not be calculated.');
    } finally {
      routePending.delete(key);
      if (requestId === routeRequest) {
        if (!routePending.size) setStatus('Travel estimates calculated. Choose a mode to show its route.');
        refresh({ pan: false });
      }
    }
  }

  function calculateAllRoutes(place, preferredMode = mode) {
    if (!place || !hasCoords(place)) return;
    if (!currentPosition) {
      directionsRequested = true;
      calculateRoute(place, preferredMode);
      return;
    }
    directionsRequested = false;
    modes.forEach(([travelMode]) => { void calculateRoute(place, travelMode); });
  }

  function drawRoute(result) {
    if (!mapInstance || !window.L || !result?.geometry) return;
    routeLayer?.remove();
    routeLayer = window.L.featureGroup();
    window.L.geoJSON(result.geometry, {
      style: { color: '#fffdf5', weight: 13, opacity: 1, lineCap: 'round', lineJoin: 'round' },
    }).addTo(routeLayer);
    window.L.geoJSON(result.geometry, {
      style: { color: '#1769e8', weight: 7, opacity: 1, lineCap: 'round', lineJoin: 'round' },
    }).addTo(routeLayer);
    routeLayer.addTo(mapInstance);
    routeLayer.bringToFront();
    const bounds = routeLayer.getBounds();
    if (bounds.isValid()) mapInstance.fitBounds(bounds, { padding: [42, 42], maxZoom: 15 });
  }

  async function resolveMissingCoordinates() {
    const unresolved = events().filter(place => !hasCoords(place));
    for (const place of unresolved) {
      if (!document.querySelector('.map-page')) return;
      geocodingCount += 1;
      setStatus(`Verifying venue locations (${geocodingCount} remaining)…`);
      try {
        const result = await window.api(`map/geocode/${encodeURIComponent(place.id)}`);
        if (result.reason === 'provider-not-configured') { setStatus('Set GEOAPIFY_API_KEY in the server environment to verify missing venue locations.'); return; }
        if (result.resolved) {
          place.lat = result.lat;
          place.lng = result.lng;
          if (!selectedId) selectedId = place.id;
          addVenueMarker(place);
          refresh({ pan: false });
        }
      } catch (error) {
        setStatus(error.message || 'Some venues could not be verified.');
      } finally {
        geocodingCount -= 1;
      }
    }
    if (geocodingCount === 0 && !routeLayer) setStatus('OpenStreetMap contributors');
  }

  function addVenueMarker(place) {
    if (!mapInstance || !window.L || !hasCoords(place) || markerById.has(String(place.id))) return;
    const marker = window.L.marker([Number(place.lat), Number(place.lng)], {
      icon: window.L.divIcon({ className: `campus-map-marker${String(place.id) === String(selected()?.id) ? ' selected' : ''}`, html: `<span>${icon('pin', 20)}</span>`, iconSize: [38, 44], iconAnchor: [19, 42], popupAnchor: [0, -38] }),
      title: place.title,
    }).addTo(mapInstance);
    marker.bindPopup(`<strong>${safe(place.title)}</strong><br>${safe(place.venue)}`);
    marker.on('click', () => selectPlace(place.id));
    markerById.set(String(place.id), marker);
  }

  async function loadLeaflet() {
    if (window.L) return window.L;
    if (window.leafletReady) return window.leafletReady;
    window.leafletReady = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.onload = () => resolve(window.L);
      script.onerror = () => { window.leafletReady = null; script.remove(); reject(new Error('Leaflet could not be loaded. Check your network connection.')); };
      document.head.append(script);
    });
    return window.leafletReady;
  }

  R.map = async () => {
    routeRequest++;
    currentPosition = currentPosition || window.POS || null;
    const all = events();
    const requested = new URLSearchParams(location.hash.split('?')[1] || '').get('e');
    if (requested && all.some(event => String(event.id) === requested)) selectedId = requested;
    if (!selectedId) selectedId = all.find(hasCoords)?.id || all[0]?.id || null;
    return `<div class="map-page"><section class="map-hero"><div class="map-hero-copy"><h1>Map &amp; distance</h1><p>Find event venues and places around your campus.</p></div>${campusIllustration()}</section><section class="map-toolbar" aria-label="Map controls"><label class="map-control-select">${icon(mode === 'WALKING' ? 'walk' : mode === 'BICYCLING' ? 'bike' : mode === 'TRANSIT' ? 'transit' : 'car')}<select class="map-mode-select" aria-label="Travel mode">${modes.map(([value, label]) => `<option value="${value}" ${mode === value ? 'selected' : ''}>${label}</option>`).join('')}</select>${icon('chevron', 16)}</label><label class="map-control-select">${icon('map')}<select class="map-type-select" aria-label="Map style"><option value="streets" ${mapType === 'streets' ? 'selected' : ''}>Map</option><option value="humanitarian" ${mapType === 'humanitarian' ? 'selected' : ''}>Humanitarian</option></select>${icon('chevron', 16)}</label><button class="map-location-button" type="button" data-current-location>${icon('target', 20)} My location</button><label class="map-search">${icon('search', 22)}<input class="map-search-input" type="search" placeholder="Search event venues..." value="${safe(searchQuery)}" aria-label="Search places"></label></section><section class="map-layout"><section class="map-nearby-card"><header class="map-card-heading"><h2>Nearby venues</h2><span aria-label="${Math.min(5, visibleEvents().length)} shown from ${all.length} venues">${Math.min(5, visibleEvents().length)} shown</span></header><div class="map-nearby-list">${nearbyList()}</div></section><section class="map-surface-card"><div class="map-surface"><div id="campus-leaflet-map" class="map-leaflet" aria-label="Interactive OpenStreetMap of event venues"></div></div><div class="map-surface-status" role="status" aria-live="polite">Loading map tiles…</div></section><section class="map-detail-card">${details()}</section></section></div>`;
  };

  A.map = async () => {
    const root = document.querySelector('.map-page');
    if (!root) return;
    markerById = new Map();
    routeCache = new Map();
    routeLayer = null;
    userMarker = null;
    root.addEventListener('click', event => {
      const listDirections = event.target.closest('.map-row-directions');
      if (listDirections) {
        const row = listDirections.closest('[data-select-place]');
        const place = events().find(item => String(item.id) === String(row?.dataset.selectPlace));
        if (place) {
          selectPlace(place.id);
          calculateAllRoutes(place, mode);
        }
        return;
      }
      const select = event.target.closest('[data-select-place]');
      if (select) { selectPlace(select.dataset.selectPlace); return; }
      const modeButton = event.target.closest('[data-mode]');
      if (modeButton) { mode = modeButton.dataset.mode; refresh({ pan: false }); calculateAllRoutes(selected(), mode); return; }
      const directionButton = event.target.closest('[data-directions]');
      if (directionButton) calculateAllRoutes(selected(), mode);
      if (event.target.closest('[data-current-location]')) centerOnLocation();
    });
    root.querySelector('.map-search-input')?.addEventListener('input', event => {
      searchQuery = event.target.value;
      if (!visibleEvents().some(place => String(place.id) === String(selectedId))) selectedId = visibleEvents()[0]?.id ?? null;
      refresh({ pan: false });
    });
    root.querySelector('.map-mode-select')?.addEventListener('change', event => {
      mode = event.target.value;
      refresh({ pan: false });
      calculateAllRoutes(selected(), mode);
    });

    try {
      await loadLeaflet();
      if (!root.isConnected) return;
      mapResizeObserver?.disconnect();
      mapInstance?.remove();
      mapInstance = null;
      tileLayer = null;
      const surface = root.querySelector('#campus-leaflet-map');
      const located = locatedEvents();
      mapInstance = window.L.map(surface, { zoomControl: true, scrollWheelZoom: true, preferCanvas: true });
      const initialCenter = currentPosition
        ? [Number(currentPosition.lat), Number(currentPosition.lng)]
        : located.length ? [Number(located[0].lat), Number(located[0].lng)] : [28.6139, 77.2090];
      mapInstance.setView(initialCenter, 12);
      const osmStyle = {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
        loading: 'Loading OpenStreetMap...',
      };
      const hotStyle = {
        url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        subdomains: 'abc',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> · HOT style by <a href="https://www.openstreetmap.fr/" target="_blank" rel="noopener">OpenStreetMap France</a>',
        loading: 'Loading humanitarian map...',
      };
      const tileStyles = { streets: [osmStyle, hotStyle], humanitarian: [hotStyle, osmStyle] };
      let tileSourceIndex = -1;
      let activeTileStyle = mapType;
      const loadTileSource = (index, style = mapType) => {
        const tileSources = tileStyles[style] || tileStyles.streets;
        activeTileStyle = style;
        if (!mapInstance || index >= tileSources.length) {
          setStatus('Map tiles are unavailable. Check your internet connection and reload the map.');
          return;
        }
        tileSourceIndex = index;
        const tileSource = tileSources[index];
        tileLayer?.remove();
        const layer = window.L.tileLayer(tileSource.url, {
          minZoom: 1,
          maxZoom: 19,
          ...(tileSource.subdomains ? { subdomains: tileSource.subdomains } : {}),
          attribution: tileSource.attribution,
          updateWhenIdle: true,
          keepBuffer: 3,
        });
        tileLayer = layer;
        let fallbackScheduled = false;
        layer.on('loading', () => setStatus(tileSource.loading));
        layer.on('load', () => {
          if (tileLayer === layer) setStatus('Map data © OpenStreetMap contributors');
        });
        layer.on('tileerror', () => {
          if (fallbackScheduled || tileLayer !== layer || tileSourceIndex !== index || activeTileStyle !== style) return;
          fallbackScheduled = true;
          window.setTimeout(() => {
            if (tileLayer === layer && tileSourceIndex === index && activeTileStyle === style) loadTileSource(index + 1, style);
          }, 250);
        });
        layer.addTo(mapInstance);
      };
      root.querySelector('.map-type-select')?.addEventListener('change', event => {
        mapType = event.target.value === 'humanitarian' ? 'humanitarian' : 'streets';
        loadTileSource(0, mapType);
      });
      loadTileSource(0, mapType);
      located.forEach(place => {
        try { addVenueMarker(place); }
        catch (error) { console.warn('CampusHub could not place a venue marker:', error); }
      });
      if (currentPosition) {
        setUserLocation(currentPosition, { center: false });
      } else if (located.length) {
        const bounds = window.L.latLngBounds(located.map(place => [Number(place.lat), Number(place.lng)]));
        mapInstance.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
      } else mapInstance.fitWorld();
      mapInstance.on('click', event => setUserLocation(event.latlng, { manual: true }));
      window.L.control.scale({ imperial: false }).addTo(mapInstance);
      window.setTimeout(() => mapInstance?.invalidateSize(), 0);
      if ('ResizeObserver' in window) { mapResizeObserver = new ResizeObserver(() => mapInstance?.invalidateSize()); mapResizeObserver.observe(surface); }
      syncMarkers();
      if (!currentPosition && !geolocationRequested) { geolocationRequested = true; locateUser({ center: false }); }
      resolveMissingCoordinates();
      refresh({ pan: new URLSearchParams(location.hash.split('?')[1] || '').has('e') });
    } catch (error) {
      if (!root.isConnected) return;
      setStatus(error.message || 'The interactive map could not be initialized.');
      root.querySelector('#campus-leaflet-map').innerHTML = '<div class="map-load-error">Interactive map unavailable. Check the browser connection and reload this page.</div>';
    }
  };
}
