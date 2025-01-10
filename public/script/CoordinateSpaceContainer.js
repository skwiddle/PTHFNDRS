import { NodeRef } from './lib/Node_Utility.js';

/**
 * @param {string} string
 * @param {number} default_value
 */
export function toInt(string, default_value) {
  const v = Number.parseInt(string);
  return Number.isNaN(v) ? default_value : v;
}

/**
 * @param {string} string
 * @param {number} default_value
 */
export function toFloat(string, default_value) {
  const v = Number.parseFloat(string);
  return Number.isNaN(v) ? default_value : v;
}

/**
 * @param {object} from_point
 * @param {number} from_point.x
 * @param {number} from_point.y
 * @param {object} to_point
 * @param {number} to_point.x
 * @param {number} to_point.y
 */
export function getDelta(from_point, to_point) {
  return toPoint(
    to_point.x - from_point.x,
    to_point.y - from_point.y,
    //
  );
}

/**
 * @param {number} scale
 * @param {object} point
 * @param {number} point.x
 * @param {number} point.y
 */
export function scalePoint(scale, point) {
  return toPoint(
    scale * point.x,
    scale * point.y,
    //
  );
}

/**
 * @param {number} x
 * @param {number} y
 */
export function toPoint(x, y) {
  return { x, y };
}

export class CoordinateSpaceContainer {
  /**
   * @param { Node } container
   */
  constructor(container) {
    try {
      this.container = NodeRef(container).as(HTMLElement);
    } catch (error) {
      this.container = NodeRef(container).as(SVGElement);
    }
  }

  parentMap = new Map();
  addChild(child, parent) {
    if (parent && this.parentMap.has(child) === false) {
      this.parentMap.set(child, parent);
    }
  }
  getParentTree(child) {
    const tree = [];
    let parent = this.parentMap.get(child);
    while (parent) {
      tree.push(parent);
      parent = this.parentMap.get(parent);
    }
    return tree;
  }

  /**
   * @param {HTMLElement|SVGElement} child
   * @this CoordinateSpaceContainer
   */
  deltaChildCenterToContainerCenter(child) {
    return getDelta(
      this.childPointToContainerPoint(child, this.childPercentagesToChildPoint(child, toPoint(0.5, 0.5))),
      this.containerPercentagesToContainerPoint(toPoint(0.5, 0.5)),
      //
    );
  }

  /**
   * @param {HTMLElement|SVGElement} child
   * @param {object} point
   * @param {number} point.x
   * @param {number} point.y
   * @this CoordinateSpaceContainer
   */
  deltaChildPointToContainerCenter(child, point) {
    return getDelta(
      this.childPointToContainerPoint(child, point),
      this.containerPercentagesToContainerPoint(toPoint(0.5, 0.5)),
      //
    );
  }

  /**
   * @param {object} point
   * @param {number} point.x
   * @param {number} point.y
   * @this CoordinateSpaceContainer
   */
  deltaGlobalPointToContainerCenter(point) {
    return this.deltaGlobalPointToContainerPoint(point, this.containerPercentagesToContainerPoint(toPoint(0.5, 0.5)));
  }

  /**
   * @param {object} global_point
   * @param {number} global_point.x
   * @param {number} global_point.y
   * @param {object} container_point
   * @param {number} container_point.x
   * @param {number} container_point.y
   * @this CoordinateSpaceContainer
   */
  deltaGlobalPointToContainerPoint(global_point, container_point) {
    return getDelta(
      global_point,
      this.containerPointToGlobalPoint(container_point),
      //
    );
  }

  /**
   * @param {HTMLElement|SVGElement} child
   * @param {object} point
   * @param {number} point.x
   * @param {number} point.y
   * @this CoordinateSpaceContainer
   */
  childPointToChildPercentages(child, point) {
    const rect = child.getBoundingClientRect();
    return toPoint(
      point.x / rect.width,
      point.y / rect.height,
      //
    );
  }

  /**
   * @param {HTMLElement|SVGElement} child
   * @param {object} percentage
   * @param {number} percentage.x as a decimal
   * @param {number} percentage.y as a decimal
   * @this CoordinateSpaceContainer
   */
  childPercentagesToChildPoint(child, percentage) {
    const rect = child.getBoundingClientRect();
    return toPoint(
      percentage.x * rect.width,
      percentage.y * rect.height,
      //
    );
  }

  /**
   * @param {HTMLElement|SVGElement} child
   * @param {object} point
   * @param {number} point.x
   * @param {number} point.y
   */
  childPointToContainerPoint(child, point) {
    const new_point = toPoint(
      point.x + toFloat(child.style.left, 0),
      point.y + toFloat(child.style.top, 0),
      //
    );
    for (const parent of this.getParentTree(child)) {
      new_point.x += toFloat(parent.style.left, 0);
      new_point.y += toFloat(parent.style.top, 0);
    }
    return new_point;
    // return toPoint(
    //   toFloat(child.style.left, 0) + point.x,
    //   toFloat(child.style.top, 0) + point.y,
    //   //
    // );
  }

  /**
   * @param {HTMLElement|SVGElement} child
   * @param {object} point
   * @param {number} point.x
   * @param {number} point.y
   * @this CoordinateSpaceContainer
   */
  childPointToGlobalPoint(child, point) {
    return this.containerPointToGlobalPoint(this.childPointToContainerPoint(child, point));
  }

  /**
   * @param {object} point
   * @param {number} point.x
   * @param {number} point.y
   * @this CoordinateSpaceContainer
   */
  containerPointToContainerPercentages(point) {
    const rect = this.container.getBoundingClientRect();
    return toPoint(
      point.x / rect.width,
      point.y / rect.height,
      //
    );
  }

  /**
   * @param {object} percentage
   * @param {number} percentage.x as a decimal
   * @param {number} percentage.y as a decimal
   * @this CoordinateSpaceContainer
   */
  containerPercentagesToContainerPoint(percentage) {
    const rect = this.container.getBoundingClientRect();
    return toPoint(
      percentage.x * rect.width,
      percentage.y * rect.height,
      //
    );
  }

  /**
   * @param {object} point
   * @param {number} point.x
   * @param {number} point.y
   * @this CoordinateSpaceContainer
   */
  containerPointToGlobalPoint(point) {
    const rect = this.container.getBoundingClientRect();
    return toPoint(
      rect.x + point.x,
      rect.y + point.y,
      //
    );
  }

  /**
   * @param {HTMLElement|SVGElement} child
   * @param {object} point
   * @param {number} point.x
   * @param {number} point.y
   * @this CoordinateSpaceContainer
   */
  globalPointToChildPoint(child, point) {
    const container = this.globalPointToContainerPoint(point);
    return toPoint(
      container.x - toFloat(child.style.left, 0),
      container.y - toFloat(child.style.top, 0),
      //
    );
  }

  /**
   * @param {object} point
   * @param {number} point.x
   * @param {number} point.y
   * @this CoordinateSpaceContainer
   */
  globalPointToContainerPoint(point) {
    const rect = this.container.getBoundingClientRect();
    return toPoint(
      point.x - rect.x,
      point.y - rect.y,
      //
    );
  }
}
