
/**
  当前需要的版本
  react-navigation: 4.0.10
  react-navigation-tabs: 2.7.0
  react-navigation-stack: 1.10.3

  记录一下关于版本的问题

  1. react-navigation 5.x 是几乎完全不同的 api 了, 所以需锁定版本
  2. react-navigation-tabs 可能还可以继续升级, 后续再观察
  3. react-navigation-stack 需锁定为 1.x 版本, 可考虑升级, 但需要进行修改
  
  TODO: 需权衡利弊, 是否有必要将 react-navigation-stack 升级到 2.x

  1. react-navigation 4.x 导出了一个 SafeAreaView
     使用的是 react-native-safe-area-view < 1.0 该版本为纯 js 的
     react-navigation-stack 1.x 直接使用该组件作为 SafeAreaView 设定
     但 2.x 升级了 react-native-safe-area-view 到 1.x
     该版本需额外安装一个原生的 react-native-safe-area-context 依赖
     到底提升了什么, 是否有必要 需要先搞清楚

  2. react-navigation-stack 2.x 进行了比较大幅的升级, 文件结果也发生了变化
     若升级, 那么当前组件需要重新适配

  3. 使用 react-navigation-stack 1.x 的一个隐患是: 该版本依赖了 MaskedViewIOS 组件
     而该组件已经从 rn 核心移除, 好在该组件只会在 createStackNavigator 指定 headerTransitionPreset='uikit' 时调用
     所以不使用该特性, 也不会报错, 能正常跑起来

  4. 所以应搞清楚 react-native-safe-area-view/react-native-safe-area-context 这部分的升级
     是否有必须升级的必要, 若无, 继续使用当前版本也没什么问题
     并且即使升级了, 待 react-navigation 5.x 发布, 又不能正常兼容了
*/
import React from 'react';
import Service from './Service';
import {
  Dimensions,
  Platform, 
  StyleSheet,
  TouchableNativeFeedback, 
  TouchableOpacity, 
  TouchableWithoutFeedback, 
  Animated,
  ActivityIndicator,
  View, 
  Image, 
  Text
} from 'react-native';

import {createBottomTabNavigator} from 'react-navigation-tabs';
import {createAppContainer, ThemeColors} from 'react-navigation';
import {
  StackViewStyleInterpolator, 
  StackViewTransitionConfigs, 
  createStackNavigator
} from 'react-navigation-stack';
import getSceneIndicesForInterpolationInputRange from 'react-navigation-stack/src/utils/getSceneIndicesForInterpolationInputRange';

const IsAndroid = Platform.OS === 'android';
const {width:screenWidth, height:screenHeight} = Dimensions.get('window');


// 缓存 tabBar badge/label 函数, 以便全局可用
let _TabMainName;
const _TabCache = {};
const _TabHeader = {};
const setTabCache = (tabName, routeName, key, value) => {
  if (!tabName || !routeName || !(tabName in _TabCache)) {
    return;
  }
  if (!(routeName in _TabCache[tabName])) {
    _TabCache[tabName][routeName] = {};
  }
  _TabCache[tabName][routeName][key] = value;
}
const rmTabCache = (tabName, routeName, key) => {
  if (
    !tabName || !routeName || 
    !(tabName in _TabCache) || 
    !(routeName in _TabCache[tabName]) || 
    !(key in _TabCache[tabName][routeName])
  ) {
    return;
  }
  delete _TabCache[tabName][routeName][key];
  if (!Object.keys(_TabCache[tabName][routeName]).length) {
    delete _TabCache[tabName][routeName];
  }
}
const runTabCache = (tabName, routeName, method, set, value) => {
  tabName = tabName||_TabMainName;
  if (
    !tabName || !routeName || 
    !(tabName in _TabCache) || 
    !(routeName in _TabCache[tabName]) || 
    !(method in _TabCache[tabName][routeName])
  ) {
    return set ? false : null;
  }
  const f = _TabCache[tabName][routeName][method];
  return set ? f.set(value) : f.get();
}
const formatBadge = (badge) => {
    if (badge === undefined) {
      badge = null;
    }
    if (badge !== null) {
      badge = isNaN(badge) ? null : parseInt(badge, 10)
    }
    return badge;
}
const gint = (v) => {
  v = parseInt(v);
  return typeof v === "number" && isFinite(v) && Math.floor(v) === v ? v : null;
};




