import React from "react";
import {StyleSheet, View} from "react-native";
import {Surface, Shape, Path} from './../native/art';

/**
 * 九宫格解锁图案
 * 
 * <PatternLock
 *    style={}         //外层 view 样式
 *    padding={number} //内边距
 *    
 *    dotRadius={number}        // 默认情况下的圆圈配置
 *    dotColor={string}         // 特别注意 color, 兼容性不是特别好, 最好使用 rgba() 颜色值
 *    dotBorderWidth={number}
 *    dotBorderColor={string}
 * 
 *    dotActiveRadius={number}   // 选中激活后的圆圈配置    
 *    dotActiveColor={string}
 *    dotActiveBorderWidth={number}
 *    dotActiveBorderColor={string}
 * 
 *    innerRadius={number}   // 选中激活后, 可在基础圆圈的上面再添加一个内圆   
 *    innerColor={string}        
 *    innerBorderWidth={number}
 *    innerBorderColor={string}
 * 
 *    lineWidth={number}   // 连线宽度, 颜色
 *    lineColor={string}
 * 
 *    password={[]}        // 初始连线密码
 *    
 *    onStart={number => {}}       开始
 *    onSelect={number => {}}    选中了一个
 *    onEnd={Array<number> => {}}  松开, 结束
 * />
 * 
 * 
 */
class PatternLock extends React.PureComponent {
  state={
    size:null
  }
  _circles = [];
  _withMargin = null;
  _drawRef = null;

  _setDrawRef = (ref) => this._drawRef = ref;
  _shouldSetResponder = () => true;
  
  // touchStart: 必须刚好在某个圆内, 才做后续响应
  _onResponderGrant = (e) => {
    if (!this.state.size) {
      return;
    }
    const {locationX, locationY, pageX, pageY} = e.nativeEvent;
    const withMargin = {
      x: pageX - locationX,
      y: pageY - locationY
    };
    const point = getCirclePoint(
      this._circles,
      getRelativePosition(withMargin, pageX, pageY)
    );
    this._withMargin = point ? withMargin : null;
    if (point) {
      this._drawRef.setPassword([point]);
      this.props.onStart && this.props.onStart(point);
    }
  }

  // touchMove: 添加锁点, 并设置实时触摸位置
  _onResponderMove = (e) => {
    if (!this._withMargin) {
      return;
    }
    const {pageX, pageY} = e.nativeEvent;
    const dot = getRelativePosition(this._withMargin, pageX, pageY);
    const point = getCirclePoint(this._circles, dot);
    if (point) {
      this._drawRef.addPassword(point);
      this.props.onSelect && this.props.onSelect(point);
    }
    requestAnimationFrame(() => {
      this._drawRef.setDot(dot);
    })
  }

  // touchEnd: 触摸结束, 回调
  _onResponderRelease = () => {
    if (!this._withMargin) {
      return;
    }
    this._drawRef.setDot(null);
    this.props.onEnd && this.props.onEnd(
      this._drawRef.getPassword()
    );
  }

  // 获取尺寸
  _onLayout = (e) => {
    if (this.state.size) {
      return;
    }
    const {width, height} = e.nativeEvent.layout;
    if (!width && !height) {
      return;
    }
    const size = !width ? height : (!height ? width : Math.min(width, height));
    this.setState({size});
  }

  // ART 必须在设定尺寸后渲染, 且不能中途修改尺寸, 否则有 bug
  _renderDraw = () => {
    const size = this.state.size;
    if (!size) {
      return null;
    }
    const {
      padding=10,
      
      // 外圈
      dotRadius,
      dotColor="transparent",
      dotBorderWidth=StyleSheet.hairlineWidth,
      dotBorderColor="#5AA5FE",

      // 激活: 外圈
      dotActiveRadius,
      dotActiveColor,
      dotActiveBorderWidth=1,
      dotActiveBorderColor,

      // 激活: 内圈
      innerRadius,
      innerColor="#5AA5FE",
      innerBorderWidth=StyleSheet.hairlineWidth,
      innerBorderColor="transparent",

      // 连线宽度, 颜色
      lineWidth=2,
      lineColor="#5AA5FE",

      password,
    } = this.props;

    // 内外圈未指定半径, 自动分配
    const oRadius = dotRadius ? dotRadius : (size - (padding * 2)) / 10;
    const nRadius = innerRadius ? Math.min(oRadius, innerRadius) : oRadius / 3;

    // 九宫格 圆心坐标
    const start = padding + oRadius;
    const center = size / 2;
    const end = size - start;
    this._circles = [
      [start, start],
      [center, start],
      [end, start],
      [start, center],
      [center, center],
      [end, center],
      [start, end],
      [center, end],
      [end, end]
    ];

    return <PatternDraw
      ref={this._setDrawRef}
      size={size}

      dotRadius={oRadius}
      dotColor={dotColor}
      dotBorderWidth={dotBorderWidth}
      dotBorderColor={dotBorderColor}

      dotActiveRadius={dotActiveRadius||oRadius}
      dotActiveColor={dotActiveColor||dotColor}
      dotActiveBorderWidth={dotActiveBorderWidth}
      dotActiveBorderColor={dotActiveBorderColor||dotBorderColor}

      innerRadius={nRadius}
      innerColor={innerColor}
      innerBorderWidth={innerBorderWidth}
      innerBorderColor={innerBorderColor}

      lineWidth={lineWidth}
      lineColor={lineColor}

      circles={this._circles}
      password={password}
    />
  }

