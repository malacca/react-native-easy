
import { Platform, Animated } from 'react-native';
import { TransitionPresets, CardStyleInterpolators } from '@react-navigation/stack';
import conditional from '@react-navigation/stack/src/utils/conditional';
import Color from 'color';

const { add } = Animated;
const ANDROID_VERSION_PIE = 28;
const IsLollipop = Platform.OS === 'android' && Platform.Version > 20;

/**
 * android 边缘 shadow
 */
const OPTIONS = {
  cardShadowEnabled: true,
  backgroundColor: 'rgb(242, 242, 242)',
  isTransparent: false,
};
function setCardShadowEnabled(cardShadowEnabled) {
  OPTIONS.cardShadowEnabled = cardShadowEnabled === undefined ? true : cardShadowEnabled;
}
function setBackgroundColor(backgroundColor) {
  OPTIONS.backgroundColor = backgroundColor;
  OPTIONS.isTransparent = backgroundColor && Color(backgroundColor).alpha() === 0;
}
function androidShadowStyle() {
  return IsLollipop && OPTIONS.cardShadowEnabled && !OPTIONS.isTransparent ? {
    backgroundColor: OPTIONS.backgroundColor,
    elevation:20,
  } : null;
}

/**
 * 以下函数调用
 * https://github.com/react-navigation/react-navigation/blob/master/packages/stack/src/TransitionConfigs/CardStyleInterpolators.tsx
 * 所有效果支持 overlayStyle, 且默认加大 overlayStyle 透明度, 原透明度 0.07 太小了
 */
const overlayInterpolate = {
  inputRange: [0, 1],
  outputRange: [0, 0.2],
  extrapolate: 'clamp',
};

// 左右滑动
function forHorizontalIOS(props) {
  const {current} = props;
  const interpolators = CardStyleInterpolators.forHorizontalIOS(props);
  interpolators.overlayStyle.opacity = current.progress.interpolate(overlayInterpolate);
  interpolators.cardStyle = {
    ...interpolators.cardStyle,
    ...androidShadowStyle()
  };
  return interpolators;
}

// 上下滑动
function forVerticalIOS(props) {
  const {current} = props;
  const interpolators = CardStyleInterpolators.forVerticalIOS(props);
  interpolators.cardStyle = {
    ...interpolators.cardStyle,
    ...androidShadowStyle()
  };
  interpolators.overlayStyle = {
    opacity: current.progress.interpolate(overlayInterpolate)
  };
  return interpolators;
}

// 从下到上 卡片式弹出
function forModalPresentationIOS(props) {
  const interpolators = CardStyleInterpolators.forModalPresentationIOS(props);
  interpolators.cardStyle = {
    ...interpolators.cardStyle,
    ...androidShadowStyle()
  };
  return interpolators;
}

// 从下到上 渐显
function forFadeFromBottomAndroid(props) {
  const interpolators = CardStyleInterpolators.forFadeFromBottomAndroid(props);
  return {
    ...interpolators,
    overlayStyle: { 
      opacity: 0
    },
    shadowStyle: {
      opacity: 0
    },
  };
}

// 从下到上 展开
function forRevealFromBottomAndroid(props) {
  const interpolators = CardStyleInterpolators.forRevealFromBottomAndroid(props);
  return {
    ...interpolators,
    shadowStyle: {
      opacity: 0
    },
  };
}

// 由小变大, 这个改动较大
function forScaleFromCenterAndroid({
  current,
  next,
  closing,
}) {
  const progress = add(
    current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    next
      ? next.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
          extrapolate: 'clamp',
        })
      : 0
  );
  const scale = conditional(
    closing,
    current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 1],
      extrapolate: 'clamp',
    }),
    progress.interpolate({
      inputRange: [0, 1, 2],
      outputRange: [0.75, 1, 1.1],
    })
  );
  const opacity = progress.interpolate({
    inputRange: [0, 0.5, 1, 2],
    outputRange: [0, .9, 1, 1],
  });
  const overlayOpacity = progress.interpolate({
    inputRange: [0, 1, 1.2, 2],
    outputRange: [0, 0.5, 0.33, 0],
  });
  return {
    containerStyle: {
      opacity,
      transform: [{ scale }],
      ...androidShadowStyle()
    },
    overlayStyle: { 
      opacity: overlayOpacity
    },
    // TODO: iOS 的 shadowStyle 默认仅在左边缘
    // 这显然不符合中间弹出效果, 所以这里需要修正
    // shadowStyle:{
    // }
  };
}
 
/**
 * 修改原版预置效果 
 * 1. 支持 android overlay shadow
 * 2. 支持 iOS 使用 android 效果(主要是部分效果处理 shadow 样式)
 */
const SlideFromRightIOS = {
  ...TransitionPresets.SlideFromRightIOS,
  cardStyleInterpolator: forHorizontalIOS,
}
const ModalSlideFromBottomIOS = {
  ...TransitionPresets.ModalSlideFromBottomIOS,
  cardStyleInterpolator: forVerticalIOS,
}
const ModalPresentationIOS = {
  ...TransitionPresets.ModalPresentationIOS,
  cardStyleInterpolator: forModalPresentationIOS,
}
const FadeFromBottomAndroid = {
  ...TransitionPresets.FadeFromBottomAndroid,
  cardStyleInterpolator: forFadeFromBottomAndroid,
}
const RevealFromBottomAndroid = {
  ...TransitionPresets.RevealFromBottomAndroid,
  cardStyleInterpolator: forRevealFromBottomAndroid,
}
const ScaleFromCenterAndroid = {
  ...TransitionPresets.ScaleFromCenterAndroid,
  cardStyleInterpolator: forScaleFromCenterAndroid,
}
const DefaultTransition = Platform.select({
  ios: SlideFromRightIOS,
  default:
    Platform.OS === 'android' && Platform.Version >= ANDROID_VERSION_PIE
      ? RevealFromBottomAndroid
      : FadeFromBottomAndroid,
});
const ModalTransition = Platform.select({
  ios: ModalSlideFromBottomIOS,
  default: DefaultTransition,
});

module.exports = {
  setBackgroundColor,
  setCardShadowEnabled,
  TransitionPresets: {
    SlideFromRightIOS,
    ModalSlideFromBottomIOS,
    ModalPresentationIOS,
    FadeFromBottomAndroid,
    RevealFromBottomAndroid,
    ScaleFromCenterAndroid,
    DefaultTransition,
    ModalTransition,
  },
}