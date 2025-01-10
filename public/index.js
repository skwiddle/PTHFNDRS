import { scalePoint, toPoint } from './script/CoordinateSpaceContainer.js';
import { NodeRef } from './script/lib/Node_Utility.js';
import { isOverlayMarker, loadOverlays, markerMap } from './script/map-overlays.js';
import { getRulerHRect, getRulerVRect, updateRulers } from './script/map-rulers.js';
import { ZoomController } from './script/ZoomController.js';

loadOverlays();

// legend
const mapLegend = NodeRef(document.getElementById('legend')).as(HTMLElement);
function updateLegend(top) {
  mapLegend.style.top = `${top}px`;
}
const navLegendButton = NodeRef(document.getElementById('navitem-legend')).as(HTMLButtonElement);
mapLegend.querySelector('.toggle-button')?.addEventListener('click', () => {
  toggleHidden(mapLegend, !togglePushed(navLegendButton));
});
navLegendButton.addEventListener('click', () => {
  toggleHidden(mapLegend, !togglePushed(navLegendButton));
});

// briefing
const mapBriefing = NodeRef(document.getElementById('briefing')).as(HTMLElement);
function updateBriefing(left, top) {
  mapBriefing.style.left = `${left}px`;
  mapBriefing.style.top = `${top}px`;
}
const navBriefingButton = NodeRef(document.getElementById('navitem-briefing')).as(HTMLButtonElement);
mapBriefing.querySelector('.toggle-button')?.addEventListener('click', () => {
  toggleHidden(mapBriefing, !togglePushed(navBriefingButton));
});
navBriefingButton.addEventListener('click', () => {
  toggleHidden(mapBriefing, !togglePushed(navBriefingButton));
});

const settings = loadSettings();

const zoomContainer = NodeRef(document.getElementById('zoom-container-0')).as(HTMLElement);
const zoomChild = NodeRef(document.getElementById('zoom-child-0')).as(HTMLElement);
const zoomController = new ZoomController(zoomContainer, zoomChild, {
  enable_edge_clamping: false,
  zoom_min: 0.05,
  zoom_max: 4,
  zoom_delta_function: zoomCurve,
});

zoomController.setClickListener((event) => {
  const marker = isOverlayMarker(event.target) && markerMap.get(event.target);
  if (marker && marker.open === false) {
    addTooltip(zoomController.parse_scale(), marker);
  }
});

zoomController.setTransformListener((scale, point) => {
  saveSettings({ scale, point });

  const { x, y } = zoomController.coordinateSpace.containerPointToGlobalPoint(toPoint(0, 0));
  updateRulers(scale, point);
  updateBriefing(10 + x + getRulerVRect().width, 10 + y + getRulerHRect().height);
  updateLegend(10 + y + getRulerHRect().height);
});

// initialize the controller
zoomController.setupEvents();

if (settings) {
  zoomController.setTransform(settings.scale, settings.point);
} else {
  zoomController.setScale(0.1);
  zoomController.centerChild();
}

/**
 * Custom curve function for smooth zooming.
 * @param {number} scale
 */
function zoomCurve(scale) {
  const exponential_base = 1 / 2;
  const input_min = 0.1;
  const input_max = 2;
  const output_min = 0.01;
  const output_max = 0.5;
  const EB_IM = Math.pow(exponential_base, input_min);
  return Math.max(output_min, output_min + ((output_max - output_min) * (Math.pow(exponential_base, scale) - EB_IM)) / (Math.pow(exponential_base, input_max) - EB_IM));
}

function loadSettings() {
  const settings = localStorage.getItem('settings');
  return settings ? JSON.parse(settings) : undefined;
}

/**
 * @param {object} data
 */
function saveSettings(data) {
  localStorage.setItem('settings', JSON.stringify(data));
}

// this is slop, but i'm tired
function addTooltip(scale, marker) {
  marker.open = true;

  const tooltip = document.createElement('div');
  const header = document.createElement('div');
  const title = document.createElement('span');
  const close = document.createElement('button');
  const description = document.createElement('div');

  tooltip.classList.add('marker-tooltip');
  header.classList.add('marker-tooltip-header');
  title.classList.add('marker-tooltip-title');
  close.classList.add('marker-tooltip-close');
  description.classList.add('marker-tooltip-description');

  tooltip.appendChild(header);
  header.appendChild(title);
  header.appendChild(close);
  tooltip.appendChild(description);
  zoomChild.append(tooltip);

  close.textContent = 'x';
  close.addEventListener('click', () => {
    marker.open = false;
    tooltip.remove();
  });

  title.innerText = marker.data.title;
  description.innerText = marker.data.description;
  tooltip.style.removeProperty('display');

  const marker_rect = marker.element.getBoundingClientRect();
  const marker_size = scalePoint(1 / scale, toPoint(marker_rect.width, marker_rect.height));
  const tooltip_rect = tooltip.getBoundingClientRect();
  const tooltip_size = scalePoint(1 / scale, toPoint(tooltip_rect.width, tooltip_rect.height));

  tooltip.style.left = `${marker.data.x - (tooltip_size.x - marker_size.x) / 2}px`;
  tooltip.style.top = `${marker.data.y - tooltip_size.y - 10}px`;
}

function togglePushed(element) {
  if (element.classList.contains('pushed')) {
    element.classList.remove('pushed');
    return false;
  }
  element.classList.add('pushed');
  return true;
}

function toggleHidden(element, hidden) {
  if (hidden) {
    element.classList.add('hidden');
  } else {
    element.classList.remove('hidden');
  }
}
