import React from 'react';
import splitStyle from './../utils/splitStyle';
import {StyleSheet, TouchableWithoutFeedback, Image, View, Text} from 'react-native';

// 分离样式 返回 {wrapStyle, textStyle, backgroundImage, backgroundStyle}
const resolveSplit = (styles) => {
  const {backgroundImage, backgroundMode='stretch', backgroundStyle={}, ...sheets} = styles;
  const splits = splitStyle(sheets);
  if (!('resizeMode' in backgroundStyle)) {
    backgroundStyle.resizeMode = backgroundMode;
  }
  splits.backgroundImage = backgroundImage;
  splits.backgroundStyle = backgroundStyle;
  return splits;
}

// 寻找差异 返回 basic 和 三个状态下的 style
const resolveStyles = (basic, press, long) => {
  const normal = {};
  let key;
  for (key in press) {
    normal[key] = key in basic ? basic[key] : null;
  }
  for (key in long) {
    if (!(key in normal)) {
      normal[key] = key in basic ? basic[key] : null;
    }
  }
  return {basic, normal, press, long};
}

// 三种状态下的 背景图
const resolveBackgroundImg = (normal, press, long) => {
  // press 背景图 与 normal 背景图的 source || style 不同
  const pressImage = press.backgroundImage && !isSameSource(
    normal.backgroundImage, 
    press.backgroundImage
  ) ? press.backgroundImage : (normal.backgroundImage && !isSameStyle(
    normal.backgroundStyle, 
    press.backgroundStyle
  ) ? normal.backgroundImage : null);
  const pressStyle = pressImage ? StyleSheet.flatten(
    [normal.backgroundStyle, press.backgroundStyle]
  ) : {};

  // long 背景图 与 上一帧 背景图的 source || style 不同
  const prevImage = pressImage ? pressImage : normal.backgroundImage;
  const prevStyle = pressImage ? pressStyle : normal.backgroundStyle;
  const longImage = long.backgroundImage && !isSameSource(
    prevImage,
    long.backgroundImage
  ) ? long.backgroundImage : (prevImage && !isSameStyle(
    prevStyle, 
    long.backgroundStyle
  ) ? prevImage : null);
  const longStyle = longImage ? StyleSheet.flatten(
    [prevStyle, long.backgroundStyle]
  ) : {};

  return {
    basic: {
      image: normal.backgroundImage,
      style: normal.backgroundStyle
    },
    normal: {
      image: null,
      style: {}
    },
    press: {
      image: pressImage,
      style: pressStyle
    },
    long: {
      image: longImage,
      style: longStyle
    }
  };
}
const isSameSource = (src, dst) => {
  if (typeof src === 'object' && typeof dst === 'object') {
    return src.uri === dst.uri;
  }
  return src === dst;
}
const isSameStyle = (src, dst) => {
  if (!dst) {
    return true;
  }
  for (let k in dst) {
    if (!(k in src) || dst[k] !== src[k]) {
      return false;
    }
  }
  return true;
}

// 更智能一点, 若指定了 button background, 
// 自动给 pressStyle 加一个比 background 稍深一点的颜色
// 如果 pressStyle 手动指定了, 则以指定为准
const getDarkenColor = (color) => {
  const rgba = getRgba(color);
  if (!rgba) {
    return null;
  }
  const darken = [
    Math.max(0, rgba[0] - 8),
    Math.max(0, rgba[1] - 8),
    Math.max(0, rgba[2] - 8)
  ];
  let prefix = 'rgb';
  if (rgba[3] * 1 !== 1) {
    prefix += 'a';
    darken.push(rgba[3])
  }
  return prefix + '(' + darken.join(',') + ')';
}
const getRgba = (color) => {
  color = color.trim();
  if (color[0] === '#') {
    if (color.length < 7)	{
      color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3] + (color.length > 4 ? color[4] + color[4] : '');
    }
    return [
      parseInt(color.substr(1, 2), 16),
			parseInt(color.substr(3, 2), 16),
			parseInt(color.substr(5, 2), 16),
			color.length > 7 ? parseInt(color.substr(7, 2), 16)/255 : 1
    ];
  } else if (color.indexOf('rgb') === 0) {
    if (color.indexOf('rgba') === -1) {
      color += ',1';
    }
		return color.match(/[\.\d]+/g).map(function (a){
			return +a
		});
  }
  return null;
}

