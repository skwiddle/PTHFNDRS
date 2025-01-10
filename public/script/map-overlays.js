import { toFloat } from './CoordinateSpaceContainer.js';
import { NodeRef } from './lib/Node_Utility.js';

export class Marker {
  /**
   * Creates an instance of Marker.
   * @param {object} data
   * @param {string} data.title
   * @param {string} data.description
   * @param {number} data.x
   * @param {number} data.y
   * @this Marker
   */
  constructor(data) {
    this.data = data;
    this.element = document.createElement('img');
    this.element.classList.add('marker');
    this.element.draggable = false;
    this.element.src = './image/marker-icon.png';
    this.element.style.left = `${data.x}px`;
    this.element.style.top = `${data.y}px`;
    this.open = false;
  }
  getData() {
    this.data.x = toFloat(this.element.style.left, 0);
    this.data.y = toFloat(this.element.style.top, 0);
    return this.data;
  }
}

const highlightContainer = NodeRef(document.getElementById('overlay-container-0')).as(SVGElement);
const markerContainer = NodeRef(document.getElementById('marker-container-0')).as(HTMLElement);

/** @type {Set<Element>} */
export const overlaySet = new Set();
/** @type {Map<Element,Marker>} */
export const markerMap = new Map();

export async function loadOverlays() {
  // load highlights
  try {
    const response = await fetch('./map-highlights.svg');
    highlightContainer.insertAdjacentHTML('beforeend', await response.text());
  } catch (error) {
    console.error(error);
  }
  // add to element set
  for (const child of highlightContainer.children) {
    overlaySet.add(child);
  }

  // load markers
  try {
    const response = await fetch('./map-markers.json');
    for (const data of await response.json()) {
      const marker = new Marker(data);
      markerMap.set(marker.element, marker);
      markerContainer.appendChild(marker.element);
      overlaySet.add(marker.element);
    }
  } catch (error) {
    console.error(error);
  }
}

export function getOverlayMarkers() {
  return markerMap;
}

/**
 * @param {*} element
 * @return {element is Element}
 */
export function isOverlayElement(element) {
  return element instanceof Element && overlaySet.has(element);
}

/**
 * @param {*} element
 * @return {element is Element}
 */
export function isOverlayMarker(element) {
  return element instanceof Element && markerMap.has(element);
}
