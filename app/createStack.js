import React from 'react';
import {Platform, StyleSheet, Animated} from 'react-native';
import {createStackNavigator} from '@react-navigation/stack';
import {setCardShadowEnabled, TransitionPresets} from './transitionPresets';
import {IsAndroid, IsLollipop, formatScreens, createNavigator} from './utils';

const isAndroid = Platform.OS === 'android';
const Stack = createStackNavigator();

/**
 * 创建 Stack 导航器 
 * 依赖 @react-navigation/stack
 * 
 * 1.1. props 
 *      设置 Stack.Navigator 支持的 Props
 * 1.2. Screen.stackOptions
 *      支持每个 Screen 使用 Screen.stackOptions 设置 Stack.Screen.options
 * 1.3. props.screenOptions.headerStyle
 *      修改了默认的 android header 改 投影 -> 下划线
 * 1.4. props.screenOptions.cardOverlayEnabled
 *      在 android Lollipop 以下版本默认开启
 * 
 * 2.1. navigation.push(route, { gestureEnabled:true, transitionPresets:"SlideFromRightIOS" })
 *      支持跳转时, 通过在 params 中指定 gestureEnabled 和 transitionPresets
 */
function createStack(screens, props) {
  const {
    screenOptions,
    ...navProps
  } = props||{};
  navProps.screenOptions = stackScreenOptions(screenOptions);
  screens = formatScreens(screens, 'stackOptions');
  const stackChildren = createNavigator(Stack, screens, navProps);
  return () => stackChildren;
}

function stackScreenOptions(screenOptions) {
  const isStaticOptions = typeof screenOptions === 'object' || screenOptions == null;
  if (isStaticOptions) {
    screenOptions = resolveStackStaticOptions(screenOptions);
  }
  return (props) => {
    const options = isStaticOptions ? screenOptions 
      : resolveStackStaticOptions(screenOptions(props));
    // params
    const {
      gestureEnabled:gesture, 
      transitionPresets:transition
    } = props.route.params||{};
    const finalTransition = !transition ? null : (
      typeof transition === 'string' && transition in TransitionPresets
        ? TransitionPresets[transition]
        : transition
    );
    const gestureEnabled = gesture === undefined ? (
      options.gestureEnabled === undefined ? !isAndroid : options.gestureEnabled
    ): gesture;
    return {
      ...options,
      gestureEnabled,
      ...finalTransition
    };
  }
}

function resolveStackStaticOptions(screenOptions) {
  const {
    headerStyle:customHeaderStyle, 
    cardOverlayEnabled: customCardOverlayEnabled,
    cardOverlay: customCardOverlay,
    ...options
  } = screenOptions||{};

  // headerStyle
  const headerStyle = {
    ...(IsAndroid ? (
      IsLollipop ? {
        elevation: StyleSheet.hairlineWidth,
      } : {
        elevation: null,
        borderBottomWidth: StyleSheet.hairlineWidth,
      }
    ) : {}),
    ...customHeaderStyle
  };

  // cardOverlayEnabled
  const cardOverlayEnabled = customCardOverlayEnabled === undefined
    ? IsAndroid && !IsLollipop : customCardOverlayEnabled;
  const cardOverlay = customCardOverlay||overlayView;

  setCardShadowEnabled(options.cardShadowEnable);
  return {
    ...options,
    headerStyle,
    cardOverlayEnabled,
    cardOverlay,
  };
}

// 对于 android 5 以下, Stack 默认显示 overlay
const overlayView = ({style}) => {
  return <Animated.View style={[styles.overlay, style]}/>
}

const styles = StyleSheet.create({
  overlay:{
    flex:1,
    backgroundColor:"#000"
  },
});


module.exports = {
  TransitionPresets,
  createStack
}