// 解析 button 不同状态的 style
const parseStyle = (style, disableStyle, pressStyle, longPressStyle, disabled) => {
  // 禁用, 无动态样式, 仅返回 basic 即可
  if (disabled) {
    const sheets = StyleSheet.flatten([styles.normal, style, styles.disable, disableStyle]);
    return {basic: resolveSplit(sheets)}
  }

  // 自动加深 press backgroundColor
  style = StyleSheet.flatten([styles.normal, style]);
  pressStyle = StyleSheet.flatten(pressStyle||{});
  if (style.backgroundColor && !pressStyle.backgroundColor) {
    const darken = getDarkenColor(style.backgroundColor);
    if (darken) {
      pressStyle.backgroundColor = darken;
    }
  }

  // 格式化三种状态的样式
  const normal = resolveSplit(style);
  const press = resolveSplit(pressStyle);
  const long = resolveSplit(longPressStyle||{});

  // 获取三种状态样式
  const wrapStyle = resolveStyles(
    normal.wrapStyle,
    press.wrapStyle,
    long.wrapStyle
  );
  const textStyle = resolveStyles(
    normal.textStyle,
    press.textStyle,
    long.textStyle
  );

  // 获取三种状态下背景图
  const background = resolveBackgroundImg(normal, press, long);

  const flatten = {};
  ['basic', 'normal', 'press', 'long'].forEach(key => {
    flatten[key] = {
      wrapStyle: wrapStyle[key],
      textStyle: textStyle[key],
      backgroundImage: background[key].image,
      backgroundStyle: background[key].style
    }
  })
  return flatten;
}

/** 
  防 html button
  可为每个状态定义样式, 与原生 Button 相比
    1. style 中可直接 定义 fontSize,color 等文字样式, 如果 title 为 string, 则直接应用
       若 title 为组件, 则会调用约定的 `onPress` 方法, 参数为 title 样式
    2. 可为按钮添加背景图, 且点击可切换背景图
       背景图通过 backgroundImage / backgroundMode='stretch' / backgroundStyle 设置样式

  <Button 
    title="按钮"    // title 可设置为字符串 或 组件, 也可以不指定, 因为 style 可以设置背景图, 可完全让图片充当 Button
    textProps={...Text support props} // title 为字符串, 将绑定到 Text 组件上, 否则将传递给自定义组件
    allowFontScaling={} 

    style={} 
    pressStyle={} 
    longPressStyle={} 
    disableStyle={}
    disabled={}

    ...TouchableWithoutFeedback support props
  />
 */
export default class Button extends React.PureComponent {

  // 动态 disable
  state = {
    disabled: null
  }
  isDisabled = () => {
    return Boolean(this.state.disabled === null ? this.props.disabled : this.state.disabled)
  }
  setDisable = (disable) => {
    if (disable !== this.state.disabled) {
      this.setState({
        disabled:disable
      })
    }
  }

  // 获取自定义的子组件
  getChildren = () => {
    return this.refs.sub;
  }

  // 动态修改样式
  _changeStyle = (type) => {
    const flatten = this._flattenStyles;
    const {textStyle, wrapStyle} = flatten[type];

    // 修改 wrap text
    this.refs.button.setNativeProps({
      style: wrapStyle
    });

    // 修改 children
    if (this._subPress === 2) {
      if (this.refs.sub.onPress && typeof this.refs.sub.onPress === 'function') {
        this._subPress = this.refs.sub.onPress.bind(this.refs.sub);
        this._subPress(textStyle, type)
      } else {
        this._subPress = 0;
      }
    } else if (this._subPress === 1) {
      this.refs.text.setNativeProps({
        style: textStyle
      });
    } else if (this._subPress !== 0) {
      this._subPress(textStyle, type)
    }

    // 修改背景图
    let prev = null, next = null;
    const press = this._buttonPress;
    if (type === 'normal') {
      prev = press;
      next = flatten.basic.backgroundImage ? 'normal' : null;
    } else if (flatten[type].backgroundImage) {
      prev = press;
      next = type;
    }
    if (prev) {
      this.refs[prev].setNativeProps({
        opacity: 0
      });
    }
    if (next) {
      this.refs[next].setNativeProps({
        opacity: flatten[next === 'normal' ? 'basic' : next].backgroundStyle.opacity||1
      });
      this._buttonPress = next;
    } else if (type === 'normal') {
      this._buttonPress = null;
    }
  }

