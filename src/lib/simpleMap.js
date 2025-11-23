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
    this.rawMarkers = [];
    this.activeMarkerId = null;
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
    this.handleWindowResize = () => this.updateSize();

    if (typeof window !== 'undefined' && typeof window.ResizeObserver === 'function') {
      this.resizeObserver = new window.ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.container);
    } else {
      this.resizeObserver = null;
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', this.handleWindowResize);
      }
    }

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
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleWindowResize);
    }
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
    this.activeMarkerId = options.activeId ?? null;
    this.rawMarkers = Array.isArray(markers)
      ? markers.filter((marker) => Number.isFinite(marker?.lat) && Number.isFinite(marker?.lng))
      : [];
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
    const clusters = this.buildClusters();
    const seenKeys = new Set();

    clusters.forEach((cluster) => {
      seenKeys.add(cluster.key);
      let entry = this.markerCache.get(cluster.key);
      if (!entry) {
        const wrapper = document.createElement('div');
        wrapper.className = 'tile-map__marker-wrapper';
        const label = document.createElement('span');
        label.className = 'tile-map__marker-label';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tile-map__marker';
        const popup = document.createElement('div');
        popup.className = 'tile-map__popup';
        const popupTitle = document.createElement('strong');
        popupTitle.className = 'tile-map__popup-title';
        const popupCity = document.createElement('p');
        popupCity.className = 'tile-map__popup-line';
        const popupQuantity = document.createElement('p');
        popupQuantity.className = 'tile-map__popup-line';
        popup.append(popupTitle, popupCity, popupQuantity);
        wrapper.append(label, button, popup);
        this.markerCache.set(cluster.key, {
          el: wrapper,
          labelEl: label,
          buttonEl: button,
          popupEl: popup,
          popupTitleEl: popupTitle,
          popupCityEl: popupCity,
          popupQuantityEl: popupQuantity,
        });
        this.markersPane.appendChild(wrapper);
      }

      const entryNode = this.markerCache.get(cluster.key);
      const point = project(cluster.lat, cluster.lng, this.zoom);
      const left = point.x - this.topLeft.x;
      const top = point.y - this.topLeft.y;
      entryNode.el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px) translate(-50%, -100%)`;

      if (cluster.isCluster) {
        entryNode.el.classList.add('tile-map__marker-wrapper--cluster');
        entryNode.labelEl.textContent = `${cluster.count} producteurs`;
        entryNode.buttonEl.textContent = String(cluster.count);
        entryNode.buttonEl.classList.add('tile-map__marker--cluster');
        entryNode.buttonEl.classList.remove('is-active');
        entryNode.buttonEl.setAttribute('aria-label', `${cluster.count} producteurs regroupés`);
        entryNode.buttonEl.title = `${cluster.count} producteurs regroupés`;
        entryNode.popupEl.classList.remove('is-visible');
        entryNode.popupEl.setAttribute('hidden', 'true');
        entryNode.buttonEl.dataset.hovered = 'false';
        entryNode.buttonEl.onmouseenter = null;
        entryNode.buttonEl.onmouseleave = null;
        entryNode.buttonEl.onfocus = null;
        entryNode.buttonEl.onblur = null;
        entryNode.buttonEl.onclick = () => {
          const nextZoom = Math.min(this.options.maxZoom, cluster.zoomTarget ?? this.zoom + 1);
          this.flyTo([cluster.lat, cluster.lng], nextZoom);
        };
      } else {
        entryNode.el.classList.remove('tile-map__marker-wrapper--cluster');
        entryNode.buttonEl.classList.remove('tile-map__marker--cluster');
        entryNode.buttonEl.textContent = '';
        const markerName = cluster.marker.name ?? cluster.marker.title ?? 'Producteur';
        entryNode.labelEl.textContent = markerName;
        entryNode.popupTitleEl.textContent = markerName;
        if (cluster.marker.city) {
          entryNode.popupCityEl.textContent = cluster.marker.city;
          entryNode.popupCityEl.style.display = 'block';
        } else {
          entryNode.popupCityEl.textContent = '';
          entryNode.popupCityEl.style.display = 'none';
        }
        if (cluster.marker.quantity) {
          entryNode.popupQuantityEl.textContent = cluster.marker.quantity;
          entryNode.popupQuantityEl.style.display = 'block';
        } else {
          entryNode.popupQuantityEl.textContent = '';
          entryNode.popupQuantityEl.style.display = 'none';
        }
        entryNode.popupEl.removeAttribute('hidden');
        const isActive = this.activeMarkerId !== null && cluster.marker.id === this.activeMarkerId;
        const ariaLabelParts = [entryNode.labelEl.textContent];
        if (cluster.marker.city) {
          ariaLabelParts.push(`à ${cluster.marker.city}`);
        }
        entryNode.buttonEl.setAttribute('aria-label', ariaLabelParts.join(' '));
        entryNode.buttonEl.title = ariaLabelParts.join(' ');
        entryNode.buttonEl.onclick = () => {
          if (this.onMarkerSelect) {
            this.onMarkerSelect(cluster.marker);
          }
        };
        const updatePopupVisibility = () => {
          const isHovered = entryNode.buttonEl.dataset.hovered === 'true';
          const isFocused =
            typeof document !== 'undefined' && document.activeElement === entryNode.buttonEl;
          const shouldShow = isActive || isHovered || isFocused;
          entryNode.popupEl.classList.toggle('is-visible', shouldShow);
        };

        entryNode.buttonEl.dataset.hovered = entryNode.buttonEl.dataset.hovered ?? 'false';
        entryNode.buttonEl.onmouseenter = () => {
          entryNode.buttonEl.dataset.hovered = 'true';
          updatePopupVisibility();
        };
        entryNode.buttonEl.onmouseleave = () => {
          entryNode.buttonEl.dataset.hovered = 'false';
          updatePopupVisibility();
        };
        entryNode.buttonEl.onfocus = updatePopupVisibility;
        entryNode.buttonEl.onblur = updatePopupVisibility;
        updatePopupVisibility();
        entryNode.buttonEl.classList.toggle(
          'is-active',
          isActive
        );
      }
    });

    Array.from(this.markerCache.keys()).forEach((key) => {
      if (!seenKeys.has(key)) {
        const node = this.markerCache.get(key);
        node.el.remove();
        this.markerCache.delete(key);
      }
    });
  }

  getClusterThreshold() {
    const maxRadius = 120;
    const minRadius = 36;
    const zoomRange = Math.max(1, this.options.maxZoom - this.options.minZoom);
    const relativeZoom = Math.max(0, Math.min(zoomRange, this.zoom - this.options.minZoom));
    const factor = 1 - relativeZoom / zoomRange;
    return Math.round(minRadius + (maxRadius - minRadius) * factor);
  }

  buildClusters() {
    if (!this.rawMarkers.length) {
      return [];
    }
    const threshold = this.getClusterThreshold();
    const thresholdSq = threshold * threshold;
    const clusters = [];

    this.rawMarkers.forEach((marker) => {
      const point = project(marker.lat, marker.lng, this.zoom);
      let target = null;
      for (const cluster of clusters) {
        const dx = point.x - cluster.point.x;
        const dy = point.y - cluster.point.y;
        if (dx * dx + dy * dy <= thresholdSq) {
          target = cluster;
          break;
        }
      }
      if (target) {
        target.point.x = (target.point.x * target.count + point.x) / (target.count + 1);
        target.point.y = (target.point.y * target.count + point.y) / (target.count + 1);
        target.count += 1;
        target.members.push(marker);
      } else {
        clusters.push({ point: { ...point }, count: 1, members: [marker] });
      }
    });

    return clusters.map((cluster) => {
      const latLng = unproject(cluster.point.x, cluster.point.y, this.zoom);
      if (cluster.count === 1) {
        const marker = cluster.members[0];
        return {
          key: `marker:${marker.id ?? `${marker.lat}:${marker.lng}`}`,
          isCluster: false,
          lat: marker.lat,
          lng: marker.lng,
          marker,
        };
      }
      const key = `cluster:${cluster.members
        .map((member) => member.id ?? `${member.lat}:${member.lng}`)
        .sort()
        .join('|')}`;
      return {
        key,
        isCluster: true,
        count: cluster.count,
        lat: latLng.lat,
        lng: latLng.lng,
        zoomTarget: this.zoom + 1,
        markers: cluster.members,
      };
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
