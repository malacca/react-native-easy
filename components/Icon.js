import React from 'react';
import {textSize} from './../utils/normalizeText';
import {StyleSheet, Animated, TouchableOpacity, Text} from 'react-native';

/**
  非常简单的 Icon 组件, 需要原生导入一个 iconfont 的字体文件才能使用

  <Icon 
    text=""   // iconfont 文字
    size={Number} color="" textStyle={{}} // 文字样式
    onPress={} activeOpacity={} touchProps={{}} touchStyle={{}} // 若有 onPress 事件, 设置 TouchableOpacity 样式/属性
    disabled disableColor="" disabledStyle={{}} // 有 onPress 可以 disabled, 并可设置 disabled 样式
    ...other text support props
  />  
 */
export default Icon = (props) => {
  const {
    text,
    size,
    color,
    textStyle,

    onPress,
    activeOpacity,
    touchProps,
    touchStyle,

    disabled,
    disableColor,
    disabledStyle,

    ...textProps
  } = props;

  let animated = false;
  const style = StyleSheet.flatten([textStyle||{
    fontSize:textSize
  }, {
    fontFamily:'iconfont',
    fontSize: size,
    color: onPress && disabled ? disableColor||color : color
  }]);
  
  // 看看是否有 Animated.value 类型的 样式值
  for (let k in style) {
    if (style.hasOwnProperty(k) && style[k] !== null && typeof style[k] === 'object') {
      animated = true;
      break;
    }
  }

  // unicode 转换
  let unicodeText = text.startsWith('&#x') && text.endsWith(';') ? String.fromCharCode(parseInt(text.substr(3, text.length - 4), 16)) : text;

  // 没有绑定事件, 返回 Text 组件即可
  const iconProps = {...textProps, style};
  const icon = animated ? <Animated.Text {...iconProps}>{unicodeText}</Animated.Text> : <Text {...iconProps}>{unicodeText}</Text>;
  if (!onPress) {
    return icon;
  }

  // 有事件
  let wrapProps = {
    onPress,
    disabled,
    activeOpacity
  };
  if (disabled && disabledStyle) {
    wrapProps.style = disabledStyle;
  } else if (!disabled && touchStyle) {
    wrapProps.style = touchStyle;
  }
  if (touchProps) {
    wrapProps = {...wrapProps, ...touchProps}
  }
  return <TouchableOpacity {...wrapProps}>{icon}</TouchableOpacity>
}