/**
 * 模仿 react-navigation-stack/src/StackView/StackViewStyleInterpolator
 * 从中间弹出的转场动画效果
 */
const forInitial = (props) => {
  const { navigation, scene } = props;
  const focused = navigation.state.index === scene.index;
  const opacity = focused ? 1 : 0;
  // If not focused, move the scene far away.
  const translate = focused ? 0 : 1000000;
  return {
    opacity,
    transform: [{ translateX: translate }, { translateY: translate }],
  };
}
const boomInterpolator = (props) => {
  const { layout, position, scene } = props;
  if (!layout.isMeasured) {
    return forInitial(props);
  }
  const interpolate = getSceneIndicesForInterpolationInputRange(props);
  if (!interpolate) return { opacity: 0 };
  const { first, last } = interpolate;
  const index = scene.index;

  const opacity = position.interpolate({
    inputRange: [first, index, last],
    outputRange: [0, 1, 1],
    extrapolate: 'clamp',
  });
  const scale = position.interpolate({
    inputRange: [first, index, last],
    outputRange: [0.1, 1, 1],
    extrapolate: 'clamp',
  });
  return {
    opacity,
    transform: [{ scale }],
  };
}




/**
 * Container 转场动画
 */
const getTransitionConfig = (transitionProps) => {
  const params = transitionProps.scene.route.params || {};
  const {transition, modal} = params;
  return modal && !IsAndroid ? 'modal' : transition;
}
const TransitionConfiguration = (transitionProps, prevTransitionProps) => {
  let transition = getTransitionConfig(transitionProps);
  if (prevTransitionProps && prevTransitionProps.index > transitionProps.index) {
    transition = getTransitionConfig(prevTransitionProps);
  }
  // 自定义
  if(typeof transition === 'object') {
    return transition;
  }
  // 无效果
  if (transition === 'none') {
    return StackViewTransitionConfigs.NoAnimation;
  }
  // 渐隐渐现
  if (transition === 'fade') {
    return {
      screenInterpolator: StackViewStyleInterpolator.forFade
    }
  }
  // 从底部
  if (transition === 'modal') {
    return IsAndroid ? StackViewTransitionConfigs.FadeInFromBottomAndroid :
          StackViewTransitionConfigs.ModalSlideFromBottomIOS;
  }
  // 从中间弹出
  if (transition === 'boom') {
    return {
      screenInterpolator:boomInterpolator
    }
  }
  // 默认从右侧滑入
  return IsAndroid ? StackViewTransitionConfigs.SlideFromRightIOS : {};
}




/**
  tabBar 样式
*/
const styles = StyleSheet.create({
  icon:{
    height: 25, 
    width:'100%',
    marginTop:5,
  },
  label: {
    textAlign: 'center',
    backgroundColor: 'transparent',
    fontSize: 11,
    marginBottom: 1.5,
  },
  badge:{
    position: 'absolute',
    left:'50%',
    top:3,
    marginLeft:6,
    paddingLeft:4,
    paddingRight:4,
    minWidth:16,
    maxWidth: 34,
    height:16,
    borderRadius: 16,
    backgroundColor:'red',
    overflow:'hidden',
    flexDirection:'row',
    justifyContent: 'center',
    alignItems:'center',
  },
  badgeTxt:{
    fontSize:12,
    lineHeight:14,
    color: 'white',
    textAlign:'center',
    fontWeight:'bold',
  },
  badgeDot:{
    position: 'absolute',
    left:'50%',
    top:5,
    marginLeft:8,
    width:8,
    height:8,
    borderRadius: 8,
    backgroundColor:'red',
  },
  dialog:{
    ...StyleSheet.absoluteFill,
    flexDirection:'row',
    justifyContent:'center',
  },
  toast:{
    backgroundColor:'rgba(0,0,0,.65)',
    paddingVertical:6,
    paddingHorizontal:10,
    borderRadius:4,
  },
  ToastTxt:{
    color:'white',
    fontSize:15
  },
  toastLoad:{
    backgroundColor:'rgba(0,0,0,.7)',
    padding:15,
    borderRadius:6,
  }
});




