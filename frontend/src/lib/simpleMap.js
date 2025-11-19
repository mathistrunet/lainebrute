const TILE_SIZE = 256;
const MIN_LAT = -85.05112878;
const MAX_LAT = 85.05112878;
const DEFAULT_SUBDOMAINS = ['a', 'b', 'c'];

const clampLat = (lat) => {
  if (!Number.isFinite(lat)) {
    return 0;
  }
  return Math.max(MIN_LAT, Math.min(MAX_LAT, lat));
};

const normalizeLng = (lng) => {
  if (!Number.isFinite(lng)) {
    return 0;
  }
  let value = lng;
  while (value <= -180) {
    value += 360;
  }
  while (value > 180) {
    value -= 360;
  }
  return value;
};

const wrapTileX = (x, tileCount) => {
  const max = tileCount;
  let result = x % max;
  if (result < 0) {
    result += max;
  }
  return result;
};

const project = (lat, lng, zoom) => {
  const sinLat = Math.sin((clampLat(lat) * Math.PI) / 180);
  const scale = TILE_SIZE * 2 ** zoom;
  const x = ((normalizeLng(lng) + 180) / 360) * scale;
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
};

const unproject = (x, y, zoom) => {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat: clampLat(lat), lng: normalizeLng(lng) };
};

export class SimpleMap {
  constructor(container, options = {}) {
    if (!container) {
      throw new Error('Map container manquant');
    }

    this.container = container;
    this.options = {
      center: options.center ?? [46.7111, 1.7191],
      zoom: options.zoom ?? 6,
      minZoom: options.minZoom ?? 3,
      maxZoom: options.maxZoom ?? 12,
      tileUrl: options.tileUrl ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      subdomains: options.subdomains ?? DEFAULT_SUBDOMAINS,
    };

    this.center = {
      lat: clampLat(this.options.center[0]),
      lng: normalizeLng(this.options.center[1]),
    };
    this.zoom = this.clampZoom(this.options.zoom);
    this.width = 0;
    this.height = 0;
    this.tileCache = new Map();
    this.markerCache = new Map();
    this.renderFrame = null;
    this.pendingFit = null;
    this.onMarkerSelect = null;

    this.root = document.createElement('div');
    this.root.className = 'tile-map';
    this.tilesPane = document.createElement('div');
    this.tilesPane.className = 'tile-map__tiles';
    this.markersPane = document.createElement('div');
    this.markersPane.className = 'tile-map__markers';
    this.root.append(this.tilesPane, this.markersPane);
    this.container.appendChild(this.root);

    this.handleResize = this.handleResize.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleWheel = this.handleWheel.bind(this);

    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(this.container);

    this.root.addEventListener('pointerdown', this.handlePointerDown);
    this.root.addEventListener('wheel', this.handleWheel, { passive: false });

    this.updateSize();
  }

  clampZoom(zoom) {
    if (!Number.isFinite(zoom)) {
      return this.options.minZoom;
    }
    return Math.max(this.options.minZoom, Math.min(this.options.maxZoom, zoom));
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.root.removeEventListener('pointerdown', this.handlePointerDown);
    this.root.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    cancelAnimationFrame(this.renderFrame);
    this.tileCache.forEach((tile) => tile.el.remove());
    this.markerCache.forEach((marker) => marker.el.remove());
    this.root.remove();
    this.tileCache.clear();
    this.markerCache.clear();
  }

  handleResize(entries) {
    if (!Array.isArray(entries) || entries.length === 0) {
      return;
    }
    const entry = entries[0].contentRect;
    if (!entry) {
      return;
    }
    const { width, height } = entry;
    if (width === this.width && height === this.height) {
      return;
    }
    this.width = width;
    this.height = height;
    if (this.pendingFit && this.width > 0 && this.height > 0) {
      const pending = this.pendingFit;
      this.pendingFit = null;
      this.fitBounds(pending.bounds, pending.options);
      return;
    }
    this.scheduleRender();
  }

  updateSize() {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.scheduleRender();
  }

