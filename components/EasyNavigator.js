
import React from 'react';
import {ThemeColors} from 'react-navigation';
import {createBottomTabNavigator} from 'react-navigation-tabs';
import {
  StackViewStyleInterpolator, 
  StackViewTransitionConfigs, 
  createStackNavigator
} from 'react-navigation-stack';
import {
  Platform, 
  StyleSheet,
  TouchableNativeFeedback, 
  TouchableOpacity, 
  TouchableWithoutFeedback, 
  View, 
  Image, 
  Text
} from 'react-native';
import getSceneIndicesForInterpolationInputRange from 'react-navigation-stack/src/utils/getSceneIndicesForInterpolationInputRange';

const IsAndroid = Platform.OS === 'android';

// 初始化时, 缓存 activeOpacity, rippleColor, TabBadge
let _TabProps = {};

// 缓存已创建的 rn componet 对象
const _TabBar = {};
const _TabLabel = {};
const _TabHeader = {};
const formatBadge = (badge) => {
    if (badge === undefined) {
      badge = null;
    }
    if (badge !== null) {
      badge = isNaN(badge) ? null : parseInt(badge, 10)
    }
    return badge;
}

const styles = StyleSheet.create({
  icon:{
    width:25, 
    height: 25, 
    marginTop:5
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
});

/**
 * TabBar 单个 item
 */
class TabBarWrapper extends React.Component {
  constructor(props) {
    super(props);
    const {routeName} = props.route;
    this.state = {
      badge:formatBadge(_TabProps.TabBadge[routeName])
    }
    _TabBar[routeName] = this;
  }
  get(){
    return this.state.badge
  }
  set(badge){
    this.setState({badge: formatBadge(badge) })
  }
  render() {
    const {
      route,
      focused,
      onPress,
      onLongPress,
      testID,
      accessibilityLabel,
      accessibilityRole,
      accessibilityStates,
      children,
      ...rest
    } = this.props;
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
    if (IsAndroid ? !_TabProps.rippleColor : _TabProps.activeOpacity === 1) {
      return (
        <TouchableWithoutFeedback {...props}>
          <View {...rest}>
            {children}
            {badgeView}
          </View>
        </TouchableWithoutFeedback>
      );
    }
    if (IsAndroid) {
      return (
        <TouchableNativeFeedback {...props} background={TouchableNativeFeedback.Ripple(
            _TabProps.rippleColor, true
        )}>
            <View {...rest}>
              {children}
              {badgeView}
            </View>
        </TouchableNativeFeedback>
      );
    }
    return (
      <TouchableOpacity {...props} style={{flex:1}} activeOpacity={_TabProps.activeOpacity}>
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
  }
  get() {
    return this.state.label;
  }
  set(label) {
    this.setState({label})
  }
  render() {
    return <Text {...this.props}>{this.state.label}</Text>
  }
}


/**
 * 创建 TabNavigator
 */ 
const MakeTabNavigator = (screens, config) => {
  const TabScreensList = Object.entries(screens||{});
  if (!TabScreensList.length) {
    return false;
  }

  // 整理 screens
  const TabBadge = {};
  const TabIcon = {};
  const TabIconActive = {};
  const TabLabel = {};
  const TabScreens = {};
  TabScreensList.forEach(([key, item]) => {
    const {badge=null, icon, iconActive, label, ...props} = item;
    TabBadge[key] = badge;
    TabIcon[key] = icon;
    TabIconActive[key] = iconActive;
    TabLabel[key] = label;
    TabScreens[key] = props;
  });

  // config 新增 activeOpacity/rippleColor 配置项
  const {
    activeOpacity=.75,
    rippleColor='rgba(0,0,0,.5)',
    tabBarOptions={},
    defaultNavigationOptions,
    ...TabConfig
  } = config||{};

  const {
    allowFontScaling=false,
    adaptive=false,
    labelStyle,
    ...options
  } = tabBarOptions;

  // adaptive 缺省值 false : iOS11 iPad 横屏, tabbar 会转为 icon label 左右排列, 
  // 由于新增了 badge 功能, 左右排列很难实现漂亮的 ui, 所以默认改为 false
  // 但仍可以重置, 如果不使用 badge 或通过自定义 style 自己实现了可接受 ui 也是可以的
  options.adaptive = adaptive;

  // allowFontScaling 缺省值改为 false
  options.allowFontScaling = allowFontScaling;
  TabConfig.tabBarOptions = options;

  // 缓存配置 以供 TabBarWrapper 使用, 不能使用 props 传递
  // 会导致 tabBarButtonComponent 每次都重新创建而不是复用
  _TabProps = {activeOpacity, rippleColor, TabBadge};

  // 整理自定义 config, tabBarButtonComponent/tabBarIcon/tabBarLabel 不允许指定了
  // 如果真的必须要自定义, 可以在 screens 配置中通过 navigationOptions 重置覆盖
  const customOptionsType = typeof defaultNavigationOptions;
  TabConfig.defaultNavigationOptions = (props) => {
    const customOptions = customOptionsType === 'object' ? defaultNavigationOptions : (
      customOptionsType === 'function' ? defaultNavigationOptions(props) : null
    );
    const {routeName} = props.navigation.state;
    return {
      ...customOptions,
      tabBarButtonComponent: TabBarWrapper,
      tabBarIcon: ({focused}) => {
        return <Image style={styles.icon} resizeMode="contain" source={focused ? TabIconActive[routeName] : TabIcon[routeName]} />
      },
      tabBarLabel: ({tintColor, orientation}) => {
        return <TabBarLabelWrapper
          numberOfLines={1}
          allowFontScaling={allowFontScaling}
          style={[
            styles.label,
            { color: tintColor },
            labelStyle
          ]}
          ref={ref => {_TabLabel[routeName] = ref}}
        >{TabLabel[routeName]}</TabBarLabelWrapper>
      },
      // tabBarLabel 定义为组件了, 无障碍获取不到文字了, 这里手动返回 
      tabBarAccessibilityLabel: '切换到 ' + TabLabel[routeName]
    }
  };

  // tabNavigator 在 StackNavigator 中的 header 配置
  // 可以让 tab 页面与普通 StackNavigator 栈内页面一样, 在内部 通过 navigationOptions 设置 header
  TabConfig.navigationOptions = (props) => {
    const {navigation} = props;
    const {routeName} = navigation.state.routes[navigation.state.index];
    if (routeName in _TabHeader) {
      return _TabHeader[routeName];
    }
    const {navigationOptions} = TabScreens[routeName].screen;
    props.tabRouteName = routeName;
    const options = typeof navigationOptions === 'function' ? navigationOptions(props) : navigationOptions;
    return _TabHeader[routeName] = {title:TabLabel[routeName], ...options};
  }

  return createBottomTabNavigator(TabScreens, TabConfig);
}

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
 * 创建 Stack Navigator
 */ 
export const EasyNavigator = (NavScreens, TabScreens, TabConfig, NavConfig) => {
  const {defaultNavigationOptions, ...customConfig} = NavConfig||{};
  const customOptionsType = typeof defaultNavigationOptions;

  // 设置缺省 Stack 配置, 可被重写
  const StackConfig = {
    cardShadowEnabled:!IsAndroid,
    cardOverlayEnabled:IsAndroid,
    ...customConfig
  }

  // 转场动画, 会覆盖 NavConfig 中已设置的 (即该参数不能从外部设置了)
  StackConfig.transitionConfig = TransitionConfiguration;

  // 导航 options
  StackConfig.defaultNavigationOptions = (props) => {
    const options = customOptionsType === 'object' ? defaultNavigationOptions : (
      customOptionsType === 'function' ? defaultNavigationOptions(props) : {}
    );
    const {navigation, theme} = props;

    // 重置 android 默认的 header, 将阴影样式改为下边线
    if (IsAndroid) {
      const {headerStyle} = options;
      options.headerStyle = {
        ...headerStyle,
        elevation: 0,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme === 'dark' ? ThemeColors.dark.headerBorder : ThemeColors.light.headerBorder,
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

  // 处理 Stack 中的 Tab
  const TabNavigator = MakeTabNavigator(TabScreens, TabConfig);
  if (TabNavigator) {
    const MainRouteName = '_MainTab_';
    NavScreens[MainRouteName] = TabNavigator;
    if (!StackConfig.initialRouteName) {
      StackConfig.initialRouteName = MainRouteName;
    }
  }
  return createStackNavigator(NavScreens, StackConfig);
};


/**
 * 对外暴露的 api 方法
 */
export const getBadge = (key) => {
  return key in _TabBar && _TabBar[key] ? _TabBar[key].get() : null;
}

export const setBadge = (key, badge) => {
  key in _TabBar && _TabBar[key] && _TabBar[key].set(badge)
}

export const getLabel = (key) => {
  return key in _TabLabel && _TabLabel[key] ? _TabLabel[key].get() : null;
}

export const setLabel = (key, label) => {
  key in _TabLabel && _TabLabel[key] && _TabLabel[key].set(label)
}