/**
 * TabBar 单个 item
 * icon/label 居中,  icon 高度固定, 宽度自动
 */
class TabBarWrapper extends React.Component {
  constructor(props) {
    super(props);
    const {route, testID} = props;
    const {tabName, badge} = testID;
    const {routeName} = route;
    this.state = {
      badge:formatBadge(badge)
    }
    setTabCache(tabName, routeName, 'badge', {
      set: this.set.bind(this),
      get: this.get.bind(this),
    })
  }
  get(){
    return this.state.badge
  }
  set(badge){
    this.setState({badge: formatBadge(badge) })
    return true;
  }
  componentWillUnmount(){
    const {route, testID} = this.props;
    const {tabName} = testID;
    const {routeName} = route;
    rmTabCache(tabName, routeName, 'badge');
  }
  render() {
    const {
      route,
      focused,
      onPress,
      onLongPress,
      testID: tabBarTestID,
      accessibilityLabel,
      accessibilityRole,
      accessibilityStates,
      children,
      ...rest
    } = this.props;
    // 从 testID 提取新增配置项
    const {rippleColor, activeOpacity, testID} = tabBarTestID;
    const props = {
      onPress, onLongPress, testID, accessibilityLabel, accessibilityRole, accessibilityStates,
      hitSlop: { left: 15, right: 15, top: 0, bottom: 5 },
    };
    const badgeView = this.state.badge === null ? null : (
      this.state.badge > 0 
      ? 
        <View style={styles.badge}><Text style={styles.badgeTxt} numberOfLines={1}>{this.state.badge}</Text></View>
      :
        <View style={styles.badgeDot} />
    );
    // android api level > 20 才支持 rippleColor
    const ripple = IsAndroid && rippleColor && Platform.Version > 20 ? rippleColor : null;

    // rippleColor/activeOpacity 都不使用
    if (!ripple && activeOpacity === 1) {
      return (
        <TouchableWithoutFeedback {...props}>
          <View {...rest}>
            {children}
            {badgeView}
          </View>
        </TouchableWithoutFeedback>
      );
    }
    // 使用 rippleColor 效果
    if (ripple) {
      return (
        <TouchableNativeFeedback {...props} background={TouchableNativeFeedback.Ripple(
            ripple, true
        )}>
            <View {...rest}>
              {children}
              {badgeView}
            </View>
        </TouchableNativeFeedback>
      );
    }
    // 使用 activeOpacity 效果
    return (
      <TouchableOpacity {...props} style={{flex:1}} activeOpacity={activeOpacity}>
        <View {...rest}>
          {children}
          {badgeView}
        </View>
      </TouchableOpacity>
    );
  }
}



/**
 * TabBar 中的 text label
 */ 
class TabBarLabelWrapper extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      label:props.children
    }
    const {tabName, routeName} = props.route;
    setTabCache(tabName, routeName, 'label', {
      set: this.set.bind(this),
      get: this.get.bind(this),
    })
  }
  get() {
    return this.state.label;
  }
  set(label) {
    this.setState({label})
    return true;
  }
  componentWillUnmount(){
    const {tabName, routeName} = this.props.route;
    rmTabCache(tabName, routeName, 'label');
  }
  render() {
    const {route, ...props} = this.props;
    return <Text {...props}>{this.state.label}</Text>
  }
}



