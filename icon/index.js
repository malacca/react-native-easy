import React from 'react';
import {Animated, Text} from 'react-native';

/**
  非常简单的 Icon 组件, 需要原生导入一个 iconfont 的字体文件才能使用

  <Icon 
    text=""   // iconfont 文字, 也可以直接像 Text 那样使用
    ...       // 其他任意 Text 支持的属性
  />
  
  <Icon.Animated />  // 同上, 使用的是 Animated.Text
*/

function unicode(text) {
  if (!text) {
    return text;
  }
  return text.startsWith('&#x') && text.endsWith(';') ? String.fromCharCode(parseInt(text.substr(3, text.length - 4), 16)) : text;
}

function Icon(props) {
  const {text, style, children, ...rest} = props;
  return <Text {...rest} style={[style, {
    fontFamily:'iconfont',
  }]}>{unicode(children||text)}</Text>
}

Icon.Animated = (props) => {
  const {text, style, children, ...rest} = props;
  return <Animated.Text Text {...rest} style={[style, {
    fontFamily:'iconfont',
  }]}>{unicode(children||text)}</Animated.Text>
}

export default Icon;