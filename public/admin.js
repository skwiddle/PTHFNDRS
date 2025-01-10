import { toPoint } from './script/CoordinateSpaceContainer.js';
import { NodeRef } from './script/lib/Node_Utility.js';
import { getOverlayMarkers, isOverlayElement, loadOverlays } from './script/map-overlays.js';
import { getRulerHRect, getRulerVRect, updateRulers } from './script/map-rulers.js';
import { VisualElementEditor } from './script/VisualElementEditor.js';
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

/**************
 * ADMIN ONLY
 **/
const visualEditor = new VisualElementEditor({
  editorHandleContainer: zoomContainer,
  elementContainer: zoomChild,
  elementContainerCoordinateSpace: zoomController.coordinateSpace,
});

zoomController.setClickListener((event) => {
  /**************
   * ADMIN ONLY
   **/
  if (isOverlayElement(event.target)) {
    visualEditor.selectElement(event.target);
  } else {
    visualEditor.deselectElement();
  }
});

/**************
 * ADMIN ONLY
 **/
zoomController.setDragListener((event, delta, consumeEvent) => {
  if (isOverlayElement(event.target) && visualEditor.isSelected(event.target)) {
    consumeEvent();
    visualEditor.moveSelectedElementBy(delta);
  }
});

zoomController.setTransformListener((scale, point) => {
  saveSettings({ scale, point });

  const { x, y } = zoomController.coordinateSpace.containerPointToGlobalPoint(toPoint(0, 0));
  updateRulers(scale, point);
  updateBriefing(10 + x + getRulerVRect().width, 10 + y + getRulerHRect().height);
  updateLegend(10 + y + getRulerHRect().height);

  /**************
   * ADMIN ONLY
   **/
  visualEditor.setScale(1 / scale);
  visualEditor.updateHandles();
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

const highlightContainer = NodeRef(document.getElementById('overlay-container-0')).as(SVGElement);
const saveButton = NodeRef(document.getElementById('navitem-save')).as(HTMLButtonElement);

saveButton.addEventListener('click', () => {
  saveOverlays();
});

function saveOverlays() {
  {
    const children_html = [];
    const clone = NodeRef(highlightContainer.cloneNode(true)).as(SVGElement);
    for (const element of clone.children) {
      element.removeAttribute('class');
      children_html.push(element.outerHTML.trim());
    }
    fetch('/write/highlights', { method: 'POST', body: children_html.join('\n').trim() });
  }
  {
    const marker_data_list = [];
    for (const [_, marker] of getOverlayMarkers()) {
      marker_data_list.push(marker.getData());
    }
    fetch('/write/markers', { method: 'POST', body: JSON.stringify(marker_data_list) });
  }
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
