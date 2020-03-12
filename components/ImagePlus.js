import React from 'react';
import imageSize from './../utils/imageSize';
import {StyleSheet, Animated, Image} from 'react-native';

/**
  图片组件, 使用方式与原生 Image 基本一样
    1. autoHeight=true 会根据图片样式宽度 和 图片实际尺寸 等比例设置高度
    2. 仍然支持 source , 与 Image 完全相同, 且优先于 src
    3. 可使用 src="http://"  或  src={["http://", "http://"]}
       即图片地址为url的, 数组形式, 后面的为 fallback, 与 source 二选一
    
  <ImagePlus sourc={} src={[]} autoHeight={Boolean}../>
*/

// 校验 Image src|source 是否发生变动 
function isChangeSrc(props, prevProps) {
  if (props.source === prevProps.source && props.src === prevProps.src) {
    return false;
  }

  // check source
  const currentHashSource = 'source' in props;
  const prevHashSource = 'source' in prevProps;
  if (currentHashSource !== prevHashSource) {
    return true;
  }
  if (currentHashSource) {
    const sourceType = typeof props.source;
    if (sourceType !== typeof prevProps.source) {
      return true;
    }
    return sourceType === 'object' 
      ? props.source.uri !== prevProps.source.uri 
      : props.source !== prevProps.source;
  }

  // check src
  if (props.src === prevProps.src) {
    return false;
  }
  const currentHashSrc = 'src' in props && Array.isArray(props.src);
  const prevHasSrc = 'src' in prevProps && Array.isArray(prevProps.src);
  if (currentHashSrc !== prevHasSrc) {
    return true;
  }
  if (!currentHashSrc) {
    return false;
  }
  if (props.src.length !== prevProps.src.length) {
    return true;
  }
  const aSorted = props.src.sort();
  const bSorted = prevProps.src.sort();
  return !aSorted.map((val, i) => bSorted[i] === val).every(Boolean);
}

// 获取当前 source
function getSource(props, index) {
  const {src, source} = props;
  if (source) {
    return index ? null : source
  }
  if (!src) {
    return null;
  }
  if (Array.isArray(src)) {
    return index > src.length - 1 ? null : {uri: src[index]}
  }
  return index ? null : {uri: src}
}

export default class ImagePlus extends React.PureComponent {

  constructor(props) {
    super(props);

    // 不是 autoHeight, 在初始化时就先设置 source
    // 这就与直接使用 RN Image 差不多了, 但本组件额外 提供了 fallback 拓展
    // 考虑到大部分情况下, fallback 可能是不被触发的, 所以等同于 Image 的概率最大
    // 如果是 autoHeight, 就不再这里设置了, 
    // 而是在 onLayout 后获取宽度 -> 加载图片后计算高度 -> 再更新 state.source
    const source = !props.autoHeight ? getSource(props, 0) : null;
    this.srcTried = source ? 1 : 0;
    this.layoutWidth = 0;
    this.imgRadio = 0;
    this.updateSrc = false;
    this.state = {
      source,
      height: 0
    }
  }

  setNativeProps(props) {
    const ImageRef = this.ImageRef;
    if (ImageRef) {
      ImageRef.setNativeProps(props);
    }
  }

  _updateImageSource = (error) => {
    const source = getSource(this.props, this.srcTried);
    this.srcTried++;
    if (!source) {
      const {onError} = this.props;
      if (onError && error) {
        onError && onError(error);
      }
      return;
    }
    if (this.props.autoHeight) {
      imageSize(source).then(res => {
        this.imgRadio = res.height / res.width;
        this.setState({
          source, 
          height: this.layoutWidth * this.imgRadio
        })
      }).catch((err) => {
        this._updateImageSource(err);
      });
    } else {
      this.setState({source})
    }
  }

  // autoHeight 类型, 在 layout 后加载图片
  _onLayout = (e) => {
    const width = e.nativeEvent.layout.width;
    if (this.imgRadio) {
      const {onLayout} = this.props;
      onLayout && onLayout(e);

      // 宽度发生变动, 自动修正高度
      // 外部 props.width 修改了, 也可能同时修改了 props.src
      // 但这里只认准宽度, 宽度变就修正高度
      if (width !== this.layoutWidth) {
        this.layoutWidth = width;
        this.setState({
          height: width * this.imgRadio
        })
      }
    } else {
      this.layoutWidth = width;

      // 没有 imgRadio, 可能是外部更新 props.src 或 初始化时触发
      // 若是外部更新, componentDidUpdate 已经触发了 _updateImageSource
      // 这里仅设置 layoutWidth, 让 _updateImageSource 内的计算使用最新 width 即可
      // 若为初始化触发, 则需在这里调用 _updateImageSource
      if (this.updateSrc) {
        this.updateSrc = false;
      } else {
        this._updateImageSource();
      }
    }
  }

  // 非 autoHeight, 是直接将 source 挂载到 Image 上了
  // 监听 onError 回调, 失败后尝试 fallback
  _onError = (e) => {
    this._updateImageSource(e);
  }

  componentDidUpdate(prevProps) {
    if (isChangeSrc(this.props, prevProps)) {
      if (this.props.autoHeight) {
        this.imgRadio = 0;
        this.updateSrc = true;
      }
      this.srcTried = 0;
      requestAnimationFrame(() => {
        this._updateImageSource();
      })
    } else if (this.props.autoHeight !== prevProps.autoHeight && this.props.autoHeight) {
      this.srcTried = 0;
      this.imgRadio = 0;
    }
  }

  render(){
    const {animated, autoHeight, style, src, ...props} = this.props;
    if (autoHeight) {
      const flattenStyle = StyleSheet.flatten(style);
      flattenStyle.height = this.state.height;
      props.style = flattenStyle;
      props.onLayout = this._onLayout;
    } else {
      props.style = style;
      props.onError = this._onError;
    }
    props.source = this.state.source;
    props.ref = ref => this.ImageRef = ref;
    if (animated) {
      return <Animated.Image {...props}/>;
    }
    return <Image {...props}/>;
  }
}