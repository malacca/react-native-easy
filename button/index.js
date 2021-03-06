import React from 'react';
import splitStyle from './../utils/splitStyle';
import {StyleSheet, TouchableWithoutFeedback, Animated, Image} from 'react-native';

/** 
  仿 html button

  <Button 
    title="按钮"       // string | ReactComponent, 也可以不指定, 因为 style 可以设置背景图, 可完全让背景图充当 Button
    
    textProps={props} // 若 title 为字符串, 将绑定到 Text 组件上, 
                      // 否则将传递给自定义组件, 自定义组件收的的 props={ ...textProps, type, style, allowFontScaling }
                      // 其中 type='normal|press|long|disabled'  style 为这几种情况的样式

    disabled={false}  //是否禁用按钮, 另外还可通过  ref.setDisable() 来禁用/启用 按钮, 由于 RN 的数据是单向流动的
                      //所以最好只选择一种方式来使用, 不要混搭使用, 建议使用 props 方式, 逻辑清晰
                      //二者性能并无差别, 若使用 API 方式, props.disabled 可理解为初始化状态, 
                      //一旦使用过 API 调用, 后续禁用/启用都只能用 API

    style={} 
    pressStyle={} 
    longPressStyle={} 
    disabledStyle={}
    allowFontScaling={} 

    ...TouchableWithoutFeedback support props
  />

  可为每个状态定义样式, 与原生 Button 相比
    1. style 中可直接 定义 fontSize,color 等文字样式, 如果 title 为 string, 则直接应用
       若 title 为组件, 会传递 textProps 和 分离出来的 text style
    2. 可为按钮添加背景图, 在 style/pressStyle/longPressStyle/disabledStyle 
       通过 backgroundImage=source / backgroundStyle 设置样式
       注意: 这两个属性不是 RN style 标准属性, 所以不能嵌套在 StyleSheet.create 中

  对于特性1举例, 知识点:
  // 后一个状态 style 会继承前一个, 就像 css 那样, pressStyle 只需设置新属性即可
  // 为方便直接使用, 默认自带了一些样式, 但可自行重置
  // 默认的 padding 是通过 paddingHorizontal 和 paddingVertical 设置的
  <Button 
    title="按钮"
    style={{
      backgroundColor:"green",
      color:"white"
    }}
    pressStyle={{
      paddingVertical:10,
      color:"yellow"
    }}
  />

  针对特性2举例, 需要知晓的是: img 的 position=absolute 无法修改

  // 最简单的使用, 知识点: 
  // 在 backgroundStyle 中通过 resizeMode 设置图片填充方式
  <Button 
    style={{
      backgroundImage:require('img_path'),
      backgroundStyle:{
        resizeMode:"stretch",
        ...StyleSheet.absoluteFill,
      }
    }}
    pressStyle={{
      backgroundImage:require('img_path_press'),
    }}
  />
  
  // 支持雪碧图, 支持远程图片, 知识点:
  // 后一个状态会继承前一个状态的背景图, 就像 css 那样
  <Button 
    style={{
      backgroundImage:require('img_path'),
      backgroundStyle:{
        resizeMode:"cover",
        height:80,
        left:0,
        right:0,
        top:0,
      }
    }}
    pressStyle={{
      backgroundStyle:{
        top:-40,
      }
    }}
  />
*/
export default class Button extends React.PureComponent {

  _subType = 0;        // title 类型
  _bgimgType = null;   // 背景图类型
  _flattenStyles = {};  // 缓存分离样式
  state = {
    // 动态 disable
    disabled: null
  }

  // 导出 API , 可使用 ref 来调用
  isDisabled = () => Boolean(
    disabled === null ? props.disabled : disabled
  );
  setDisable = (disable) => {
    if (disable !== this.state.disabled) {
      this.setState({
        disabled:disable
      })
    }
  }

