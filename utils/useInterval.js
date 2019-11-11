import React, {useEffect, useRef} from 'react';

/**
  RN hook 组件的 setInterval

  例:
  import React, { useState } from 'react';

  function Counter() {
    let [count, setCount] = useState(0);

    useInterval(() => {
      setCount(count + 1);
    }, 1000);

    return <h1>{count}</h1>;
  }
 */
export default useInterval = (callback, delay) => {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    if (delay !== null) {
      let id = setInterval(() => {
        savedCallback.current();
      }, delay);
      return () => clearInterval(id)
    }
  }, [delay]);
}