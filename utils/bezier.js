/**
  贝塞尔曲线 坐标点 生成器
 * @param poss      贝塞尔曲线控制点坐标, 大于 3 个
 * @param precision 精度，需要计算的该条贝塞尔曲线上的点的数目
 * @return 该条贝塞尔曲线上的点（二维坐标）

const pos = bezier([
  [0, 160],
  [100, 0],
  [180, 160]
], 12);

pos = [
  [x, y],
  [x, y],
  ....
]
 */
export default bezier = (poss, precision) => {
  //贝塞尔曲线控制点数（阶数）, 不小于 2
  const number = poss.length;
  if (number < 2) {
    return null;
  }
  //维度，坐标轴数（二维坐标，三维坐标..., 至少为二维坐标系）
  const dimersion = poss[0].length;
  if (dimersion < 2) {
    return null;
  }
  let i, j, k, t, temp;

  //计算杨辉三角
  const mi = [];
  mi[0] = mi[1] = 1;
  for (i = 3; i <= number; i++) {
    t = [];
    for (j = 0; j < i - 1; j++) {
        t[j] = mi[j];
    }
    mi[0] = mi[i - 1] = 1;
    for (j = 0; j < i - 2; j++) {
        mi[j + 1] = t[j] + t[j + 1];
    }
  }
  
  //计算坐标点
  const result = [];
  precision -= 1;
  for (i = 0; i < precision; i++) {
    result[i] = [];
    t = i / precision;
    for (j = 0; j < dimersion; j++) {
      temp = 0;
      for (k = 0; k < number; k++) {
        temp += Math.pow(1 - t, number - k - 1) * poss[k][j] * Math.pow(t, k) * mi[k];
      }
      result[i][j] = temp;
    }
  }
  result.push(poss[number - 1])
  return result;
}