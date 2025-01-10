import { CoordinateSpaceContainer, getDelta, scalePoint, toFloat, toPoint } from './CoordinateSpaceContainer.js';
import { NodeRef } from './lib/Node_Utility.js';
import { setupPointerEvents } from './PointerEvents.js';

export class ZoomController {
  /**
   * @param {HTMLElement} container_element
   * @param {HTMLElement} child_element
   * @param {object} options
   * @param {boolean=} options.enable_edge_clamping false
   * @param {number=} options.zoom_min 0.1
   * @param {number=} options.zoom_max 2
   * @param {number=} options.zoom_delta 0.5
   * @param {(scale:number)=>number=} options.zoom_delta_function () => options.zoom_delta
   */
  constructor(container_element, child_element, options) {
    this.containerRef = NodeRef(container_element);
    this.container = this.containerRef.as(HTMLElement);
    this.childRef = NodeRef(child_element);
    this.child = this.childRef.as(HTMLElement);
    this.options = {
      enable_edge_clamping: options.enable_edge_clamping ?? false,
      zoom_max: options.zoom_max ?? 2,
      zoom_min: options.zoom_min ?? 0.1,
      zoom_delta: options.zoom_delta ?? 0.5,
      zoom_delta_function: options.zoom_delta_function,
    };

    this.child_original_rectangle = this.child.getBoundingClientRect();

    // setup the coordinate space
    this.coordinateSpace = new CoordinateSpaceContainer(this.container);
    this.coordinateSpace.addChild(this.child);

    // setup window resize event
    const self = this;
    let oldContainerRect = self.container.getBoundingClientRect();
    function onResize() {
      const newContainerRect = self.container.getBoundingClientRect();
      // this math took forever
      // basically, it's getting the centers of the old and new container sizes and
      // offsetting those distances to the map's left and top values
      const old_center = toPoint(0.5 * oldContainerRect.width, 0.5 * oldContainerRect.height);
      const new_center = toPoint(0.5 * newContainerRect.width, 0.5 * newContainerRect.height);
      self.moveDelta(getDelta(old_center, new_center));
      oldContainerRect = newContainerRect;
    }
    window.addEventListener('resize', onResize);
  }

  // Events

  /**
   * @param {(event:Event,point:{x:number;y:number;},consumeEvent:()=>void)=>void} fn
   * @this ZoomController
   */
  setClickListener(fn) {
    this.onClick = fn;
  }

  /**
   * @param {(event:Event,delta:{x:number;y:number;},consumeEvent:()=>void)=>void} fn
   * @this ZoomController
   */
  setDragListener(fn) {
    this.onDrag = fn;
  }

  /**
   * @param {(scale:number,point:{x:number,y:number})=>void} fn
   * @this ZoomController
   */
  setTransformListener(fn) {
    this.onTransform = fn;
  }

  // Parse Values

  /**
   * @this ZoomController
   */
  parse_position() {
    return toPoint(this.parse_x(), this.parse_y());
  }

  /**
   * @this ZoomController
   */
  parse_scale() {
    const scaleIndex = this.child.style.transform.indexOf('scale(');
    if (scaleIndex !== -1) {
      const scaleStart = scaleIndex + 'scale('.length;
      const scaleEnd = this.child.style.transform.indexOf(')', scaleStart);
      const scaleText = this.child.style.transform.slice(scaleStart, scaleEnd).trim();
      return toFloat(scaleText, 1);
    }
    return 1;
  }

  /**
   * @this ZoomController
   */
  parse_x() {
    return toFloat(this.child.style.left, 0);
  }

  /**
   * @this ZoomController
   */
  parse_y() {
    return toFloat(this.child.style.top, 0);
  }

  // Transform Functions

  /**
   * @this ZoomController
   */
  centerChild() {
    this.setTransform(this.parse_scale(), this.coordinateSpace.deltaChildCenterToContainerCenter(this.child));
  }

  /**
   * @param {number} scale
   * @param {object} point
   * @param {number} point.x
   * @param {number} point.y
   * @this ZoomController
   */
  clampCoordinates(scale, point) {
    if (this.options.enable_edge_clamping === true) {
      const containerRect = this.container.getBoundingClientRect();

      const width = this.child_original_rectangle.width * scale;
      if (width > containerRect.width) {
        point.x = Math.min(0, Math.max(point.x, containerRect.width - width));
      } else {
        point.x = 0.5 * (containerRect.width - width);
      }

      const height = this.child_original_rectangle.height * scale;
      if (height > containerRect.height) {
        point.y = Math.min(0, Math.max(point.y, containerRect.height - height));
      } else {
        point.y = 0.5 * (containerRect.height - height);
      }
    }
    return point;
  }