  render() {
    const {
      title:Sub,    // title 可以设置为 string 或一个 RN Componet 函数
      textProps,    // textProps 将整体作为 props 传递给 title
      allowFontScaling=false, 

      style,
      pressStyle,
      longPressStyle,
      disableStyle,
      disabled,

      onPress,
      onPressIn,
      onPressOut,
      onLongPress,
      ...props // 其他 TouchableWithoutFeedback 支持的属性
    } = this.props;

    // 解析样式
    const realDisabled = this.state.disabled === null ? disabled : this.state.disabled;
    const flatten = parseStyle(style, disableStyle, pressStyle, longPressStyle, realDisabled);
    const {textStyle, wrapStyle, backgroundImage, backgroundStyle} = flatten.basic;

    // 按钮 样式/事件, 事件的 context 将修改为 Button 组件
    const wrapProps = {
      style: wrapStyle
    };
    props.disabled = realDisabled;
    if (!realDisabled) {
      wrapProps.ref = "button";
      props.onPress = (e) => {
        onPress && onPress.call(this, e)
      };
      props.onPressIn = (e) => {
        this._changeStyle('press');
        onPressIn && onPressIn.call(this, e)
      };
      if (longPressStyle) {
        props.onLongPress = (e) => {
          this._changeStyle('long');
          onLongPress && onLongPress.call(this, e);
        }
      } else {
        props.onLongPress = onLongPress;
      }
      props.onPressOut = (e) => {
        this._changeStyle('normal');
        onPressOut && onPressOut.call(this, e)
      };
    }

    // 按钮背景图
    const background = [];
    if (backgroundImage) {
      background.push(<Image 
        ref = "normal"
        key = "_normal"
        source={backgroundImage}
        style={[backgroundStyle, StyleSheet.absoluteFill]}
      />)
    }
    if (!realDisabled) {
      const {backgroundImage:img1, backgroundStyle:css1} = flatten.press;
      if (img1) {
        background.push(<Image 
          ref = "press"
          key = "_press"
          source={img1}
          style={[css1, StyleSheet.absoluteFill, {opacity: 0}]}
        />)
      }
      const {backgroundImage:img2, backgroundStyle:css2} = flatten.long;
      if (img2) {
        background.push(<Image 
          ref = "long"
          key = "_long"
          source={img2}
          style={[css2, StyleSheet.absoluteFill, {opacity: 0}]}
        />)
      }
    }

    // 子组件
    let subPress = 0, subView;
    if (Sub) {
      const subViewProps = {...textProps, style: textStyle};
      if (!('allowFontScaling' in subViewProps) && typeof allowFontScaling === "boolean") {
        subViewProps.allowFontScaling = allowFontScaling;
      }
      if (typeof Sub === 'string') {
        if (!realDisabled) {
          subPress = 1;
          subViewProps.ref = "text";
        }
        subView = <Text {...subViewProps}>{Sub}</Text>
      } else {
        subViewProps.button = this;
        if (!realDisabled) {
          subPress = 2;
          subViewProps.ref = "sub";
        }
        subView = <Sub {...subViewProps} />
      }
    }

    // 记录状态 返回组件
    this._subPress = subPress;
    this._flattenStyles = flatten;
    this._buttonPress = backgroundImage ? 'normal' : null;
    return <TouchableWithoutFeedback {...props}><View {...wrapProps}>{background}{subView}</View></TouchableWithoutFeedback>;
  }
}

const styles = StyleSheet.create({
  normal:{
    overflow:'hidden',
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'center',
    paddingHorizontal:12,
    paddingVertical:8,
    borderRadius:4,
    backgroundColor:'rgb(33,150,243)',
    color:'#FFF',
  },
  disable: {
    backgroundColor:'#DFDFDF',
    color:'#9A9A9A',
    textShadowColor:'#FFF',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 1,
  },
  imgWrap:{
    position:'relative',
    flexDirection:'column',
    justifyContent:'center',
    alignItems:'center',
  },
});