/**
 * 创建 TabNavigator
  TabConfig 为 createBottomTabNavigator 的 TabNavigatorConfig 参数, 有所不同
  1. 新增 activeOpacity/rippleColor 配置项
  2. TabNavigatorConfig.defaultNavigationOptions 中的 
     tabBarButtonComponent/tabBarIcon/tabBarLabel 不允许自定义
     带来一个小影响, 修改 header 配置, rn 自动刷新失效, 需手动刷新
  3. TabNavigatorConfig.navigationOptions 可以不用配置
     而是像普通页面那样在 tab 具体页面中配置 navigationOptions
  4. 可以将 EasyTab() 创建的对象当做 screen 丢给 EasyStack
  5. 也可在某个 page 组件直接返回 EasyTab().container() 来展示一个二级 tab 页面
*/
class EasyTab {
  constructor(TabScreens, TabConfig, TabName) {
    this.TabScreens = TabScreens;
    this.TabConfig = TabConfig;
    this.TabName = TabName;
  }

  navigator(){
    const TabScreensList = Object.entries(this.TabScreens||{});
    if (!TabScreensList.length) {
      console.warn("EasyTab screens empty")
      return null;
    }
    // 整理 screens
    const TabScreens = {};
    const TabBadge = {};
    const TabIcon = {};
    const TabIconActive = {};
    const TabLabel = {};
    TabScreensList.forEach(([key, item]) => {
      const isObject = typeof item === 'object';
      const {badge=null, icon, iconActive, label, ...screen} = isObject ? item : {};
      const screenItem = isObject ? screen : {screen: item};
      TabBadge[key] = badge;
      TabIcon[key] = icon;
      TabIconActive[key] = iconActive;
      TabLabel[key] = label||key;
      TabScreens[key] = screenItem;
    });
    // config 新增 activeOpacity/rippleColor 配置项
    const {
      tabBarOptions={},
      defaultNavigationOptions,
      activeOpacity=.75,
      rippleColor='rgba(0,0,0,.5)',
      ...TabConfig
    } = this.TabConfig||{};

    // 新增配置项通过 tabBarTestID 传递给 TabBarWrapper
    // 看了下 react-navigation 的源码, 唯一能利用的也就这个属性了
    const tabBarTestID = {
      activeOpacity,
      rippleColor
    }
    // 若设置了 tabName, 则进行缓存, 以便可全局设置 Badge/Label
    const tabName = this.TabName;
    if (tabName) {
      tabBarTestID.tabName = tabName;
      _TabCache[tabName] = {};
    }

    // 配置 TabConfig.tabBarOptions
    // 1. adaptive 原本缺省值为 true, 作用是 iOS11 iPad 横屏, tabbar 会转为 icon label 左右排列
    //    由于新增了 badge 功能, 左右排列很难实现漂亮的 ui, 所以默认改为 false
    //    如果不使用 badge 或通过自定义 style 自己实现了可接受 ui, 可以重新配置为 true
    // 2. allowFontScaling 缺省值改为 false
    const {
      allowFontScaling=false,
      adaptive=false,
      labelStyle,
      tabBarIconColor,
      tabBarLabelColor,
      ...options
    } = tabBarOptions;
    options.adaptive = adaptive;
    options.allowFontScaling = allowFontScaling;
    TabConfig.tabBarOptions = options;

    // 新增设置 icon 和 label 颜色值的回调函数
    const getTabBarIconColor = typeof tabBarIconColor === 'function' ? tabBarIconColor : null;
    const getTabBarLabelColor = typeof tabBarLabelColor === 'function' ? tabBarLabelColor : null;

    // 整理自定义 TabConfig.defaultNavigationOptions
    // 1. tabBarButtonComponent/tabBarIcon/tabBarLabel 不允许自定义
    // 2. 如果真的必须要自定义, 可以在每个 screens 配置中通过 navigationOptions 重置覆盖
    const customOptionsType = typeof defaultNavigationOptions;
    TabConfig.defaultNavigationOptions = (props) => {
      const customOptions = customOptionsType === 'object' ? defaultNavigationOptions : (
        customOptionsType === 'function' ? defaultNavigationOptions(props) : {}
      );
      // 补上 手动设置的 tabBarTestID, 并传递初始 badge
      const {routeName} = props.navigation.state;
      const {tabBarTestID:testID} = customOptions;
      tabBarTestID.testID = testID;
      tabBarTestID.badge = TabBadge[routeName];
      const finalOptions = {
        ...customOptions,
        tabBarTestID,
        tabBarButtonComponent: TabBarWrapper,
        tabBarIcon: ({focused, tintColor}) => {
          if (focused && TabIconActive[routeName]) {
            return <Image style={styles.icon} resizeMode="contain" source={TabIconActive[routeName]} />
          }
          if (TabIcon[routeName]) {
            const color = getTabBarIconColor ? getTabBarIconColor({focused, tintColor, routeName}) : (TabIconActive[routeName] ? null : tintColor);
            return <Image style={styles.icon} resizeMode="contain" tintColor={color} source={TabIcon[routeName]} />
          }
          return null;
        },
        tabBarLabel: ({focused, tintColor, orientation}) => {
          const color = getTabBarLabelColor ? getTabBarLabelColor({focused, tintColor, routeName}) : tintColor;
          return <TabBarLabelWrapper
            numberOfLines={1}
            allowFontScaling={allowFontScaling}
            style={[
              styles.label,
              {color},
              labelStyle
            ]}
            route={{tabName, routeName}}
          >{TabLabel[routeName]}</TabBarLabelWrapper>
        },
      }
      // tabBarLabel 定义为组件了, 无障碍获取不到文字了, 若没定义, 这里手动返回 
      if (!('tabBarAccessibilityLabel' in finalOptions)) {
        finalOptions.tabBarAccessibilityLabel = '切换到 ' + TabLabel[routeName]
      }
      return finalOptions;
    };
    // tabNavigator 在 StackNavigator 中的 header 配置, 若没有配置该项, 这里给一个默认的配置, 通过该配置
    // 可以让 tab 页面与普通 StackNavigator 栈内页面一样, 在内部 通过 navigationOptions 设置 header
    if (!('navigationOptions' in TabConfig)) {
      TabConfig.navigationOptions = (props) => {
        const {navigation} = props;
        const {routeName: TabName} = navigation.state;
        const {routeName} = navigation.state.routes[navigation.state.index];
        if (!(TabName in _TabHeader)) {
          _TabHeader[TabName] = {};
        }
        if (routeName in _TabHeader[TabName]) {
          return _TabHeader[TabName][routeName];
        }
        props.tabName = TabName;
        props.tabRouteName = routeName;
        const {navigationOptions={}} = TabScreens[routeName].screen;
        const options = typeof navigationOptions === 'function' ? navigationOptions(props) : navigationOptions;
        return _TabHeader[TabName][routeName] = {title:TabLabel[routeName], ...options};
      }
    }
    return createBottomTabNavigator(TabScreens, TabConfig);
  }
  // 直接创建 Componet, 比如可以将某个 page 创建为 tab screen 
  container(){
    return createAppContainer(this.navigator());
  }
}
// EasyTab 在 EasyStack 页面栈中, 也是可能关闭, 被清除的, 需同时清除 _TabHeader 缓存
const resetEasyHeader = (newState, prevState) => {
  if (!newState || !prevState) {
    return;
  }
  const {index:newIndex} = newState;
  const {index:prevIndex, scenes} = prevState;
  if (prevIndex <= newIndex) {
    return;
  }
  scenes.forEach((scene, index) => {
    if (index <= newIndex || !('routes' in scene.route) ) {
      return;
    }
    const routeName = scene.route.routeName;
    if (routeName in _TabHeader) {
      delete _TabHeader[routeName]
    }
  })
}