  /**
   * @param {object} point
   * @param {number} point.x
   * @param {number} point.y
   * @this ZoomController
   */
  zoomIn(point) {
    const scale = this.parse_scale();
    const delta_zoom_clamped = this.options.zoom_delta_function?.(scale) ?? this.options.zoom_delta;
    const scale_clamped = Math.min(this.options.zoom_max, Math.max(scale + delta_zoom_clamped, this.options.zoom_min));
    this.zoomTo(scale_clamped, point);
  }

  /**
   * @param {object} point
   * @param {number} point.x
   * @param {number} point.y
   * @this ZoomController
   */
  zoomOut(point) {
    const scale = this.parse_scale();
    const delta_zoom_clamped = -1 * (this.options.zoom_delta_function?.(scale) ?? this.options.zoom_delta);
    const scale_clamped = Math.min(this.options.zoom_max, Math.max(scale + delta_zoom_clamped, this.options.zoom_min));
    this.zoomTo(scale_clamped, point);
  }

  /**
   * @param {number} new_scale
   * @param {object} point
   * @param {number} point.x
   * @param {number} point.y
   * @this ZoomController
   */
  zoomTo(new_scale, point) {
    const scale = this.parse_scale();
    const x = this.parse_x();
    const y = this.parse_y();

    const new_scale_clamped = Math.min(this.options.zoom_max, Math.max(new_scale, this.options.zoom_min));

    // current point > child point > scaled child point > scaled point
    const child_point = this.coordinateSpace.globalPointToChildPoint(this.child, point);
    const child_point_scaled = scalePoint(new_scale_clamped / scale, child_point);
    const point_scaled = this.coordinateSpace.childPointToGlobalPoint(this.child, child_point_scaled);

    // delta from scaled point to current point
    const delta_point = getDelta(point_scaled, point);

    this.setTransform(new_scale_clamped, toPoint(x + delta_point.x, y + delta_point.y));
  }

  /**
   * @param {object} delta_point
   * @param {number} delta_point.x
   * @param {number} delta_point.y
   * @this ZoomController
   */
  moveDelta(delta_point) {
    this.setTransform(this.parse_scale(), toPoint(this.parse_x() + delta_point.x, this.parse_y() + delta_point.y));
  }

  /**
   * @param {object} point
   * @param {number} point.x
   * @param {number} point.y
   * @this ZoomController
   */
  moveTo(point) {
    this.setTransform(this.parse_scale(), point);
  }

  /**
   * @param {number} scale
   * @this ZoomController
   */
  setScale(scale) {
    const scale_clamped = Math.min(this.options.zoom_max, Math.max(scale, this.options.zoom_min));
    this.setTransform(scale_clamped, this.parse_position());
  }

  /**
   * @param {object} point
   * @param {number} point.x
   * @param {number} point.y
   */
  setPosition(point) {
    this.setTransform(this.parse_scale(), point);
  }

  /**
   * @this ZoomController
   */
  getTransform() {
    return { scale: this.parse_scale(), point: this.parse_position() };
  }

  /**
   * @param {number} scale
   * @param {object} point
   * @param {number} point.x
   * @param {number} point.y
   * @this ZoomController
   */
  setTransform(scale, point) {
    const clamped_point = this.clampCoordinates(scale, point);
    this.child.style.left = `${clamped_point.x}px`;
    this.child.style.top = `${clamped_point.y}px`;
    this.child.style.transform = `scale(${scale})`;
    if (this.onTransform) {
      this.onTransform(scale, clamped_point);
    }
  }

  /**
   * @this ZoomController
   */
  clearEvents() {
    if (this.clearPointerEvents) {
      this.clearPointerEvents();
      delete this.clearPointerEvents;
    }
  }

  /**
   * @this ZoomController
   */
  setupEvents() {
    const self = this;
    this.clearPointerEvents = setupPointerEvents(self.container, {
      onClick(event, point) {
        self.onClick?.(event, point, () => {});
      },
      onContextMenu(event) {
        event.preventDefault();
      },
      onDrag(event, delta) {
        event.preventDefault();
        let eventConsumed = false;
        self.onDrag?.(event, delta, () => {
          eventConsumed = true;
        });
        if (eventConsumed === false) {
          self.moveDelta(delta);
        }
      },
      onMiddleDown(event, point) {
        event.preventDefault();
        self.moveDelta(self.coordinateSpace.deltaGlobalPointToContainerCenter(point));
      },
      onPinch(event, delta, center) {
        event.preventDefault();
        if (delta < -1 || delta > 1) {
          self.zoomTo(self.parse_scale() + delta / 500, center);
        }
      },
      onScroll(event, delta, point) {
        event.preventDefault();
        if (delta < 0) {
          self.zoomIn(point);
        } else if (delta > 0) {
          self.zoomOut(point);
        }
      },
    });
  }
}
