import React from 'react';
import {Dimensions, Animated, Easing, View, Image} from 'react-native';

const {width:screenWidth, height:screenHeight} = Dimensions.get('window');
const defaultColors = ["#a864fd", "#29cdff", "#78ff44", "#ff718d", "#fdff6a"];
const shapeImages = [
  require('./confetti_1.png'), 
  require('./confetti_2.png'), 
  require('./confetti_3.png'),
];


/**
  一个简单的 礼花 组件

  <Confetti ref="c"/>

  开始喷射
  refs.c.jet(config).then()
  config 参见 jet 函数注释
 */
export default class Confetti extends React.PureComponent {
  layout = null;
  fettis = [];
  state = {
    visible: false
  };

  /**
    amount: 数量
    duration: 燃放时长
    left: 起点 X 方向坐标, 默认为 parent 组件正中
    top: 起点 Y 方向坐标, 默认为 parent 组件 2/3 处
    colors:[] 自定义颜色组
   */
  jet = ({
    amount = 60,
    duration = 1300,
    left = 0,
    top = 0,
    colors = null,
  } = {}) => {
    
    // 缺省使用默认颜色
    colors = Array.isArray(colors) && colors.length ? colors : defaultColors;

    const width = this.layout ? this.layout.width : screenWidth;
    const height = this.layout ? this.layout.height : screenHeight;
    left = left||width/2;
    top = top||height*2/3;

    const padding = 12;
    const rangeX = left - padding;
    const topMinY = padding - top;
    const topMaxY = topMinY / 3;
    const btmMaxY = height + topMaxY;
    const btmMinY = btmMaxY * 2 / 3;
    const progress = new Animated.Value(0);

    // 计算 最高点 和 最低点 坐标
    let x, y, ex, ey;
    this.fettis = [];
    for (let k = 0; k < amount; k++) {
      x = getRandom(-rangeX, rangeX);
      y = getRandom(topMinY, topMaxY);
      ex = x + getRandom(1, padding);
      ey = getRandom(btmMinY, btmMaxY) + y;
      this.fettis.push(
        makeItem(k, left, top, progress, {x, y, ex, ey}, colors)
      )
    }

    // 启动
    return new Promise(resolve => {
      const upTime = 320;
      this.setState({visible: !this.state.visible}, () => {
        Animated.sequence([
            Animated.timing(progress, {
              toValue:1,
              duration:upTime,
              easing:Easing.bezier(0.075, 0.82, 0.165, 1.0),
              useNativeDriver:true,
            }),
            Animated.timing(progress, {
              toValue:2,
              duration: duration - upTime,
              useNativeDriver:true,
            }),
        ]).start(() => {
              this.fettis = [];
              this.setState({
                visible: !this.state.visible
              })
              resolve()
        });
      })
    })
  }

  render() {
    const {style} = this.props;
    return <View pointerEvents="none" onLayout={e => {
      this.layout = e.nativeEvent.layout
    }} style={[{
      position:"absolute", width:'100%', height:'100%'
    }, style]}>
      {this.fettis} 
    </View>
  }
}

const getRandom = (min, max) => {
  return Math.random() * (max - min) + min; 
}

const shape = {
  square:(key, style, size, color) => {
    return <Animated.View key={key} style={[{
      width:size,
      height:size,
      backgroundColor:color
    }, style]} />
  },
  rectangle:(key, style, size, color) => {
    return <Animated.View key={key} style={[{
      width:size,
      height:size/2,
      backgroundColor:color
    }, style]} />
  },
  circle: (key, style, size, color) => {
    return <Animated.View key={key} style={[{
      width:size,
      height:size,
      borderRadius: size/2,
      backgroundColor:color
    }, style]} />
  },
  oval: (key, style, size, color) => {
    style.transform.push({scaleX: 2});
    return shape.circle(key, style, size, color)
  },
  triangle:(key, style, size, color) => {
    const border = size/2;
    return <Animated.View key={key} style={[{
      width: 0,
      height: 0,
      backgroundColor: 'transparent',
      borderStyle: 'solid',
      borderLeftWidth: border,
      borderRightWidth: border,
      borderBottomWidth: size,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderBottomColor: color
    }, style]} />
  },
  trapezoid:(key, style, size, color) => {
    const border = size/2;
    return <Animated.View key={key} style={[{
      width: size * 2,
      height: 0,
      borderBottomWidth: size,
      borderBottomColor: color,
      borderLeftWidth: border,
      borderLeftColor: 'transparent',
      borderRightWidth: border,
      borderRightColor: 'transparent',
      borderStyle: 'solid'
    }, style]} />
  },
  cone:(key, style, size, color) => {
    const border = size/2;
    return <Animated.View key={key} style={[{
      width: 0,
      height: 0,
      borderLeftWidth: border,
      borderLeftColor: 'transparent',
      borderRightWidth: border,
      borderRightColor: 'transparent',
      borderTopWidth: size,
      borderTopColor: color,
      borderRadius: border
    }, style]} />
  },
}
const shapeKeys = Object.keys(shape);

const makeItem = (index, left, top, progress, range, colors) => {
  const key = "item_" + index;
  const style = {position:"absolute", left, top};
  const translateX = progress.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, range.x, range.ex]
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, range.y, range.ey]
  });
  const rotateZ = progress.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['0deg', '0deg', getRandom(30, 360) + 'deg']
  });
  style.transform = [{translateX}, {translateY}, {rotateX:getRandom(0, 1)}, {rotateY:getRandom(0, 1)}, {rotateZ:rotateZ}];
  style.opacity = progress.interpolate({
    inputRange:[0, 1, 2],
    outputRange:[1, 1, 0]
  });
  const color = colors[index % colors.length];
  const rand = Math.round(getRandom(0, shapeKeys.length + shapeImages.length - 1));
  if (rand < shapeKeys.length) {
    const func = shapeKeys[rand];
    return shape[func](key, style, Math.round(getRandom(8, 18)), color);
  }
  const size = Math.round(getRandom(24, 50));
  return <Animated.View key={key} style={style}>
    <Image source={shapeImages[rand - shapeKeys.length]} style={{
      width:size,
      height:size,
      tintColor:color
    }} />
  </Animated.View>
}
