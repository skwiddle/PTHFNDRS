import { CoordinateSpaceContainer, scalePoint, toFloat, toPoint } from './CoordinateSpaceContainer.js';
import { setupPointerEvents } from './PointerEvents.js';

class VisualElementEditorHandle {
  static Size = 30;

  /**
   * @param {Element} container
   * @param {VisualElementEditor} editor
   * @this VisualElementEditorHandle
   */
  constructor(container, editor) {
    this.container = container;
    this.editor = editor;
    this.element = document.createElement('div');
    this.element.classList.add('visual-element-editor-handle');
    this.element.setAttribute('style', `width:${VisualElementEditorHandle.Size}px; height:${VisualElementEditorHandle.Size}px; left:0; top:0;`);
    this.cleanupEvents = () => {};
  }

  /**
   * @this VisualElementEditorHandle
   */
  hide() {
    this.element.remove();
    this.cleanupEvents();
    this.cleanupEvents = () => {};
  }

  /**
   * @param {(delta:{x:number;y:number;})=>void} onDrag
   * @this VisualElementEditorHandle
   */
  show(onDrag) {
    const element = this.element;
    this.container.appendChild(element);
    this.cleanupEvents = setupPointerEvents(element, {
      onPointerDown(event) {
        event.stopPropagation();
      },
      onDrag(event, delta) {
        event.stopPropagation();
        onDrag(delta);
      },
    });
  }
}

export class VisualElementEditor {
  /** @type Element= */
  activeElement;

  /** @type VisualElementEditorHandle[] */
  handleList = [];

  /**
   * @param {object} args
   * @param {Element} args.editorHandleContainer
   * @param {Element} args.elementContainer
   * @param {CoordinateSpaceContainer=} args.elementContainerCoordinateSpace
   * @this VisualElementEditor
   */
  constructor({ editorHandleContainer, elementContainer, elementContainerCoordinateSpace }) {
    this.editorHandleContainer = editorHandleContainer;
    this.elementContainer = elementContainer;
    this.coordinateSpace = elementContainerCoordinateSpace ?? new CoordinateSpaceContainer(this.elementContainer);
    // the size handle
    this.handleList.push(new VisualElementEditorHandle(editorHandleContainer, this));
    this.scale = 1;
  }

  /**
   * @returns previously active element
   * @this VisualElementEditor
   */
  deselectElement() {
    const element = this.activeElement;
    element?.classList.remove('selected');
    this.activeElement = undefined;
    this.hideHandles();
    return element;
  }

  /**
   * @param {Element} element
   * @this VisualElementEditor
   */
  selectElement(element) {
    if (this.deselectElement() !== element) {
      this.activeElement = element;
      this.coordinateSpace.addChild(element, this.elementContainer);
      element.classList.add('selected');
      element.parentElement?.appendChild(element);
      this.showHandles();
    }
  }

  /**
   * @param {Element} element
   * @this VisualElementEditor
   */
  isSelected(element) {
    return element && this.activeElement === element;
  }

  /**
   * @this VisualElementEditor
   */
  getSelectedElementRect() {
    return this.activeElement?.getBoundingClientRect();
  }

  /**
   * @param {number} scale
   * @this VisualElementEditor
   */
  setScale(scale) {
    this.scale = scale;
  }

  /**
   * @param {object} delta
   * @param {number} delta.x
   * @param {number} delta.y
   * @param {number} index
   * @this VisualElementEditor
   */
  moveEdgeBy(delta, index) {
    delta = scalePoint(this.scale, delta);

    if (this.activeElement instanceof SVGRectElement) {
      switch (index) {
        case 1:
          {
            // left edge
            const w = this.activeElement.width.baseVal.value;
            const new_w = Math.max(10, w - delta.x);
            this.activeElement.x.baseVal.value -= new_w - w;
            this.activeElement.width.baseVal.value = new_w;
          }
          break;
        case 2:
          {
            // top edge
            const h = this.activeElement.height.baseVal.value;
            const new_h = Math.max(10, h - delta.y);
            this.activeElement.y.baseVal.value -= new_h - h;
            this.activeElement.height.baseVal.value = new_h;
          }
          break;
        case 3:
          {
            // right edge
            const w = this.activeElement.width.baseVal.value;
            const new_w = Math.max(10, w + delta.x);
            // this.activeElement.x.baseVal.value -= new_w - w;
            this.activeElement.width.baseVal.value = new_w;
          }
          break;
        case 4:
          {
            // bottom edge
            const h = this.activeElement.height.baseVal.value;
            const new_h = Math.max(10, h + delta.y);
            // this.activeElement.y.baseVal.value -= new_h - h;
            this.activeElement.height.baseVal.value = new_h;
          }
          break;
      }
    }

    this.updateHandles();
  }

