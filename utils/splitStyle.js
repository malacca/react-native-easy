const textStyleProps = [
  'color', 'fontFamily', 'fontSize', 'fontStyle', 'fontVariant', 'fontWeight', 'letterSpacing', 'lineHeight',
  'textAlign', 'textAlignVertical', 'textDecorationColor', 'textDecorationLine', 'textDecorationStyle',
  'textShadowColor', 'textShadowOffset', 'textShadowRadius', 'textTransform'
];
/**
  分离 styles 中 Text 不支持/支持 的属性
  splitStyle({}) => {wrapStyle, textStyle}
 */
export default splitStyle = (styles) => {
  const wrapStyle = {};
  const textStyle = {};
  if (styles) {
    Object.entries(styles).forEach(([key, value]) => {
      textStyleProps.indexOf(key) > -1 ? textStyle[key] = value : wrapStyle[key] = value;
    });
  }
  return {wrapStyle, textStyle};
};