/**
  创建 StackNavigator
  相比原生, 重写了部分参数, 主要是重写转场动画, 可以在跳转时指定转场动画
  除转场动画(transitionConfig)属性外, 其他重写值可通过 StackConfig 再次重置
  1. cardShadowEnabled -> andorid:false / iOS:true
  2. cardOverlayEnabled -> andorid:true / iOS:false
  3. defaultNavigationOptions.headerStyle -> 去除了 android 的 header 阴影
*/
const EasyStack = (StackScreens, StackConfig) => {
  const {defaultNavigationOptions, onTransitionEnd, ...customConfig} = StackConfig||{};
  const customOptionsType = typeof defaultNavigationOptions;

  // 设置缺省 Stack 配置, 可被重写
  StackConfig = {
    cardShadowEnabled:!IsAndroid,
    cardOverlayEnabled:IsAndroid,
    ...customConfig
  }

  // 转场动画, 这里直接指定, 不能自定义了
  StackConfig.transitionConfig = TransitionConfiguration;

  // 导航 options
  StackConfig.defaultNavigationOptions = (props) => {
    const options = customOptionsType === 'object' ? defaultNavigationOptions : (
      customOptionsType === 'function' ? defaultNavigationOptions(props) : {}
    );
    const {navigation, theme} = props;

    // 重置 android 默认的 header, 将阴影样式改为下边线, 如有需要, 可使用 headerStyle 再次重置
    if (IsAndroid) {
      const {headerStyle} = options;
      options.headerStyle = {
        elevation: 0,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme === 'dark' ? ThemeColors.dark.headerBorder : ThemeColors.light.headerBorder,
        ...headerStyle,
      }
    }

    // 是否可使用手势切换页面, 如果 params 指明了是否启用, 就依照 params 设置
    // 否则 andriod 默认不启用,  iOS 在使用右侧滑入转场动画时启用, 其他转场效果不启用
    const {gestures, transition} = navigation.state.params||{};
    if (typeof gestures === 'boolean') {
      options.gesturesEnabled = gestures;
    } else {
      options.gesturesEnabled = !IsAndroid && transition !== 'none' && transition !== 'fade' && transition !== 'modal';
    }
    return options;
  }

  // 清理可能的 easyTab header 缓存
  StackConfig.onTransitionEnd = function(newState, prevState) {
    resetEasyHeader(newState, prevState);
    onTransitionEnd && onTransitionEnd(newState, prevState)
  }

  // 处理 StackScreens 中的 easyTab
  const screens = {};
  Object.entries(StackScreens).forEach(([key, stack], index) => {
    const isObject = typeof stack === 'object';
    let screenInner = false;
    let screen = isObject && stack instanceof EasyTab ? stack : null;
    if (!screen && isObject && 'screen' in stack && stack.screen instanceof EasyTab) {
      screen = stack.screen;
      screenInner = true;
    }
    if (screen) {
      if (!screen.TabName) {
        screen.TabName = key;
      }
      // 首页 stack 是 tab 页面, 记录一个默认的 TabName, 以便全局函数使用
      if (index === 0) {
        _TabMainName = screen.TabName;
      }
      if (screenInner) {
        stack.screen = screen.navigator();
      } else {
        stack = screen.navigator();
      }
    }
    screens[key] = stack;
  });
  return createStackNavigator(screens, StackConfig);
};





