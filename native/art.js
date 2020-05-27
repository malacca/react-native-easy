/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * 
 * 
 * 从 RN61.5 复制出来的 ART 组件, 该组将相对于
 * `@react-native-community/art` 在功能上已有所落后, 但绝大部分倒不影响使用
 * 该组件依赖  "art": "^0.10.3"
 * 
 * --------------------------------------------------------
 * 
 * 
 * 可用组件
 * 
 * import {Surface, Group, ClippingRectangle, Shape, Text} from 'art'
 * 
 * <Surface
 *    width={number}
 *    height={number}
 *    style={}
 * />
 * 
 * <Group
 *    visible={bool}
 *    opacity={number}
 *    {...TransformProps}
 * />
 * 
 * <ClippingRectangle
 *    visible={bool}
 *    opacity={number}
 *    clipping={[x, y, width, height]}
 *    {...TransformProps}
 * />
 * 
 * <Shape
 *    visible={bool}
 *    opacity={number}
 *    stroke={color}
 *    fill={color | Brush}
 *    strokeCap={'butt' | 'square' | 'round}
 *    strokeJoin={'miter' | 'bevel' | 'round'}
 *    strokeDash={Array<number>}
 *    strokeWidth={number}
 *    d={string | Path}
 *    {...TransformProps}
 * />
 * 
 * <Text
 *    visible={bool}
 *    opacity={number}
 *    stroke={color}
 *    fill={color | Brush}
 *    strokeCap={'butt' | 'square' | 'round}
 *    strokeJoin={'miter' | 'bevel' | 'round'}
 *    strokeDash={Array<number>}
 *    strokeWidth={number}
 *    alignment={'center' | 'left' | 'right'}
 *    font={string | Font}
 *    path={string | Path}
 *    {...TransformProps}
 * />
 * 
 * --------------------------------------------------------
 * 
 * 除 Surface 组件, 都支持以下属性
 * 
 * TransformProps = { 
 *    scaleX,
 *    scaleY,
 *    scale,
 *    x,
 *    y,
 *    rotation,
 *    originX,
 *    originY,
 *    transform:{
 *       x, y, xx, yy, xy, yx
 *    }
 * }
 * 
 * TransformProps 中的 transform 可使用函数生成 
 * import {Transform} from 'art'
 * 
 * transform = new Transform()
 *    .transform(xx, yx, xy, yy, x, y)
 *    .translate(x, y)
 *    .move(x, y)
 *    .moveTo(x, y)
 *    .rotate(deg, x, y)
 *    .rotateTo(deg, x, y)
 *    .scale(x, y)
 *    .scaleTo(x, y)
 *    .point(x, y)
 *    .inversePoint(x, y)
 *    .resizeTo(width, height)
 * 
 * 
 * --------------------------------------------------------
 * Shape / Text 的 Path 属性支持
 * 
 * path="M 10,30 A 20,20 0,0,1 50,30 A 20,20 0,0,1 90,30 Q 90,60 50,90 Q 10,60 10,30 z"
 * 
 * 也支持
 * import {Path} from 'art'
 * 
 * path = new Path(pathString)
 *  .move(x, y)
 *  .moveTo(x, y)
 *  .line(x, y)
 *  .lineTo(x, y)
 *  .curve(c1x, c1y, c2x, c2y, ex, ey)
 *  .curveTo(c1x, c1y, c2x, c2y, ex, ey)
 *  .arc(x, y, rx, ry, outer, counterClockwise, rotation)
 *  .arcTo(x, y, rx, ry, outer, counterClockwise, rotation)
 *  .counterArc(x, y, rx, ry, outer)
 *  .counterArcTo(x, y, rx, ry, outer)
 *  .reset()
 *  .close()
 * 
 * 参考: https://github.com/sebmarkbage/art/blob/842d2d56c6436adc0bbb0c065a296f295b95bc0a/docs/ART/ART.Path.md
 * 
 * 
 * --------------------------------------------------------
 * 
 * 
 * Shape / Text 中的 file 属性除直接指定 color 还支持 Brush 
 * 支持以下三种
 * 
 * import {Pattern, LinearGradient, RadialGradient} from 'art'
 * 
 * const fill = new Pattern(url: (
 *  url string  ||  require(file)
 * ), width, height, left, top)
 * 
 * const fill = new LinearGradient(stops:{
 *   '0': 'color',
 *   '.5': 'color',
 *   ...
 * }, x1, y1, x2, y2)
 * 
 * const fill = new RadialGradient(stops:{
 *   '0': 'color',
 *   '.5': 'color',
 *   ...
 * }, fx, fy, rx, ry, cx, cy)
 * 
 * --------------------------------------------------------
 * 
 * Text 组件 font 属性可使用以下两种方式
 * 
 * font="fontFamily size bold italic"
 * font={{
 *    fontFamily: string,
 *    fontSize: number,
 *    fontWeight: 'bold' || 'normal' || 'number',
 *    fontStyle: 'italic' || 'normal',
 * }}
 * 
 * 
 */

'use strict';

// ARTSerializablePath
// https://github.com/facebook/react-native/blob/v0.61.5/Libraries/ART/ARTSerializablePath.js

// TODO: Move this into an ART mode called "serialized" or something

const ArtClass = require('art/core/class.js');
const ArtPath = require('art/core/path.js');

const MOVE_TO = 0;
const CLOSE = 1;
const LINE_TO = 2;
const CURVE_TO = 3;
const ARC = 4;

const Path = ArtClass(ArtPath, {
  initialize: function(path) {
    this.reset();
    if (path instanceof Path) {
      this.path = path.path.slice(0);
    } else if (path) {
      if (path.applyToPath) {
        path.applyToPath(this);
      } else {
        this.push(path);
      }
    }
  },

  onReset: function() {
    this.path = [];
  },

  onMove: function(sx, sy, x, y) {
    this.path.push(MOVE_TO, x, y);
  },

  onLine: function(sx, sy, x, y) {
    this.path.push(LINE_TO, x, y);
  },

  onBezierCurve: function(sx, sy, p1x, p1y, p2x, p2y, x, y) {
    this.path.push(CURVE_TO, p1x, p1y, p2x, p2y, x, y);
  },

  _arcToBezier: ArtPath.prototype.onArc,

  onArc: function(sx, sy, ex, ey, cx, cy, rx, ry, sa, ea, ccw, rotation) {
    if (rx !== ry || rotation) {
      return this._arcToBezier(
        sx,
        sy,
        ex,
        ey,
        cx,
        cy,
        rx,
        ry,
        sa,
        ea,
        ccw,
        rotation,
      );
    }
    this.path.push(ARC, cx, cy, rx, sa, ea, ccw ? 0 : 1);
  },

  onClose: function() {
    this.path.push(CLOSE);
  },

  toJSON: function() {
    return this.path;
  },
});




// ReactNativeART
// https://github.com/facebook/react-native/blob/v0.61.5/Libraries/ART/ReactNativeART.js

const Color = require('art/core/color');
const Transform = require('art/core/transform');
// const Path = require('./ARTSerializablePath');
const React = require('react');
const PropTypes = require('prop-types');
const ReactNativeViewAttributes = require('react-native/Libraries/Components/View/ReactNativeViewAttributes');
const createReactNativeComponentClass = require('react-native/Libraries/Renderer/shims/createReactNativeComponentClass');

// 修改: merge 直接使用 ES6 合并
const merge = (one, two) => {
  return {...one, ...two};
}
const invariant = require('invariant');

// Diff Helpers

function arrayDiffer(a, b) {
  if (a == null || b == null) {
    return true;
  }
  if (a.length !== b.length) {
    return true;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return true;
    }
  }
  return false;
}

function fontAndLinesDiffer(a, b) {
  if (a === b) {
    return false;
  }
  if (a.font !== b.font) {
    if (a.font === null) {
      return true;
    }
    if (b.font === null) {
      return true;
    }

    if (
      a.font.fontFamily !== b.font.fontFamily ||
      a.font.fontSize !== b.font.fontSize ||
      a.font.fontWeight !== b.font.fontWeight ||
      a.font.fontStyle !== b.font.fontStyle
    ) {
      return true;
    }
  }
  return arrayDiffer(a.lines, b.lines);
}

// Native Attributes

const SurfaceViewAttributes = merge(ReactNativeViewAttributes.UIView, {
  // This should contain pixel information such as width, height and
  // resolution to know what kind of buffer needs to be allocated.
  // Currently we rely on UIViews and style to figure that out.
});

const NodeAttributes = {
  transform: {diff: arrayDiffer},
  opacity: true,
};

const GroupAttributes = merge(NodeAttributes, {
  clipping: {diff: arrayDiffer},
});

const RenderableAttributes = merge(NodeAttributes, {
  fill: {diff: arrayDiffer},
  stroke: {diff: arrayDiffer},
  strokeWidth: true,
  strokeCap: true,
  strokeJoin: true,
  strokeDash: {diff: arrayDiffer},
});

const ShapeAttributes = merge(RenderableAttributes, {
  d: {diff: arrayDiffer},
});

const TextAttributes = merge(RenderableAttributes, {
  alignment: true,
  frame: {diff: fontAndLinesDiffer},
  path: {diff: arrayDiffer},
});

// Native Components

const NativeSurfaceView = createReactNativeComponentClass(
  'ARTSurfaceView',
  () => ({
    validAttributes: SurfaceViewAttributes,
    uiViewClassName: 'ARTSurfaceView',
  }),
);

const NativeGroup = createReactNativeComponentClass('ARTGroup', () => ({
  validAttributes: GroupAttributes,
  uiViewClassName: 'ARTGroup',
}));

const NativeShape = createReactNativeComponentClass('ARTShape', () => ({
  validAttributes: ShapeAttributes,
  uiViewClassName: 'ARTShape',
}));

const NativeText = createReactNativeComponentClass('ARTText', () => ({
  validAttributes: TextAttributes,
  uiViewClassName: 'ARTText',
}));

// Utilities

function childrenAsString(children) {
  if (!children) {
    return '';
  }
  if (typeof children === 'string') {
    return children;
  }
  if (children.length) {
    return children.join('\n');
  }
  return '';
}

// Surface - Root node of all ART

class Surface extends React.Component {
  static childContextTypes = {
    isInSurface: PropTypes.bool,
  };

  getChildContext() {
    return {isInSurface: true};
  }

  render() {
    const height = extractNumber(this.props.height, 0);
    const width = extractNumber(this.props.width, 0);

    return (
      <NativeSurfaceView style={[this.props.style, {height, width}]}>
        {this.props.children}
      </NativeSurfaceView>
    );
  }
}

// Node Props

// TODO: The desktop version of ART has title and cursor. We should have
// accessibility support here too even though hovering doesn't work.

function extractNumber(value, defaultValue) {
  if (value == null) {
    return defaultValue;
  }
  return +value;
}

const pooledTransform = new Transform();

function extractTransform(props) {
  const scaleX =
    props.scaleX != null ? props.scaleX : props.scale != null ? props.scale : 1;
  const scaleY =
    props.scaleY != null ? props.scaleY : props.scale != null ? props.scale : 1;

  pooledTransform
    .transformTo(1, 0, 0, 1, 0, 0)
    .move(props.x || 0, props.y || 0)
    .rotate(props.rotation || 0, props.originX, props.originY)
    .scale(scaleX, scaleY, props.originX, props.originY);

  if (props.transform != null) {
    pooledTransform.transform(props.transform);
  }

  return [
    pooledTransform.xx,
    pooledTransform.yx,
    pooledTransform.xy,
    pooledTransform.yy,
    pooledTransform.x,
    pooledTransform.y,
  ];
}

function extractOpacity(props) {
  // TODO: visible === false should also have no hit detection
  if (props.visible === false) {
    return 0;
  }
  if (props.opacity == null) {
    return 1;
  }
  return +props.opacity;
}

// Groups

// Note: ART has a notion of width and height on Group but AFAIK it's a noop in
// ReactART.

class Group extends React.Component {
  static contextTypes = {
    isInSurface: PropTypes.bool.isRequired,
  };

  render() {
    const props = this.props;
    invariant(
      this.context.isInSurface,
      'ART: <Group /> must be a child of a <Surface />',
    );
    return (
      <NativeGroup
        opacity={extractOpacity(props)}
        transform={extractTransform(props)}>
        {this.props.children}
      </NativeGroup>
    );
  }
}

class ClippingRectangle extends React.Component {
  render() {
    const props = this.props;
    const x = extractNumber(props.x, 0);
    const y = extractNumber(props.y, 0);
    const w = extractNumber(props.width, 0);
    const h = extractNumber(props.height, 0);
    const clipping = [x, y, w, h];
    // The current clipping API requires x and y to be ignored in the transform
    const propsExcludingXAndY = merge(props);
    delete propsExcludingXAndY.x;
    delete propsExcludingXAndY.y;
    return (
      <NativeGroup
        clipping={clipping}
        opacity={extractOpacity(props)}
        transform={extractTransform(propsExcludingXAndY)}>
        {this.props.children}
      </NativeGroup>
    );
  }
}


// Renderables
const SOLID_COLOR = 0;
const LINEAR_GRADIENT = 1;
const RADIAL_GRADIENT = 2;
const PATTERN = 3;

//TODO: art 包的 color 有不少 name color 是不支持的, 这里可以扩充一下
function parseColor(color) {
  return color === 'transparent' ? 'rgba(0,0,0,0)' : color;
}

function insertColorIntoArray(color, targetArray, atIndex) {
  const c = new Color(parseColor(color));
  targetArray[atIndex + 0] = c.red / 255;
  targetArray[atIndex + 1] = c.green / 255;
  targetArray[atIndex + 2] = c.blue / 255;
  targetArray[atIndex + 3] = c.alpha;
}

function insertColorsIntoArray(stops, targetArray, atIndex) {
  let i = 0;
  if ('length' in stops) {
    while (i < stops.length) {
      insertColorIntoArray(stops[i], targetArray, atIndex + i * 4);
      i++;
    }
  } else {
    for (const offset in stops) {
      insertColorIntoArray(stops[offset], targetArray, atIndex + i * 4);
      i++;
    }
  }
  return atIndex + i * 4;
}

function insertOffsetsIntoArray(stops, targetArray, atIndex, multi, reverse) {
  let offsetNumber;
  let i = 0;
  if ('length' in stops) {
    while (i < stops.length) {
      offsetNumber = (i / (stops.length - 1)) * multi;
      targetArray[atIndex + i] = reverse ? 1 - offsetNumber : offsetNumber;
      i++;
    }
  } else {
    for (const offsetString in stops) {
      offsetNumber = +offsetString * multi;
      targetArray[atIndex + i] = reverse ? 1 - offsetNumber : offsetNumber;
      i++;
    }
  }
  return atIndex + i;
}

function insertColorStopsIntoArray(stops, targetArray, atIndex) {
  const lastIndex = insertColorsIntoArray(stops, targetArray, atIndex);
  insertOffsetsIntoArray(stops, targetArray, lastIndex, 1, false);
}

function insertDoubleColorStopsIntoArray(stops, targetArray, atIndex) {
  let lastIndex = insertColorsIntoArray(stops, targetArray, atIndex);
  lastIndex = insertColorsIntoArray(stops, targetArray, lastIndex);
  lastIndex = insertOffsetsIntoArray(stops, targetArray, lastIndex, 0.5, false);
  insertOffsetsIntoArray(stops, targetArray, lastIndex, 0.5, true);
}

function applyBoundingBoxToBrushData(brushData, props) {
  const type = brushData[0];
  const width = +props.width;
  const height = +props.height;
  if (type === LINEAR_GRADIENT) {
    brushData[1] *= width;
    brushData[2] *= height;
    brushData[3] *= width;
    brushData[4] *= height;
  } else if (type === RADIAL_GRADIENT) {
    brushData[1] *= width;
    brushData[2] *= height;
    brushData[3] *= width;
    brushData[4] *= height;
    brushData[5] *= width;
    brushData[6] *= height;
  } else if (type === PATTERN) {
    // todo
  }
}

function extractBrush(colorOrBrush, props) {
  if (colorOrBrush == null) {
    return null;
  }
  if (colorOrBrush._brush) {
    if (colorOrBrush._bb) {
      // The legacy API for Gradients allow for the bounding box to be used
      // as a convenience for specifying gradient positions. This should be
      // deprecated. It's not properly implemented in canvas mode. ReactART
      // doesn't handle update to the bounding box correctly. That's why we
      // mutate this so that if it's reused, we reuse the same resolved box.
      applyBoundingBoxToBrushData(colorOrBrush._brush, props);
      colorOrBrush._bb = false;
    }
    return colorOrBrush._brush;
  }
  const c = new Color(parseColor(colorOrBrush));
  return [SOLID_COLOR, c.red / 255, c.green / 255, c.blue / 255, c.alpha];
}

function extractColor(color) {
  if (color == null) {
    return null;
  }
  const c = new Color(parseColor(color));
  return [c.red / 255, c.green / 255, c.blue / 255, c.alpha];
}

function extractStrokeCap(strokeCap) {
  switch (strokeCap) {
    case 'butt':
      return 0;
    case 'square':
      return 2;
    default:
      return 1; // round
  }
}

function extractStrokeJoin(strokeJoin) {
  switch (strokeJoin) {
    case 'miter':
      return 0;
    case 'bevel':
      return 2;
    default:
      return 1; // round
  }
}

// Shape
// Note: ART has a notion of width and height on Shape but AFAIK it's a noop in
// ReactART.
class Shape extends React.Component {
  render() {
    const props = this.props;
    const path = props.d || childrenAsString(props.children);
    const d = (path instanceof Path ? path : new Path(path)).toJSON();
    return (
      <NativeShape
        fill={extractBrush(props.fill, props)}
        opacity={extractOpacity(props)}
        stroke={extractColor(props.stroke)}
        strokeCap={extractStrokeCap(props.strokeCap)}
        strokeDash={props.strokeDash || null}
        strokeJoin={extractStrokeJoin(props.strokeJoin)}
        strokeWidth={extractNumber(props.strokeWidth, 1)}
        transform={extractTransform(props)}
        d={d}
      />
    );
  }
}


// Text
const cachedFontObjectsFromString = {};

const fontFamilyPrefix = /^[\s"']*/;
const fontFamilySuffix = /[\s"']*$/;

function extractSingleFontFamily(fontFamilyString) {
  // ART on the web allows for multiple font-families to be specified.
  // For compatibility, we extract the first font-family, hoping
  // we'll get a match.
  return fontFamilyString
    .split(',')[0]
    .replace(fontFamilyPrefix, '')
    .replace(fontFamilySuffix, '');
}

function parseFontString(font) {
  if (cachedFontObjectsFromString.hasOwnProperty(font)) {
    return cachedFontObjectsFromString[font];
  }
  const regexp = /^\s*((?:(?:normal|bold|italic)\s+)*)(?:(\d+(?:\.\d+)?)[ptexm\%]*(?:\s*\/.*?)?\s+)?\s*\"?([^\"]*)/i;
  const match = regexp.exec(font);
  if (!match) {
    return null;
  }
  const fontFamily = extractSingleFontFamily(match[3]);
  const fontSize = +match[2] || 12;
  const isBold = /bold/.exec(match[1]);
  const isItalic = /italic/.exec(match[1]);
  cachedFontObjectsFromString[font] = {
    fontFamily: fontFamily,
    fontSize: fontSize,
    fontWeight: isBold ? 'bold' : 'normal',
    fontStyle: isItalic ? 'italic' : 'normal',
  };
  return cachedFontObjectsFromString[font];
}

function extractFont(font) {
  if (font == null) {
    return null;
  }
  if (typeof font === 'string') {
    return parseFontString(font);
  }
  const fontFamily = extractSingleFontFamily(font.fontFamily);
  const fontSize = +font.fontSize || 12;
  const fontWeight =
    font.fontWeight != null ? font.fontWeight.toString() : '400';
  return {
    // Normalize
    fontFamily: fontFamily,
    fontSize: fontSize,
    fontWeight: fontWeight,
    fontStyle: font.fontStyle,
  };
}

const newLine = /\n/g;
function extractFontAndLines(font, text) {
  return {font: extractFont(font), lines: text.split(newLine)};
}

function extractAlignment(alignment) {
  switch (alignment) {
    case 'right':
      return 1;
    case 'center':
      return 2;
    default:
      return 0;
  }
}

class Text extends React.Component {
  render() {
    const props = this.props;
    const path = props.path;
    const textPath = path
      ? (path instanceof Path ? path : new Path(path)).toJSON()
      : null;
    const textFrame = extractFontAndLines(
      props.font,
      childrenAsString(props.children),
    );
    return (
      <NativeText
        fill={extractBrush(props.fill, props)}
        opacity={extractOpacity(props)}
        stroke={extractColor(props.stroke)}
        strokeCap={extractStrokeCap(props.strokeCap)}
        strokeDash={props.strokeDash || null}
        strokeJoin={extractStrokeJoin(props.strokeJoin)}
        strokeWidth={extractNumber(props.strokeWidth, 1)}
        transform={extractTransform(props)}
        alignment={extractAlignment(props.alignment)}
        frame={textFrame}
        path={textPath}
      />
    );
  }
}

// Declarative fill type objects - API design not finalized

function LinearGradient(stops, x1, y1, x2, y2) {
  const type = LINEAR_GRADIENT;

  if (arguments.length < 5) {
    const angle = ((x1 == null ? 270 : x1) * Math.PI) / 180;

    let x = Math.cos(angle);
    let y = -Math.sin(angle);
    const l = (Math.abs(x) + Math.abs(y)) / 2;

    x *= l;
    y *= l;

    x1 = 0.5 - x;
    x2 = 0.5 + x;
    y1 = 0.5 - y;
    y2 = 0.5 + y;
    this._bb = true;
  } else {
    this._bb = false;
  }

  const brushData = [type, +x1, +y1, +x2, +y2];
  insertColorStopsIntoArray(stops, brushData, 5);
  this._brush = brushData;
}

function RadialGradient(stops, fx, fy, rx, ry, cx, cy) {
  if (ry == null) {
    ry = rx;
  }
  if (cx == null) {
    cx = fx;
  }
  if (cy == null) {
    cy = fy;
  }
  if (fx == null) {
    // As a convenience we allow the whole radial gradient to cover the
    // bounding box. We should consider dropping this API.
    fx = fy = rx = ry = cx = cy = 0.5;
    this._bb = true;
  } else {
    this._bb = false;
  }
  // The ART API expects the radial gradient to be repeated at the edges.
  // To simulate this we render the gradient twice as large and add double
  // color stops. Ideally this API would become more restrictive so that this
  // extra work isn't needed.
  const brushData = [RADIAL_GRADIENT, +fx, +fy, +rx * 2, +ry * 2, +cx, +cy];
  insertDoubleColorStopsIntoArray(stops, brushData, 7);
  this._brush = brushData;
}

function Pattern(url, width, height, left, top) {
  this._brush = [PATTERN, url, +left || 0, +top || 0, +width, +height];
}

const ReactART = {
  LinearGradient: LinearGradient,
  RadialGradient: RadialGradient,
  Pattern: Pattern,
  Transform: Transform,
  Path: Path,
  Surface: Surface,
  Group: Group,
  ClippingRectangle: ClippingRectangle,
  Shape: Shape,
  Text: Text,
};

module.exports = ReactART;