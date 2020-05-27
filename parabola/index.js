
import React from 'react';
import bezier from './../utils/bezier';
import {Easing, Animated} from 'react-native';

/**
  贝塞尔轨迹 运动组件

  <Parabola ref="p">
      {yourComponent}
  </Parabola>

  开始运动
  this.refs.p.start(config).then()
  config 配置参见 start 注释
 */
export default class Parabola extends React.PureComponent {
  state = {
    style: null
  };

  /**
  start: [left, top, width, height] 起点坐标及尺寸
  end:[left, top, width, height] 终点坐标及尺寸 
  control:[x, y] 二次贝塞尔曲线控制点坐标
  duration: 动画时长
  precision: 曲线精度
  easing: 缓动函数
   */
  start = ({
    start = null,
    end = null,
    control = null,
    duration = 1200,
    precision = 20,
    easing = null,
  } = {}) => {
    const 
    toValue = precision - 1,
    [left, top, width, height] = start||[],
    [eLeft, eTop, eWidth, eHeight] = end||[],
    [x, y] = control||[],
    sx = eWidth / width,
    sy = eHeight / height,
    points = bezier([
      [left, top],
      [x, y],
      [eLeft, eTop]
    ], precision),
    translateInput = [],
    translateOutputX = [],
    translateOutputY = [];
    points.forEach((item, index) => {
      translateInput.push(index);
      translateOutputX.push(item[0]);
      translateOutputY.push(item[1]);
    })
    const progress = new Animated.Value(0);
    const scaleX = progress.interpolate({
      inputRange:[0, toValue],
      outputRange:[1, sx]
    });
    const scaleY = progress.interpolate({
      inputRange:[0, toValue],
      outputRange:[1, sy]
    });
    const translateX = progress.interpolate({
      inputRange: translateInput,
      outputRange: translateOutputX
    });
    const translateY = progress.interpolate({
      inputRange: translateInput,
      outputRange: translateOutputY
    });
    const style = {
      backgroundColor:'green',
      position:'absolute',
      width,
      height,
      transform: [{translateX}, {translateY}, {scaleX}, {scaleY}]
    }
    const config = {
        toValue,
        duration,
        useNativeDriver:true,
        easing: easing||Easing.bezier(.32,.01,1,.68),
    };
    return new Promise(resolve => {
        this.setState({style}, () => {
            Animated.timing(progress, config).start(() => {
                this.setState({style: null});
                resolve()
            })
        })
    });
  }

  render() {
    if (!this.state.style) {
      return null;
    }
    const {style, children} = this.props;
    return <Animated.View style={[style, this.state.style]}>{children}</Animated.View>
  }
}