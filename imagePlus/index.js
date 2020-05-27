import React from 'react';
import {Animated, Image} from 'react-native';

/**
图片组件, 使用方式与原生 Image 基本一样, 有以下不同
    1. animated=false  默认使用 Image, 可设置该项, 使用 Animated.Image
    2. 可使用 src="http://"  或  src=["http://", {uri:"http://"}, require()] 
       使用数组将依次尝试加载直到成功, 后面的作为前面的 fallback
    3. 仍然支持 source, 且优先级高于 src
    4. autoSize=false 自动设置尺寸, 当 Image 的 with/height 未设置时, 将自动设置图片尺寸
                      这样做可能让 UI 界面 在图片加载的过程中上下跳动，用户体验不好, 谨慎使用

    <ImagePlus 
      animated={Boolean}
      src={String|Array}
      autoDirection={Boolean}

      ...props  // 其他 Image 组件支持的属性
    />
*/
const FIRST_STATE = {
  layoutInset:false,
  layoutDirection:-1,
  layoutSize:0,

  width:0,
  height:0,

  src:null,
  index:0,
};

const getSource = src => (
  typeof src === 'string' ? {uri: src} : src
);

const ImagePlus = React.forwardRef((props, ref) => {
  const [update, forceUpdate] = React.useState(false);
  const img = React.useRef(FIRST_STATE);
  const imgRef = React.useRef();
  React.useImperativeHandle(ref, () => {
    return imgRef.current;
  });

  const {
    animated, 
    autoSize, 
    onLayout,
    onLoad,
    src, 
    onError,
    ...rest
  } = props;

  // autoSize 处理
  const _onLayout = (e) => {
    onLayout && onLayout(e);
    const state = img.current;
    if (state.layoutInset) {
      state.layoutInset = false;
      return;
    }
    const {width, height} = e.nativeEvent.layout;
    if (width && height) {
      state.layoutDirection = -1;  //无需自动尺寸
    } else if (!width && !height) {
      state.layoutDirection = 0;   //宽高都自动
    } else if (width) {
      state.layoutDirection = 1;   //仅高度自动
      state.layoutSize = width;
    } else {
      state.layoutDirection = 2;   //仅宽度自动
      state.layoutSize = width;
    }
    _autoSize();
  }

  const _onLoad = (e) => {
    onLoad && onLoad(e);
    const {width, height} = e.nativeEvent.source||{};
    const state = img.current;
    state.width = width;
    state.height = height;
    _autoSize();
  }

  const _autoSize = () => {
    const state = img.current;
    const {
      layoutDirection,
      layoutSize,
      width,
      height
    } = state;
    if (layoutDirection < 0 || !width || !height) {
      return;
    }
    const size = {width, height};
    if (layoutDirection > 0) {
      const ratio = width / height;
      if (layoutDirection > 1) {
        size.height = layoutSize;
        size.width = layoutSize * ratio;
      } else {
        size.width = layoutSize;
        size.height = layoutSize / ratio;
      }
    }
    state.layoutInset = true;
    imgRef.current.setNativeProps({
      style: size
    })
  }

  if (autoSize) {
    rest.onLoad = _onLoad;
    rest.onLayout = _onLayout;
  } else {
    rest.onLoad = onLoad;
    rest.onLayout = onLayout;
  }
  if (img.current.layoutInset) {
    img.current.layoutInset = false;
  }

  // src fallback 处理
  const _onError = (e) => {
    const state = img.current;
    if (!Array.isArray(state.src) || state.index >= state.src.length) {
      onError && onError(e);
      return;
    }
    state.index += 1;
    forceUpdate(!update);
  }
  
  let source = rest.source;
  rest.onError = onError;
  if (!source) {
    //if (src != img.current.src) {
    if (JSON.stringify(src) != JSON.stringify(img.current.src)) {
      img.current = {
        ...FIRST_STATE,
        src,
        inde:0,
      }
    }
    const state = img.current;
    if (Array.isArray(state.src)) {
      rest.onError = _onError;
      source = getSource(state.src[state.index])
    } else {
      source = getSource(state.src)
    }
    rest.source = source;
  }

  rest.ref = imgRef;
  return animated ? <Animated.Image {...rest}/> : <Image {...rest}/>;
});

export default React.memo(ImagePlus);