  // 动态修改样式
  _changeStyle = (type) => {
    const flatten = this._flattenStyles;
    const {textStyle, wrapStyle} = flatten[type];
    
    // 修改 wrap 样式
    this.refs.button.setNativeProps({
      style: wrapStyle
    });

    // 修改 title 样式
    if (this._subType === 2) {
      this.refs.sub.updateText(type, textStyle)
    } else if (this._subType === 1) {
      this.refs.text.setNativeProps({
        style: textStyle
      });
    }

    // 修改背景图
    let prev = null, next = null;
    const press = this._bgimgType;
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
      this._bgimgType = next;
    } else if (type === 'normal') {
      this._bgimgType = null;
    }
  }

  render() {
    const {
      title,
      textProps,
      allowFontScaling=false, 

      style,
      pressStyle,
      longPressStyle,
      disabledStyle,
      disabled,

      onPress,
      onPressIn,
      onPressOut,
      onLongPress,
      ...props // 其他 TouchableWithoutFeedback 支持的属性
    } = this.props;

    // 解析样式
    const realDisabled = this.state.disabled === null ? disabled : this.state.disabled;
    const flatten = parseStyle(style, disabledStyle, pressStyle, longPressStyle, realDisabled);
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
      } else if (onLongPress) {
        props.onLongPress = onLongPress.bind(this);
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
        style={[backgroundStyle, styles.imgAbsolute]}
      />)
    }
    if (!realDisabled) {
      const {backgroundImage:img1, backgroundStyle:css1} = flatten.press;
      if (img1) {
        background.push(<Image 
          ref = "press"
          key = "_press"
          source={img1}
          style={[css1, styles.imgAbsolute, {opacity: 0}]}
        />)
      }
      const {backgroundImage:img2, backgroundStyle:css2} = flatten.long;
      if (img2) {
        background.push(<Image 
          ref = "long"
          key = "_long"
          source={img2}
          style={[css2, styles.imgAbsolute, {opacity: 0}]}
        />)
      }
    }

    // 子组件
    let subType = 0, subView;
    if (title) {
      const subViewProps = {...textProps, style: textStyle};
      if (!('allowFontScaling' in subViewProps) && typeof allowFontScaling === "boolean") {
        subViewProps.allowFontScaling = allowFontScaling;
      }
      if (typeof title === 'string') {
        if (!realDisabled) {
          subType = 1;
          subViewProps.ref = "text";
        }
        subView = <Animated.Text {...subViewProps}>{title}</Animated.Text>
      } else {
        subViewProps.title = title;
        subViewProps.type = realDisabled ? 'disabled' : 'normal';
        if (!realDisabled) {
          subType = 2;
          subViewProps.ref = "sub";
        }
        subView = <TitleWrap {...subViewProps} />
      }
    }

    // disabled
    const accessibilityState = {};
    if (realDisabled) {
      accessibilityState.disabled = true;
    }

    // 记录状态 返回组件
    this._subType = subType;
    this._bgimgType = backgroundImage ? 'normal' : null;
    this._flattenStyles = flatten;
    return <TouchableWithoutFeedback 
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      {...props}
    >
      <Animated.View {...wrapProps}>{background}{subView}</Animated.View>
    </TouchableWithoutFeedback>;
  }
}


/**
 * 自定义 title 组件的 wrapper
 */
const TitleWrap = React.forwardRef((props, ref) => {
  const oldType = React.useRef();
  const [buttonText, setButtonText] = React.useState(() => ({
    type: props.type,
    style: props.style
  }));
  React.useImperativeHandle(ref, () => {
    return {
      updateText:(type, textStyle) => {
        setButtonText({
          type,
          style:{
            ...buttonText.style,
            ...textStyle
          }
        })
      }
    };
  });
  const {title:Title, ...titleProps} = props;

  // 按钮状态在 normal 和 disabled 之间转换了, 直接使用 props 中的 type/style
  const propsTypeChange = oldType.current !== props.type;
  if (propsTypeChange) {
    oldType.current = props.type;
  }
  const finalProps = propsTypeChange ? titleProps : {
    ...titleProps, 
    ...buttonText
  };
  return <Title {...finalProps}/>;
});


/**
 * 解析 button 不同状态的 style
 */
const parseStyle = (style, disabledStyle, pressStyle, longPressStyle, disabled) => {
  // 禁用, 无动态样式, 仅返回 basic 即可
  if (disabled) {
    const sheets = StyleSheet.flatten([styles.normal, style, styles.disable, disabledStyle]);
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
 * 分离 style 中的样式
 * 返回 {wrapStyle, textStyle, backgroundImage, backgroundStyle}
 */
const resolveSplit = (styles) => {
  const {backgroundImage, backgroundStyle={}, ...sheets} = styles;
  const splits = splitStyle(sheets);
  splits.backgroundImage = backgroundImage;
  splits.backgroundStyle = backgroundStyle;
  return splits;
}


/**
 * 寻找差异 返回 basic 和 三个状态下的 style
 */
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


/**
 * 更智能一点, 若指定了 button background
 * 自动给 pressStyle 加一个比 background 稍深一点的颜色
 * 如果 pressStyle 手动指定了, 则以指定为准
 */
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


/**
 * 三种状态下的 背景图
 */
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
  imgAbsolute:{
    position:'absolute'
  }
});