  setView(latLng, zoom = this.zoom) {
    if (!Array.isArray(latLng) || latLng.length !== 2) {
      return;
    }
    this.center = {
      lat: clampLat(latLng[0]),
      lng: normalizeLng(latLng[1]),
    };
    this.zoom = this.clampZoom(zoom);
    this.scheduleRender();
  }

  flyTo(latLng, zoom = this.zoom) {
    this.setView(latLng, zoom);
  }

  setZoom(zoom) {
    this.zoom = this.clampZoom(zoom);
    this.scheduleRender();
  }

  getZoom() {
    return this.zoom;
  }

  setMarkers(markers, options = {}) {
    this.onMarkerSelect = typeof options.onMarkerSelect === 'function' ? options.onMarkerSelect : null;
    const activeId = options.activeId ?? null;
    const seenKeys = new Set();

    (markers || []).forEach((marker) => {
      if (!Number.isFinite(marker?.lat) || !Number.isFinite(marker?.lng)) {
        return;
      }
      const key = String(marker.id ?? `${marker.lat}:${marker.lng}`);
      seenKeys.add(key);
      let entry = this.markerCache.get(key);
      if (!entry) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tile-map__marker';
        entry = { el: button, marker: { ...marker } };
        button.addEventListener('click', () => {
          if (this.onMarkerSelect) {
            this.onMarkerSelect(entry.marker);
          }
        });
        this.markerCache.set(key, entry);
        this.markersPane.appendChild(button);
      }
      entry.marker = { ...marker };
      entry.el.title = marker.title ?? marker.name ?? 'Producteur';
      const ariaLabelParts = [marker.name ?? marker.title ?? 'Producteur'];
      if (marker.city) {
        ariaLabelParts.push(`à ${marker.city}`);
      }
      entry.el.setAttribute('aria-label', ariaLabelParts.join(' '));
      entry.el.classList.toggle('is-active', activeId !== null && marker.id === activeId);
    });

    Array.from(this.markerCache.entries()).forEach(([key, entry]) => {
      if (!seenKeys.has(key)) {
        entry.el.remove();
        this.markerCache.delete(key);
      }
    });