  /**
   * @param {object} delta
   * @param {number} delta.x
   * @param {number} delta.y
   * @param {number} index
   * @this VisualElementEditor
   */
  moveVertexBy(delta, index) {
    delta = scalePoint(this.scale, delta);

    if (this.activeElement instanceof SVGPolygonElement) {
      // update point
      this.activeElement.points[index].x += delta.x;
      this.activeElement.points[index].y += delta.y;
      // update handle
      const point = this.coordinateSpace.childPointToContainerPoint(this.activeElement, scalePoint(1 / this.scale, this.activeElement.points[index]));
      this.handleList[1 + index].element.style.left = `${point.x - VisualElementEditorHandle.Size / 2}px`;
      this.handleList[1 + index].element.style.top = `${point.y - VisualElementEditorHandle.Size / 2}px`;
      // update size handle
      this.updateSizeHandle();
    }
  }

  /**
   * @param {object} delta
   * @param {number} delta.x
   * @param {number} delta.y
   * @this VisualElementEditor
   */
  moveSelectedElementBy(delta) {
    delta = scalePoint(this.scale, delta);

    if (this.activeElement instanceof HTMLElement) {
      this.activeElement.style.left = `${toFloat(this.activeElement.style.left, 0) + delta.x}px`;
      this.activeElement.style.top = `${toFloat(this.activeElement.style.top, 0) + delta.y}px`;
    }
    if (this.activeElement instanceof SVGCircleElement) {
      this.activeElement.cx.baseVal.value += delta.x;
      this.activeElement.cy.baseVal.value += delta.y;
    }
    if (this.activeElement instanceof SVGRectElement) {
      this.activeElement.x.baseVal.value += delta.x;
      this.activeElement.y.baseVal.value += delta.y;
    }
    if (this.activeElement instanceof SVGPolygonElement) {
      for (const point of this.activeElement.points) {
        point.x += delta.x;
        point.y += delta.y;
      }
    }

    this.updateHandles();
  }

  /**
   * @param {object} delta
   * @param {number} delta.x
   * @param {number} delta.y
   * @this VisualElementEditor
   */
  resizeSelectedElementBy(delta) {
    delta = scalePoint(this.scale, delta);

    if (this.activeElement instanceof SVGCircleElement) {
      this.activeElement.r.baseVal.value = Math.max(10, this.activeElement.r.baseVal.value + delta.x);
    }
    if (this.activeElement instanceof SVGRectElement) {
      const w = this.activeElement.width.baseVal.value;
      const h = this.activeElement.height.baseVal.value;
      const [new_w, new_h] = getProportionateDimensions(delta.x, w, h);
      if (w !== new_w && h !== new_h) {
        this.activeElement.width.baseVal.value = new_w;
        this.activeElement.height.baseVal.value = new_h;
        this.activeElement.x.baseVal.value -= (new_w - w) / 2;
        this.activeElement.y.baseVal.value -= (new_h - h) / 2;
      }
    }
    if (this.activeElement instanceof SVGPolygonElement) {
      let minX = this.activeElement.points[0].x;
      let maxX = this.activeElement.points[0].x;
      let minY = this.activeElement.points[0].y;
      let maxY = this.activeElement.points[0].y;
      for (const point of this.activeElement.points) {
        if (point.x < minX) minX = point.x;
        if (point.x > maxX) maxX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.y > maxY) maxY = point.y;
      }
      const w = maxX - minX;
      const h = maxY - minY;
      const [new_w, new_h] = getProportionateDimensions(delta.x * 2, w, h);
      if (w !== new_w && h !== new_h) {
        for (const point of this.activeElement.points) {
          const ratioX = (point.x - minX) / w;
          const ratioY = (point.y - minY) / h;
          point.x = minX + ratioX * new_w - (new_w - w) / 2;
          point.y = minY + ratioY * new_h - (new_h - h) / 2;
        }
      }
    }

