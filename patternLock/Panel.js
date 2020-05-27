import React from "react";
import {StyleSheet} from "react-native";
import {Surface, Shape, Path} from './../native/art';

/**
 * 九宫格图案展示当前密码
 * 
 * <Panel
 *    style={}             //样式
 *    size={number}        //尺寸
 *    radius={number}      //圆圈半径
 *    borderColor={string} //未选中圆圈边框颜色
 *    fillColor={string}   //选中圆圈填充颜色
 *    password={Array<number>} //选中项目, 如 [1,3,5,6]
 * />
 */
function Panel(props) {
  const {
    style,
    size=60,
    radius,
    borderColor='#999',
    fillColor='blue',
    password=[]
  } = props;

  const rds = radius ? radius : size / 8;

  // 九宫格 圆心坐标
  const start = rds;
  const center = size / 2;
  const end = size - start;
  const circles = [
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

  const dotPath = new Path();
  const dotActivePath = new Path();
  circles.forEach(([x, y], index) => {
    addCirclePath(
      password.includes(index + 1) ? dotActivePath : dotPath, 
      x, 
      y, 
      rds
    );
  });

  return <Surface width={size} height={size} style={style}>
    <Shape 
      strokeWidth={StyleSheet.hairlineWidth} 
      stroke={borderColor} 
      d={dotPath} 
    />
    <Shape 
      fill={fillColor}
      strokeWidth={0} 
      d={dotActivePath} 
    />
  </Surface>
}

// 添加圆 path
function addCirclePath(path, x, y, radius) {
  path.moveTo(x, y - radius)
    .arc(0, radius * 2, radius)
    .arc(0, radius * -2, radius);
}

export default React.memo(Panel)