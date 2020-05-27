import React from 'react';
import {View} from 'react-native';
import {useTheme, NavigationContainer, StackActions} from '@react-navigation/native';
import {setBackgroundColor} from './transitionPresets';
import {Modal, ModalToast} from './modal';

const REF = {
  navigation: null,
  modal: null
};

/**
 * AppContainer 组件
 * 使用该组件创建 APP 根组件 可全局使用 navigation/modal
 * 依赖 @react-navigation/native
 * 
 * props: {
 *  // 导航器相关配置
 *  theme: 导航器主题,
 *  initialState: 导航器的载入state,
 *  onStateChange: 导航监听,
 *  linking: 导航器载入link,
 *  fallback: 导航器载入link失败的fallback
 * 
 * 
 *  appProps  // 最外层容器的 props
 *  ref: 导航器暴露方法 + 最外层容器 setNativeprops
 *       方便在不重新读取整个 AppContainer 的情况下更新最外层容器style
 *       比如在载入时设置 app 为透明不可见, 待某些操作之后重置 opacity
 *  modal: 初始化时载入的 Modal 弹层
 * }
 */
const AppContainer = React.forwardRef((props, ref) => {
  const { colors } = useTheme();
  setBackgroundColor(colors.background);
  const appRef = React.useRef();
  React.useImperativeHandle(ref, () => {
    return {
      ...REF.navigation,
      setNativeProps:(props) => {
        return appRef.current.setNativeProps(props)
      }
    };
  });
  const {appProps, modal, ...navProps} = props;
  const {style, ...rest} = appProps||{};
  return (<View {...rest} style={[{flex:1}, style]} ref={appRef} collapsable={false}>
    <NavigationContainer {...navProps} ref={r => REF.navigation = r} />
    <Modal {...modal} ref={r => REF.modal = r} />
  </View>);
});


/**
 * 全局可用的导航 navigation
 */
const navigation = {
  // 获取原始 Ref
  ref: () => {
    return REF.navigation
  },
  // 跳到指定页面
  // 1. 若该页面已打开,会返回到该页
  // 2. 否则会打开该页
  // 3. 当前就在该页, 什么都不会发生
  navigate: (...arg) => {
    if (REF.navigation) {
      return REF.navigation.navigate(...arg)
    }
  },
  // 打开页面, 与 navigate 的不同在于总是打开新页面
  // 即同一个页面可被打开多次, param 不同
  push: (name, params) => {
    if (REF.navigation) {
      return REF.navigation.dispatch(
        StackActions.push(name, params)
      )
    }
  },
  // 将当前页替换为指定页面
  replace: (name, params) => {
    if (REF.navigation) {
      return REF.navigation.dispatch(
        StackActions.replace(name, params)
      )
    }
  },
  // 是否能返回
  canGoBack: () => {
    return REF.navigation ? REF.navigation.canGoBack() : false;
  },
  // 返回上一页
  goBack: () => {
    if (REF.navigation) {
      return REF.navigation.goBack();
    }
  },
  // 返回上 count 页
  pop: (count) => {
    if (REF.navigation) {
      return REF.navigation.dispatch(
        StackActions.pop(count)
      )
    }
  },
  // 返回到 stack 栈的首页
  popToTop: () => {
    if (REF.navigation) {
      return REF.navigation.dispatch(
        StackActions.popToTop()
      )
    }
  },
  // 新增监听事件
  addListener: (...arg) => {
    if (REF.navigation) {
      return REF.navigation.addListener(...arg)
    }
  },
  // 重置当前页面的 params
  setParams: (...arg) => {
    if (REF.navigation) {
      return REF.navigation.setParams(...arg)
    }
  },
  // 获取当前页面的 params
  // 该方法 react-navigation 已移除, 
  // 但在某项深层组件是有可能需要获取该参数的
  // 所以这里捡回来
  getParams: () => {
    if (REF.navigation) {
      return getRouteParams(REF.navigation.getRootState());
    }
  },
}

function getRouteParams(data) {
  const {index, routes} = data;
  if (gint(index, null) === null 
    || !Array.isArray(routes) 
    || index >= routes.length
  ) {
    return;
  }
  const route = routes[index];
  if (route === null || typeof route !== 'object') {
    return;
  }
  const {params, state=null} = route;
  if (state === null || typeof state !== 'object') {
    return params;
  }
  return getRouteParams(state);
}

/**
 * 全局 Modal 操作
 * RN 自带的 Modal 组价是真 Modal, 会在原生层面创建一个 activity
 * 这里提供的是一个 View 模拟的 modal, 仍在在当前 activity 方便全局调用
 *  1. 仍然可以在 Screen 中使用原生 Modal,
 *  2. 该全局 Modal 不能嵌套, 每次只显示一个, 若正在显示 modal
 *     再次调用 open 会关闭目前的 modal
 */
const modal = {
  // 当前是否有正在显示的 modal
  isOpen: () => {
    return REF.modal && REF.modal.isOpen();
  },
  // 弹出 modal
  open: (component, config, props) => {
    return REF.modal && REF.modal.open(component, config, props);
  },
  // 关闭 modal
  close: (callback, config) => {
    return REF.modal && REF.modal.close(callback, config);
  },
  // modal 小应用: toast
  toast: (msg, timeout, config) => {
    timeout = gint(timeout, 1200);
    modal.open(ModalToast, {
      timeout,
      overlayColor:'transparent',
      overlayThrough:true,
      onBack:'back',
      opacity:0,
      ...config
    }, {msg});
  },
  // modal 小应用: loading, 需手动调用 close 才会关闭
  loading: (small, color, config) => {
    modal.open(ModalToast, {
      overlayColor:'transparent',
      onBack:'back',
      opacity:0,
      ...config
    }, {load:true, small, color});
  }
}

module.exports = {
  AppContainer,
  navigation,
  modal,
}