import React from 'react';
import {Platform, StatusBar, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

/**
 * RN StatusBar 组件不能很好的配合 navigation, 比如 TabA 页面切换到 TabB 页面
 * 再切回到 TabA 页面, StatusBar 将保持为 TabB 的设置, 因为 TabB 没被销毁, 状态就会保持为最后一次访问的页面
 * 所以这里弄一个 Screen 组件, 来配合 navigation 的 StatusBar 设置, 仅可用在 react-navigation 内
 * 
 * 参数 mode
 * 
 * 0: 普通模式, statsuBar 独立于可用空间外
 * 1: 下沉模式, statusBar 设置为沉浸式, 浮动在内容区上方
 *    但在内容区顶部使用 view 作为占位符, 并设置 background, 观感上与 mode=0 相同
 *    这种主要是为了在与沉浸模式切换时不产生跳跃感
 * 2: 沉浸模式, 同模式 2, 但不会添加 view 占位符, 内容区延伸到 statusBar 下方
 * 3: 全屏模式, 不显示 statusBar, 内容区占满屏幕
 * 
 * 备注:  
 * - 沉浸模式(1/2) 可能不支持, 自动降级为普通模式(0)
 * - 模式 2 兼容刘海屏, 内容区会延伸到刘海下方, 注意遮挡问题
 * - 模式 3 在刘海屏机型, statusBar 变成一个黑边, 若期望全屏, 需设置
 *   windowLayoutInDisplayCutoutMode: shortEdges
 * - 对于刘海屏, 在横屏状态下, 无论是沉浸模式还是全屏模式, 
 *   statusBar 独立于可用空间外, 所以该 Screen 并不适合处理横屏全屏场景
 * 
 * <Screen
 *    darkText={false}   // 是否使用黑色字体
 *    background={""}     // 背景颜色
 *    mode={0|1|2|3}      // 模式
 *    animated={false}    // 是否以动态效果切换 statusBar 模式
 * >
 *    {children}
 * </Screen>
 */
function Screen(props) {
  const {
    name,
    children,
    ...status
  } = props;

  useFocusEffect(
    React.useCallback(() => {
      Screen.setCurrentStatus(status)
    }, [])
  );

  const {mode, background} = Screen.setCurrentStatus(status);
  return mode === 1 ? <View style={{flex:1}}>
    <View style={{
      height:StatusBar.currentHeight,
      backgroundColor:background
    }}/>
    {children}
  </View> : children;
};

// 是否支持 沉浸式/
const IsAndroid = Platform.OS === 'android', Version = Platform.Version;
const supportTranslucent = !(IsAndroid && Version < 21);
const supportDarkText = !(IsAndroid && Version < 23);
Screen.supportDarkText = supportDarkText;
Screen.supportBackground = supportTranslucent;
Screen.supportTranslucent = supportTranslucent;

// 设置/获取 默认状态
Screen.defaultStatus = {
  darkText:false,
  background:"#000",
  mode:0,
  animated:false
};
Screen.setDefaultStatus = (status) => {
  Screen.defaultStatus = {
    ...Screen.defaultStatus,
    ...status
  }
}

// 获取/设置 当前状态
Screen.currentStatus = {};
Screen.clearCurrentStatus = () => {
  // 重置状态, 通常在 App Unmount 时调用
  Screen.currentStatus = {};
}
Screen.setCurrentStatus = (status) => {
  const {
    darkText = Screen.defaultStatus.darkText,
    background = Screen.defaultStatus.background,
    mode = Screen.defaultStatus.mode,
    animated = Screen.defaultStatus.animated,
  } = status;

  // 文字颜色
  if (supportDarkText && darkText !== Screen.currentStatus.darkText) {
    Screen.currentStatus.darkText = darkText;
    StatusBar.setBarStyle(darkText ? 'dark-content' : 'light-content', animated)
  }

  // 模式
  const oldMode = Screen.currentStatus.mode;
  const newMode = !supportTranslucent && (mode === 1 || mode === 2) ? 0 : mode;
  if (newMode !== oldMode) {
    Screen.currentStatus.mode = newMode;
    
    if (newMode > 2) {
      // 全屏模式, 上次为普通模式需沉浸以兼容刘海屏
      if (!oldMode && supportTranslucent) {
        StatusBar.setTranslucent(true);
      }
      StatusBar.setHidden(true, animated);

    } else if (newMode > 0) {
      // 沉浸模式, 上次为普通模式才进行沉浸
      if (!oldMode) {
        StatusBar.setTranslucent(true);
      }
      // 取消全屏
      if (oldMode === undefined || oldMode === 3) {
        StatusBar.setHidden(false, animated);
      }

    } else {
      // 取消沉浸
      if (supportTranslucent) {
        StatusBar.setTranslucent(false);
      }
      // 取消全屏
      if (oldMode === undefined || oldMode === 3) {
        StatusBar.setHidden(false, animated);
      }
      
    }
  }

  // 背景色
  if (supportTranslucent) {
    const oldBackground = !oldMode ? Screen.currentStatus.background : 'transparent';
    const newBackground = !newMode ? background : 'transparent';
    Screen.currentStatus.background = background;
    if (oldBackground !== newBackground) {
      StatusBar.setBackgroundColor(newBackground, animated);
    }
  }
  return Screen.currentStatus;
}


export default Screen;