    this.updateHandles();
  }

  hideHandles() {
    for (const handle of this.handleList) {
      handle.hide();
    }
  }

  showHandles() {
    if (this.activeElement instanceof HTMLElement) {
      this.handleList[0].show((delta) => {
        this.moveSelectedElementBy(delta);
      });
    } else {
      this.handleList[0].show((delta) => {
        this.resizeSelectedElementBy(delta);
      });
      if (this.activeElement instanceof SVGRectElement) {
        while (this.handleList.length < 1 + 4) {
          this.handleList.push(new VisualElementEditorHandle(this.editorHandleContainer, this));
        }
        for (let i = 0; i < 1 + 4; i++) {
          this.handleList[i].show((delta) => {
            this.moveEdgeBy(delta, i);
          });
        }
      }
      if (this.activeElement instanceof SVGPolygonElement) {
        while (this.handleList.length < 1 + this.activeElement.points.length) {
          this.handleList.push(new VisualElementEditorHandle(this.editorHandleContainer, this));
        }
        for (let i = 0; i < this.activeElement.points.length; i++) {
          this.handleList[1 + i].show((delta) => {
            this.moveVertexBy(delta, i);
          });
        }
      }
    }
    this.updateHandles();
  }

  updateHandles() {
    this.updateSizeHandle();

    if (this.activeElement instanceof SVGRectElement) {
      const point = this.coordinateSpace.childPointToContainerPoint(this.activeElement, scalePoint(1 / this.scale, toPoint(this.activeElement.x.baseVal.value, this.activeElement.y.baseVal.value)));
      const size = scalePoint(1 / this.scale, toPoint(this.activeElement.width.baseVal.value, this.activeElement.height.baseVal.value));
      // left edge
      this.handleList[1].element.style.left = `${point.x - VisualElementEditorHandle.Size / 2}px`;
      this.handleList[1].element.style.top = `${point.y + (size.y - VisualElementEditorHandle.Size) / 2}px`;
      // top edge
      this.handleList[2].element.style.left = `${point.x + (size.x - VisualElementEditorHandle.Size) / 2}px`;
      this.handleList[2].element.style.top = `${point.y - VisualElementEditorHandle.Size / 2}px`;
      // right edge
      this.handleList[3].element.style.top = `${point.y + (size.y - VisualElementEditorHandle.Size) / 2}px`;
      this.handleList[3].element.style.left = `${point.x + size.x - VisualElementEditorHandle.Size / 2}px`;
      // bottom edge
      this.handleList[4].element.style.left = `${point.x + (size.x - VisualElementEditorHandle.Size) / 2}px`;
      this.handleList[4].element.style.top = `${point.y + size.y - VisualElementEditorHandle.Size / 2}px`;
    }
    if (this.activeElement instanceof SVGPolygonElement) {
      for (let i = 0; i < this.activeElement.points.length; i++) {
        const point = this.coordinateSpace.childPointToContainerPoint(this.activeElement, scalePoint(1 / this.scale, this.activeElement.points[i]));
        this.handleList[1 + i].element.style.left = `${point.x - VisualElementEditorHandle.Size / 2}px`;
        this.handleList[1 + i].element.style.top = `${point.y - VisualElementEditorHandle.Size / 2}px`;
      }
    }
  }

  updateSizeHandle() {
    const rect = this.getSelectedElementRect();
    if (rect) {
      const point = this.coordinateSpace.globalPointToContainerPoint(toPoint(rect.x + rect.width + VisualElementEditorHandle.Size, rect.y + rect.height / 2 - VisualElementEditorHandle.Size / 2));
      this.handleList[0].element.style.left = `${point.x}px`;
      this.handleList[0].element.style.top = `${point.y}px`;
    }
  }
}

/**
 * @param {number} delta
 * @param {number} w
 * @param {number} h
 */
function getProportionateDimensions(delta, w, h) {
  const ratio = w / h;
  if (w < h) {
    const new_w = Math.max(10, w + delta);
    const new_h = new_w / ratio;
    return [new_w, new_h];
  } else {
    const new_h = Math.max(10, h + delta);
    const new_w = ratio * new_h;
    return [new_w, new_h];
  }
}