/**
  js Modal 组件
  直接嵌套在 EasyApp 以便可以全局函数式调用 弹出层
*/
let _Modal = null;
const _ModalDefaultAnimation = 'fade';
const _ModalDefaultPosition = 'center';
const _ModalDefaultTime = 250;
class Modal extends React.PureComponent {
  constructor(props) {
    super(props);
    _Modal = {
      open: this.open.bind(this),
      close: this.close.bind(this)
    }
  }
  _config = null;
  _opacity = new Animated.Value(0);
  _animation = new Animated.Value(0);
  _aniValue = null;
  state = {
    component:null
  }
  _reset = (cb) => {
    this.setState({component:null})
    this._aniValue = null;
    this._config = null;
    this._opacity.setValue(0);
    this._animation.setValue(0);
    cb && cb();
  }
  open = (component, config, props) => {
    config = config||{};
    config.props = props;
    this._opacity.setValue(0);
    this._config = config;
    this.setState({component})
    return true;
  }
  close = (time, easing) => {
    const {
      animation=_ModalDefaultAnimation,
      animationTime=_ModalDefaultTime,
      animationEasing,
      onModalWillClose,
      onModalClose,
    } = this.config||{};
    time = gint(time);
    if (time === null) {
      time = animationTime;
    }
    if (!easing) {
      easing = animationEasing
    }
    onModalWillClose && onModalWillClose();
    if (time === 0 || this._aniValue === null) {
      this._reset(onModalClose);
      return true;
    }
    const transformAnimation = Animated.timing(this._animation, {
        toValue: this._aniValue,
        duration: time,
        easing: easing,
        useNativeDriver:true,
    });
    if (animation !== 'fade') {
      transformAnimation.start(() => {
        this._reset(onModalClose);
      });
      return true;
    }
    Animated.parallel([transformAnimation, Animated.timing(this._opacity, {
        toValue: 0,
        duration: time,
        easing: easing,
        useNativeDriver:true,
    })]).start(() => {
      this._reset(onModalClose);
    })
    return true;
  }
  _show = (e) => {
    const {
      animation=_ModalDefaultAnimation,
      position=_ModalDefaultPosition,
      animationTime=_ModalDefaultTime,  // 动效时长
      animationEasing,    // 动效过渡函数
      onModalWillShow,    // show 之前回调
      onModalShow,        // show 之后回调
    } = this._config||{};
    let startValue, toValue = 0;
    const {width, height, x, y} = e.nativeEvent.layout;
    switch (animation) {
      case 'top':
        startValue = -5 - y - height;
        break;
      case 'bottom':
        startValue = screenHeight - y + 5;
        break;
      case 'left':
        startValue = -5 - x - width;
        break;
      case 'right':
        startValue = screenWidth - x + 5;
        break;
      default:
        startValue = .01;
        toValue = 1;
        break;
    }
    onModalWillShow && onModalWillShow();
    this._aniValue = startValue;
    this._animation.setValue(startValue);
    const transformAnimation = Animated.timing(this._animation, {
        toValue,
        duration: animationTime,
        easing: animationEasing,
        useNativeDriver:true,
    });
    if (animation !== 'fade') {
      this._opacity.setValue(1);
      transformAnimation.start(onModalShow);
      return;
    } 
    Animated.parallel([transformAnimation, Animated.timing(this._opacity, {
        toValue: 1,
        duration: animationTime,
        easing: animationEasing,
        useNativeDriver:true,
    })]).start(onModalShow)
  }
  render(){
    if (this.state.component === null) {
      return null;
    }
    const {component: Component} = this.state;
    const {
      animation=_ModalDefaultAnimation,   // 动效: fade|top|bottom|left|right
      position=_ModalDefaultPosition,  // 最终位置: top|center|bottom
      offset,          // 偏移: position!=center 情况下 偏移距离
      overlay='rgba(0,0,0,.2)',  // 遮罩背景色
      overlayNone=false,    // 背景是否可穿透
      overlayClose=false,   // 点击遮罩是否关闭弹层
      props,
    } = this._config||{};

    let alignItems, top, bottom, transform;
    if (position === 'top') {
      alignItems = 'flex-start';
      top = offset||20;
    } else if (position === 'bottom') {
      alignItems = 'flex-end';
      bottom = offset||70;
    } else {
      alignItems = 'center';
    }
    if (animation === 'left' || animation === 'right') {
      transform = [{translateX: this._animation}]
    } else if (animation === 'top' || animation === 'bottom') {
      transform = [{translateY: this._animation}]
    } else {
      transform = [{scale: this._animation}]
    }
    const overlayProps = {
      style: [styles.dialog, {alignItems, backgroundColor:overlay}]
    }
    if (overlayNone) {
      overlayProps.pointerEvents = 'box-none';
    }
    const modal = <View {...overlayProps}><Animated.View style={{
      position:'absolute',
      opacity: this._opacity,
      transform,
      top,
      bottom,
    }} onLayout={this._show}>
      <Component {...props} close={this.close} />
    </Animated.View></View>
    return overlayClose ? <TouchableWithoutFeedback onPress={this.close}>{modal}</TouchableWithoutFeedback> : modal;
  }
}
// js Modal 组件 toast 应用
class EasyToast extends React.PureComponent {
  render(){
    const {load, color="#ddd", msg} = this.props;
    if (load) {
      return <View style={styles.toastLoad}><ActivityIndicator size="large" color={color}/></View>
    }
    return <View style={styles.toast}><Text style={styles.ToastTxt}>{msg}</Text></View>
  }
}




