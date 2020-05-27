import React from 'react';
import {Animated, Text} from 'react-native';

/**
 * 与 RN Text 一样, 只是在 ref 中新增了  setText(text) 方法
 * 对于嵌套组件较多, 而只需更新文字的情况, 可考虑使用该组件
 * 通过 ref.setText 来避免更新整个组件树
 */
export default React.forwardRef((props, ref) => {
  const textRef = React.useRef();
  const lastText = React.useRef();
  const stateText = React.useRef();
  const [update, forceUpdate] = React.useState();

  React.useImperativeHandle(ref, () => {
    const curt = textRef.current;
    curt.setText = (text) => {
      stateText.current = text;
      forceUpdate(!update);
    };
    return curt;
  });

  const {animated, children, ...rest} = props;
  let realChildren = stateText.current;
  if (children !== lastText.current) {
    realChildren = lastText.current = stateText.current = children;
  }
  rest.children = realChildren;
  rest.ref = textRef;
  return animated ? <Animated.Text {...rest}/> : <Text {...rest}/>
});