    this.scheduleRender();
  }

  fitBounds(bounds, options = {}) {
    if (!bounds || !Number.isFinite(bounds.minLat)) {
      return;
    }
    if (this.width === 0 || this.height === 0) {
      this.pendingFit = { bounds, options };
      return;
    }
    const padding = Math.max(0, options.padding ?? 40);
    let targetZoom = this.options.maxZoom;
    for (let zoom = this.options.maxZoom; zoom >= this.options.minZoom; zoom -= 1) {
      const ne = project(bounds.maxLat, bounds.maxLng, zoom);
      const sw = project(bounds.minLat, bounds.minLng, zoom);
      const boxWidth = Math.abs(ne.x - sw.x);
      const boxHeight = Math.abs(ne.y - sw.y);
      if (boxWidth + padding * 2 <= this.width && boxHeight + padding * 2 <= this.height) {
        targetZoom = zoom;
        break;
      }
    }
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    const centerLng = (bounds.minLng + bounds.maxLng) / 2;
    this.setView([centerLat, centerLng], targetZoom);
  }

  scheduleRender() {
    if (this.renderFrame) {
      return;
    }
    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = null;
      this.render();
    });
  }

  render() {
    if (!this.width || !this.height) {
      return;
    }
    this.renderTiles();
    this.renderMarkers();
  }

  renderTiles() {
    const centerPoint = project(this.center.lat, this.center.lng, this.zoom);
    const topLeftX = centerPoint.x - this.width / 2;
    const topLeftY = centerPoint.y - this.height / 2;
    this.topLeft = { x: topLeftX, y: topLeftY };
    const tileCount = 2 ** this.zoom;
    const startTileX = Math.floor(topLeftX / TILE_SIZE) - 1;
    const endTileX = Math.floor((topLeftX + this.width) / TILE_SIZE) + 1;
    const startTileY = Math.floor(topLeftY / TILE_SIZE) - 1;
    const endTileY = Math.floor((topLeftY + this.height) / TILE_SIZE) + 1;
    const needed = new Set();

    for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
      for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
        const wrappedX = wrapTileX(tileX, tileCount);
        if (tileY < 0 || tileY >= tileCount) {
          continue;
        }
        const key = `${this.zoom}:${wrappedX}:${tileY}`;
        needed.add(key);
        let entry = this.tileCache.get(key);
        if (!entry) {
          const img = document.createElement('img');
          img.alt = '';
          img.draggable = false;
          img.decoding = 'async';
          entry = { el: img };
          this.tileCache.set(key, entry);
          this.tilesPane.appendChild(img);
        }
        const pixelX = wrappedX * TILE_SIZE - topLeftX;
        const pixelY = tileY * TILE_SIZE - topLeftY;
        entry.el.src = this.buildTileUrl(wrappedX, tileY, this.zoom);
        entry.el.style.transform = `translate(${Math.round(pixelX)}px, ${Math.round(pixelY)}px)`;
      }
    }

    Array.from(this.tileCache.keys()).forEach((key) => {
      if (!needed.has(key)) {
        const tile = this.tileCache.get(key);
        tile.el.remove();
        this.tileCache.delete(key);
      }
    });
  }

  renderMarkers() {
    if (!this.topLeft) {
      return;
    }
    this.markerCache.forEach((entry) => {
      const marker = entry.marker;
      const point = project(marker.lat, marker.lng, this.zoom);
      const left = point.x - this.topLeft.x;
      const top = point.y - this.topLeft.y;
      entry.el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px) translate(-50%, -100%)`;
    });
  }

  buildTileUrl(x, y, z) {
    const template = this.options.tileUrl;
    const subdomains = this.options.subdomains;
    const index = Math.abs(x + y) % subdomains.length;
    const s = subdomains[index] ?? '';
    return template.replace('{s}', s).replace('{z}', z).replace('{x}', x).replace('{y}', y);
  }

  handlePointerDown(event) {
    if (event.button !== 0 && event.pointerType !== 'touch') {
      return;
    }
    this.root.classList.add('is-dragging');
    this.dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      centerPoint: project(this.center.lat, this.center.lng, this.zoom),
    };
    this.root.setPointerCapture(event.pointerId);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
  }

  handlePointerMove(event) {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
      return;
    }
    const dx = event.clientX - this.dragState.startX;
    const dy = event.clientY - this.dragState.startY;
    const newPoint = {
      x: this.dragState.centerPoint.x - dx,
      y: this.dragState.centerPoint.y - dy,
    };
    const latLng = unproject(newPoint.x, newPoint.y, this.zoom);
    this.center = latLng;
    this.scheduleRender();
  }

  handlePointerUp(event) {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
      return;
    }
    this.root.releasePointerCapture(event.pointerId);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    this.dragState = null;
    this.root.classList.remove('is-dragging');
  }

  handleWheel(event) {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    const nextZoom = this.clampZoom(this.zoom + direction);
    if (nextZoom === this.zoom) {
      return;
    }
    const rect = this.root.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const centerPoint = project(this.center.lat, this.center.lng, this.zoom);
    const currentTopLeft = this.topLeft ?? {
      x: centerPoint.x - this.width / 2,
      y: centerPoint.y - this.height / 2,
    };
    const worldX = currentTopLeft.x + offsetX;
    const worldY = currentTopLeft.y + offsetY;
    const anchorLatLng = unproject(worldX, worldY, this.zoom);
    this.zoom = nextZoom;
    const anchorPoint = project(anchorLatLng.lat, anchorLatLng.lng, this.zoom);
    const newTopLeft = {
      x: anchorPoint.x - offsetX,
      y: anchorPoint.y - offsetY,
    };
    const newCenterPoint = {
      x: newTopLeft.x + this.width / 2,
      y: newTopLeft.y + this.height / 2,
    };
    this.center = unproject(newCenterPoint.x, newCenterPoint.y, this.zoom);
    this.scheduleRender();
  }
}
