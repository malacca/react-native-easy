import React from "react";
import {StyleSheet, View, Animated} from "react-native";
import Color from 'art/core/color';
import PatternLock from './index';
import fontSize from './../utils/fontSize';

/**
 * 验证解锁图案
 * 
 * <Verification
 *    style={}         //整体样式
 *    message=""       //初始提示信息
 *    messageStyle={}  //提示信息样式 (Text组件)
 *    padding={}       //九宫格解锁图案内边距
 * 
 *    color=""         //整体颜色, 用于提示信息, 和解锁图案
 *    errorColor=""    //错误时颜色
 *  
 *    theme=""         //外观主题, 相当于快速定义了 normalConfig / errorConfig
 *    normalConfig={}  //自定义解锁图案 props 如  {dotRadius, innerRadius, lineWidth,...}
 *    errorConfig={}   //自定义错误时的解锁图案 props
 *    
 *    onStart={number => {}}       //开始绘制
 *    onSelect={number => {}}      //绘制过程中选中了一个
 *    onEnd={Array<number> => {}}  //绘制结束, 返回 string, 会提示错误并清空绘制; 返回 true, 则仅清空绘制
 *    onReset={() => {}}           //若 onEnd 返回错误, 会清空绘制, 并回调
 * 
 *    renderHeader={Function}      //在解锁图案上面插入组件
 *    renderFooter={Function}      //在解锁图案下面插入组件
 * />
 * 
 * 
 * 验证结果
 * onEnd={() => {
 *     // ....check code....
 * 
 *     // 成功, 一般为跳转到其他页面
 *     return;
 * 
 *     // 失败, 返回提示信息
 *     return '图案错误，请重新绘制';
 * 
 *     // 比如有次数限制
 *     return '图案错误，还有3次机会';
 * }}
 * 
 */
function Verification(props) {
  const shakeAnimate = React.useRef(new Animated.Value(0));
  const [lock, setLock] = React.useState({
    error: null,
    password:[]
  });

  const {
    style,
    message="请绘制解锁图案",
    messageStyle,

    theme,
    padding=0,
    color="#5AA5FE",
    errorColor="red",
    normalConfig,
    errorConfig,

    onStart,
    onSelect,
    onEnd,
    onReset,

    renderHeader,
    renderFooter,
  } = props;

  // 清空绘制
  const clearDraw = () => {
    setLock({
      error: null,
      password:[]
    });
    onReset && onReset();
  }

  // 绘制结束
  const _onEnd = (password) => {
    const error = onEnd ? onEnd(password) : null;
    if (!error) {
      return;
    }
    if (typeof error === 'string') {
      setLock({
        ...lock,
        error
      })
    } else {
      clearDraw();
    }
  }

  // lock 发生变化, 判断是否 error
  React.useEffect(() => {
    if (!lock.error) {
      return;
    }
    const shake = shakeAnimate.current;
    Animated.sequence([
      Animated.timing(shake,  {
        toValue:1,
        duration:300,
        useNativeDriver:true,
      }),
      Animated.timing(shake,  {
        toValue:0,
        duration:300,
        useNativeDriver:true,
      }),
      Animated.delay(200),
    ]).start(clearDraw);
  }, [lock]);

  const shakeStyle = lock.error ? {
    color: errorColor,
    transform: [{ 
      translateX: shakeAnimate.current.interpolate({
        inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
        outputRange: [0, -10, 10, -10, 10, 0],
      }) 
    }],
  } : null;

  const lockProps = {
    ...getThemeProps(theme, lock.error ? errorColor : color),
    ...normalConfig,
    ...(lock.error ? errorConfig : null)
  };

  return <View style={[styles.container, style]}>
    {renderHeader && renderHeader()}
    <Animated.Text 
      style={[
        styles.message, 
        messageStyle,
        shakeStyle
      ]}
      children={lock.error||message}
    />
    <PatternLock
      {...lockProps}
      style={styles.patternLock}
      padding={padding}
      password={lock.password}
      onStart={onStart}
      onSelect={onSelect}
      onEnd={_onEnd}
    />
    {renderFooter && renderFooter()}
  </View>
}

// 一些内置主题, 后期可考虑扩充一下
function getThemeProps(theme, color) {
  let tinyColor;
  if (color) {
    const c = new Color(color);
    c.alpha = c.alpha - .2;
    tinyColor = c.toRGB();
  }
  if (theme === 'chain') {
    return {
      dotRadius:10,
      dotColor:color,
      dotBorderWidth:0,
      
      dotActiveRadius:20,
      dotActiveColor:tinyColor,
      dotActiveBorderWidth:0,

      innerRadius:10,
      innerColor:color,
      innerBorderWidth:0,
      
      lineWidth:10,
      lineColor:color
    }
  }
  return {
    dotBorderColor:tinyColor,
    innerColor:color,
    lineColor:color
  }
}

const styles = StyleSheet.create({
  container:{
    justifyContent:"center",
    alignItems:"center"
  },
  message:{
    alignSelf:"stretch",
    textAlign:"center",
    marginBottom:30,
    fontSize: fontSize.big,
  },
  patternLock:{
    alignSelf:"stretch",
  }
});

export default React.memo(Verification);