/**
  创建 app, 这样的好处是可以赋值给 Service , 以便全局使用导航函数
 */
const EasyApp = (StackScreens, StackConfig, AppProps) => {
  return () => {
    const AppNavigator = createAppContainer(
      EasyStack(StackScreens, StackConfig)
    );
    return (<View style={{flex:1}}>
      <AppNavigator {...AppProps} ref={Service.setNavigator} />
      <Modal/>
    </View>)
  }
}


const Navigator = {};

/**
  导出 导航创建器  tab 函数可以在某个二级独立页面中再创建一个 tab 栈, 如
  export default tab({...sub tab screen...}, config, tabName)
  tabName 可用于后续 badge label 的设置获取, 若不指定, 则自动分配为二级页面在上级页面栈的 key 值
*/
Navigator.create = EasyApp;
Navigator.stack = EasyStack;
Navigator.tab = (TabScreens, TabConfig, TabName) => {
  return new EasyTab(TabScreens, TabConfig, TabName)
}



/**
  导出 badge label 设置/获取 函数, 
  setBadge 中的 badge 可以为 数字 / 0(将显示一个小红点) / null(移除)
*/
Navigator.getBadge = (routeName, tabName) => {
  return runTabCache(tabName, routeName, 'badge', false);
}
Navigator.setBadge = (routeName, badge, tabName) => {
  return runTabCache(tabName, routeName, 'badge', true, badge);
}
Navigator.getLabel = (routeName, tabName) => {
  return runTabCache(tabName, routeName, 'label', false);
}
Navigator.setLabel = (routeName, label, tabName) => {
  return runTabCache(tabName, routeName, 'label', true, label);
}

