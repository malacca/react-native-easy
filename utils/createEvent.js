/**
 * 创建一个可以 preventDefault 的 event
 * 用于回调参数, 可以让回调函数阻止默认响应, 如
 * 
 * onCallback(data)
 * doSomething()
 * 
 * 可以
 * 
 * const event = createEvent(data)
 * onCallback(event)
 * if (!event.defaultPrevented) {
 *  doSomething()
 * }
 * 
 */
export default function createEvent(data, type) {
  const event = {
    get type() {
      return type;
    },
  };
  let defaultPrevented = false;
  Object.defineProperties(event, {
    defaultPrevented: {
      enumerable: true,
      get() {
        return defaultPrevented;
      },
    },
    preventDefault: {
      enumerable: true,
      value() {
        defaultPrevented = true;
      },
    },
  });
  Object.defineProperty(event, 'data', {
    enumerable: true,
    get() {
      return data;
    },
  });
  return event;
}