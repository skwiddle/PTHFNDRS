/**
 * @param {HTMLElement|SVGElement} element
 * @param {object} listeners
 * @param {(event:Event)=>void=} listeners.onContextMenu
 * @param {(event:Event,point:{x:number;y:number;})=>void=} listeners.onClick
 * @param {(event:Event,delta:{x:number;y:number;})=>void=} listeners.onDrag
 * @param {(event:Event,delta:number,center:{x:number;y:number;})=>void=} listeners.onPinch
 * @param {(event:Event,delta:number,point:{x:number;y:number;})=>void=} listeners.onScroll
 * @param {(event:Event,point:{x:number;y:number;})=>void=} listeners.onPointerDown
 * @param {(event:Event,point:{x:number;y:number;})=>void=} listeners.onPointerUp
 * @param {(event:Event,point:{x:number;y:number;})=>void=} listeners.onMiddleDown
 * @param {(event:Event,point:{x:number;y:number;})=>void=} listeners.onMiddleUp
 * @param {(event:Event,point:{x:number;y:number;})=>void=} listeners.onRightDown
 * @param {(event:Event,point:{x:number;y:number;})=>void=} listeners.onRightUp
 */
export function setupPointerEvents(element, listeners) {
  let dragStart = { x: 0, y: 0 };
  let pinchStart = 0;

  /**
   * @type {Map<number,{x:number,y:number}>}
   */
  const pointers = new Map();
  /**
   * @param {PointerEvent} event
   */
  function pointersAdd(event) {
    pointersSet(event);
    element.removeEventListener('pointerup', clickHandler);
    window.removeEventListener('pointermove', dragHandler);
    window.removeEventListener('pointermove', pinchHandler);
    switch (pointers.size) {
      case 1:
        dragStart = { x: event.clientX, y: event.clientY };
        element.addEventListener('pointerup', clickHandler);
        window.addEventListener('pointermove', dragHandler);
        window.addEventListener('pointerup', upHandler);
        window.addEventListener('pointercancel', cancelHandler);
        break;
      case 2:
        pinchStart = getPinchDistance();
        window.addEventListener('pointermove', pinchHandler);
        break;
    }
  }
  function pointersClear() {
    pointers.clear();
    element.removeEventListener('pointerup', clickHandler);
    window.removeEventListener('pointermove', dragHandler);
    window.removeEventListener('pointermove', pinchHandler);
    window.removeEventListener('pointerup', upHandler);
    window.removeEventListener('pointercancel', cancelHandler);
  }
  /**
   * @param {PointerEvent} event
   */
  function pointersDelete(event) {
    pointers.delete(event.pointerId);
    window.removeEventListener('pointermove', dragHandler);
    window.removeEventListener('pointermove', pinchHandler);
  }
  /**
   * @param {PointerEvent} event
   */
  function pointersSet(event) {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }
  function getPinchCenter() {
    const [pointer1, pointer2] = [...pointers.values()];
    // Calculate the center point between the two pointers
    const x = (pointer1.x + pointer2.x) / 2;
    const y = (pointer1.y + pointer2.y) / 2;
    return { x, y };
  }
  function getPinchDistance() {
    const [pointer1, pointer2] = [...pointers.values()];
    // Calculate the distance between the two pointers (pinch distance)
    const dx = pointer2.x - pointer1.x;
    const dy = pointer2.y - pointer1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * @param {PointerEvent} event
   */
  function clickHandler(event) {
    pointersClear();
    listeners.onClick?.(event, { x: event.clientX, y: event.clientY });
  }

  /**
   * @param {PointerEvent} event
   */
  function dragHandler(event) {
    element.removeEventListener('pointerup', clickHandler);
    if (event.target instanceof Element) {
      event.target.setPointerCapture(event.pointerId);
    }
    pointersSet(event);
    const dragEnd = { x: event.clientX, y: event.clientY };
    const dragDelta = { x: dragEnd.x - dragStart.x, y: dragEnd.y - dragStart.y };
    listeners.onDrag?.(event, dragDelta);
    dragStart = dragEnd;
  }

  /**
   * @param {PointerEvent} event
   */
  function pinchHandler(event) {
    pointersSet(event);
    const pinchDistance = getPinchDistance();
    listeners.onPinch?.(event, pinchDistance - pinchStart, getPinchCenter());
    pinchStart = pinchDistance;
  }

  /**
   * @param {PointerEvent} event
   */
  function downHandler(event) {
    if (event.pointerType === 'mouse') {
      switch (event.button) {
        case 1: // middle click
          listeners.onMiddleDown?.(event, { x: event.clientX, y: event.clientY });
          return;
        case 2: // right click
          listeners.onRightDown?.(event, { x: event.clientX, y: event.clientY });
          return;
      }
    }
    pointersAdd(event);
    listeners.onPointerDown?.(event, { x: event.clientX, y: event.clientY });
  }

  /**
   * @param {PointerEvent} event
   */
  function upHandler(event) {
    if (event.pointerType === 'mouse') {
      switch (event.button) {
        case 1: // middle click
          listeners.onMiddleUp?.(event, { x: event.clientX, y: event.clientY });
          return;
        case 2: // right click
          listeners.onRightUp?.(event, { x: event.clientX, y: event.clientY });
          return;
      }
    }
    pointersDelete(event);
    listeners.onPointerUp?.(event, { x: event.clientX, y: event.clientY });
  }

  /**
   * @param {PointerEvent} event
   */
  function cancelHandler(event) {
    pointersClear();
  }

  /**
   * @param {MouseEvent} event
   */
  function contextmenuHandler(event) {
    listeners.onContextMenu?.(event);
  }

  /**
   * @param {WheelEvent} event
   */
  function scrollHandler(event) {
    listeners.onScroll?.(event, event.deltaY, { x: event.clientX, y: event.clientY });
  }

  element.addEventListener('contextmenu', contextmenuHandler);
  element.addEventListener('pointerdown', downHandler);
  element.addEventListener('wheel', scrollHandler);

  return () => {
    element.removeEventListener('contextmenu', contextmenuHandler);
    element.removeEventListener('pointerdown', downHandler);
    element.removeEventListener('wheel', scrollHandler);
    element.removeEventListener('pointerup', clickHandler);
    window.removeEventListener('pointerup', upHandler);
    window.removeEventListener('pointercancel', cancelHandler);
    window.removeEventListener('pointermove', dragHandler);
    window.removeEventListener('pointermove', pinchHandler);
  };
}