/**
  对于使用 EasyApp 创建的, 可全局使用 modal 函数, 仅支持一次调用, 多次调用会先关闭前面的
  component: ReactCompoent
  config: {
    animation=fade|top|bottom|left|right 动效
    position=center|top|bottom  最终位置
    offset=20|70   对最终位置为 top|bottom 的, 设置偏移量
    overlay='rgba(0,0,0,.2)'  背景色
    overlayNone=false  背景是否可点透, 会设置为
    overlayClose=false  点击背景是否关闭modal
    animationTime=250   动效时长
    animationEasing=null 动效函数
    onModalWillShow=null  show 之前回调
    onModalShow=null  show 之后回调
    onModalWillClose=null  close 之前回调
    onModalClose=null  close 之后回调
  }
  props: 将原样传递给所指定的 component
*/
Navigator.modal = (component, config, props) => {
  return _Modal && _Modal.open(component, config, props);
}
// modal 的一个小应用, 提示信息, timeout 后自动消失
Navigator.toast = (msg, timeout, config) => {
  timeout = gint(timeout);
  if (timeout === null) {
    timeout = 1200
  }
  const ok = Navigator.modal(EasyToast, {
    ...config,
    overlay:'transparent',
    overlayNone: true,
  }, {msg});
  if (timeout > 0) {
    setTimeout(Navigator.close, timeout)
  }
  return ok;
}
// modal 的小应用, 显示加载菊花, 不会自动消失, 需手动 close
Navigator.loading = (color, config) => {
  return Navigator.modal(EasyToast, {
    ...config,
    overlay:'transparent'
  }, {load: true, color});
}
// 关闭任何类型的 modal, time/easing 不设置或设置为null
// 会使用待关闭 modal 显示时配置的 time/easing
Navigator.close = (time, easing) => {
  return _Modal && _Modal.close(time, easing);
}
export default Navigator;