  render() {
    return <View 
      style={this.props.style}
      onLayout={this._onLayout}
      onStartShouldSetResponder={this._shouldSetResponder}
      onMoveShouldSetResponder={this._shouldSetResponder}
      onResponderGrant={this._onResponderGrant}
      onResponderMove={this._onResponderMove}
      onResponderRelease={this._onResponderRelease}
    >
      {this._renderDraw()}
    </View>
  }
}

const PatternDraw = React.forwardRef((props, ref) => {
  const {
    size,

    dotRadius,
    dotColor,
    dotBorderWidth,
    dotBorderColor,

    dotActiveRadius,
    dotActiveColor,
    dotActiveBorderWidth,
    dotActiveBorderColor,

    innerRadius,
    innerColor,
    innerBorderWidth,
    innerBorderColor,

    lineWidth,
    lineColor,

    circles,
    password:initPassword,
  } = props;

  const initPasswordRef = React.useRef();
  const [password, setPassword] = React.useState([]);
  const [dot, setDot] = React.useState();
  React.useImperativeHandle(ref, () => {
    return {
      setDot,
      setPassword,
      addPassword:(add) => {
        const append = appendPassword(password, add);
        if (append) {
          setPassword([...password, ...append])
        }
      },
      getPassword:() => {
        return password
      }
    };
  });

  // props.initPassword 发生变化, 以此为准
  let pointPass = password;
  if (initPasswordRef.current !== initPassword) {
    pointPass = initPasswordRef.current = initPassword;
    setPassword(initPassword)
  }

  // 外圆 path / 内圆 path / 连接线;  相比 dot 坐标, 这些更新并不频繁, 可缓存一下
  const {
    dotPath,
    dotActivePath,
    innerPath,
    cable
  } = React.useMemo(() => {
    const dotPath = new Path();
    const dotActivePath = new Path();
    const innerPath = new Path();
    const cable = new Path();
    circles.forEach(([x, y], index) => {
      if (!pointPass.includes(index + 1)) {
        addCirclePath(dotPath, x, y, dotRadius);
      } else {
        addCirclePath(dotActivePath, x, y, dotActiveRadius);
        addCirclePath(innerPath, x, y, innerRadius);
      }
    });
    if (pointPass.length) {
      pointPass.forEach((pass, index) => {
        const point = circles[pass - 1];
        if (index > 0) {
          cable.lineTo(point[0], point[1])
        } else {
          cable.moveTo(point[0], point[1])
        }
      })
    }
    return {dotPath, dotActivePath, innerPath, cable}
  }, [circles, pointPass, dotRadius, dotActiveRadius, innerRadius]);

  const cablePath = !pointPass.length ? null : (
    dot ? new Path(cable).lineTo(dot.x, dot.y) : cable
  );

  return <Surface width={size} height={size}>
    <Shape 
      fill={dotColor}
      strokeWidth={dotBorderWidth} 
      stroke={dotBorderColor} 
      d={dotPath} 
    />
    <Shape 
      fill={dotActiveColor}
      strokeWidth={dotActiveBorderWidth} 
      stroke={dotActiveBorderColor} 
      d={dotActivePath} 
    />
    <Shape 
      fill={innerColor}
      strokeWidth={innerBorderWidth} 
      stroke={innerBorderColor} 
      d={innerPath} 
    />
    <Shape 
      strokeWidth={lineWidth} 
      stroke={lineColor} 
      d={cablePath} 
    />
  </Surface>
});


// 触摸点相对于 解锁盘 的位置
function getRelativePosition(withMargin, pageX, pageY) {
  return {
    x: pageX - withMargin.x,
    y: pageY - withMargin.y
  }
}

// 判断指定坐标点是否在 触摸点 区域内
function getCirclePoint(circles, point) {
  const radius = 20;
  const max = radius * radius;
  const {x, y} = point;
  return circles.findIndex(([rx, ry]) => {
    const dx = rx - x, dy = ry - y;
    return dx * dx + dy * dy < max;
  }) + 1;
}

// 添加圆 path
function addCirclePath(path, x, y, radius) {
  path.moveTo(x, y - radius)
    .arc(0, radius * 2, radius)
    .arc(0, radius * -2, radius);
}

// 添加 数字: 不能重复、 跳跃自动补中间数
function appendPassword(password, add) {
  if (!password.length) {
    return [add];
  }
  if (password.includes(add)) {
    return false;
  }
  const last = password[password.length - 1];
  // 5 在正中间, 总是可以
  if (last === 5 || add === 5) {
    return [add];
  }
  const pos = getPasswordPos(add);
  const lastPos = getPasswordPos(last);
  const xCross = Math.abs(pos.x - lastPos.x);
  const yCross = Math.abs(pos.y - lastPos.y);
  let insert = null;
  if (xCross > 1 && yCross > 1) {
    // 对角交叉, 补齐中间数 (5)
    insert = 5;
  } else if (xCross === 0 && yCross > 1) {
    // 在同一条竖线上跳跃, 补齐中间数 (4/5/6)
    insert = 3 + pos.x;
  } else if (yCross === 0 && xCross > 1) {
    // 在同一条横线上跳跃, 补齐中间数 (2/5/8)
    insert = 2 + (pos.y - 1) * 3;
  }
  if (insert !== null && !password.includes(insert)) {
    return [insert, add]
  }
  return [add]
}
function getPasswordPos(password) {
  const x = password % 3;
  const y = Math.ceil(password / 3);
  return {
    x: x === 0 ? 3 : x,
    y
  }
}

export default PatternLock;