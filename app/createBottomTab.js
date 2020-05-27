import React from 'react';
import {View, Image} from 'react-native';
import {Header} from '@react-navigation/stack';
import {createBottomTabNavigator, BottomTabBadge} from '@malacca/bottom-tabs';
import {gint, formatScreens, createNavigator} from './utils';

const BottomTab = createBottomTabNavigator();

/**
 * 创建 BottomTab 导航器
 * 依赖 @react-navigation/stack 、 @malacca/bottom-tabs
 * 
 * 1.1. props 
 *      设置 BottomTab.Navigator 支持的 Props
 * 1.2. Screen.bottomTabOptions
 *      支持每个 Screen 使用 Screen.bottomTabOptions 设置 Tab.Screen.options
 * 1.3. props.screenOptions.tabBarIcon
 *      为简化操作, 在未设置该属性的情况下
 *      可直接在每个 Tab 页面 Screen.bottomTabOptions 中 激活/未激活 状态的 icon
 *      { activeIcon:require('img_path'), inactiveIcon:require('img_path') }  
 * 1.4. props.screenOptions.badge 
 *      不要设置, 可使用全局的 getBadge setBadge API, 否则将直接使用所设置的 badge
 * 
 * 若 BottomTabNavigator 嵌套在 StackNavigator 中
 * 
 * 2.1. porps.enableStackOptions
 *      未设置 BottomTabNavigator.stackOptions, 可通过该属性开启 Screen StackOptions 支持
 *      开启后, 可在每个 Tab Screen 通过 Screen.stackOptions 配置 Stack.Screen.options
 *      默认: true 
 * 2.2. props.cacheStackHeader
 *      若 porps.enableStackOptions=true, 即 Tab 中每个页面可配置不同的 Stack options,
 *      切换页面会更新 Header, 默认的 Tab 的页面 Header 结构相同, 切换 Tab 页面相当于更新组件 props,
 *      若结构不同, 那么切换 Tab 页面, 都会销毁前一页面的 Header, 并重建新 Header,
 *      对于这种情况, 可通过 props.cacheStackHeader=true 开启 Header 缓存, 提升性能
 *      默认: false
 * 
 */
function createBottomTab(screens, props) {
  const {
    enableStackOptions=true,
    cacheStackHeader,
    screenOptions:customOptions, 
    ...navProps
  } = props||{};
  screens = formatScreens(screens, 'bottomTabOptions', ['stackOptions']);

  const screenTabBarIcon = ({route, focused, size, style}) => {
    const {name} = route||{};
    const tabOptions = name && screens[name] ? screens[name].options : null;
    const source = tabOptions ? tabOptions[focused ? 'activeIcon' : 'inactiveIcon'] : null;
    return source ? <Image source={source} style={[{width:size, height:size}, style]} /> : null;
  };

  if (typeof customOptions === 'object' || customOptions == null) {
    navProps.screenOptions = bottomTabScreenOptions(customOptions, screenTabBarIcon);
  } else {
    navProps.screenOptions = (props) => {
      return bottomTabScreenOptions(customOptions(props), screenTabBarIcon);
    }
  }
  const tabChildren = createNavigator(BottomTab, screens, navProps);
  const tabNavigator = () => tabChildren;

  // 自动配置 TabNavigator 作为 Stack.Screen 的 stackOptions
  if (enableStackOptions) {
    tabNavigator.stackOptions = ({route}) => {
      const {state} = route;
      let routeName;
      if (!state) {
        routeName = Object.keys(screens)[0];
      } else {
        const {index, routeNames} = state;
        routeName = routeNames[index];
      }
      const stackOptions = screens[routeName].stackOptions;
      // 未设置 stackOptions, 使用 bottomTabOptions 的 
      // title/tabBarLabel/routeName 作为 header.title 的 fallback
      if (!stackOptions) {
        const tabOptions = screens[routeName].options;
        if (typeof tabOptions === 'object') {
          if (typeof tabOptions.title === 'string') {
            return {title: tabOptions.title}
          }
          if (typeof tabOptions.tabBarLabel === 'string') {
            return {title: tabOptions.tabBarLabel}
          }
        }
        return {title: routeName};
      }
      // 无需缓存 header, 直接返回即可
      if (!cacheStackHeader) {
        return stackOptions;
      }
      // 创建可缓存的 header
      return typeof stackOptions !== 'function'
        ? tabStackScreenOptions(stackOptions, routeName)
        : (props) => {
          return tabStackScreenOptions(stackOptions(props), routeName);
        }
    }
  }
  return tabNavigator;
}

function tabStackScreenOptions(stackOptions, routeName) {
  const {header, ...options} = stackOptions;
  return {
    ...options,
    header: (props) => {
      return (<TabStackScreenHeader routeName={routeName}>
        {header ? header(props) : <Header {...props} />}
      </TabStackScreenHeader>)
    }
  }
}

function TabStackScreenHeader(props) {
  const headerChildren = React.useRef([]);
  const {routeName, children} = props;
  const cached = headerChildren.current;
  const exist = cached.some(item => {
    if (item.name === routeName) {
      item.header = children;
      return true;
    }
    return false;
  });
  if (!exist) {
    cached.push({
      name:routeName,
      header: children
    })
  }
  return <View 
    removeClippedSubviews={true} 
    style={{overflow:"hidden"}}
  >{cached.map(item => {
    return <View 
      key={item.name} 
      style={item.name === routeName ? null : {
        position:"absolute",
        bottom:30000
      }}
    >{item.header}</View>
  })}</View>
}

function bottomTabScreenOptions(screenOptions, screenTabBarIcon) {
  const {
    tabBarIcon, 
    badge, 
    ...options
  } = screenOptions||{};
  // tabBarIcon / badge
  options.tabBarIcon = tabBarIcon || screenTabBarIcon;
  options.badge = badge || (({index, route, ...rest}) => {
    return badgeWrapper({
      ...rest,
      name: route.name
    })
  });
  return options;
}

// BottomTab 组件, 缓存函数, 可使用全局 API
const BADGE_CACHE = {};
function badgeWrapper({name, ...rest}) {
  const badgeRef = React.useRef();
  const [badge, setBadge] = React.useState(null);
  React.useEffect(() => {
    badgeRef.current = badge;
  }, [badge]);
  React.useEffect(() => {
    BADGE_CACHE[name] = {
      set: (badge) => {
        setBadge(gint(badge, null));
      },
      get: () => {
        return badgeRef.current;
      }
    }
    return () => {
      if (name in BADGE_CACHE) {
        delete BADGE_CACHE[name];
      }
    }
  }, []);
  return <BottomTabBadge {...rest} isDot={badge === 0} badge={badge > 99 ? '99+' : badge}/>
}

/**
 * 获取 / 设置 指定 routeName 的 badge 角标
 */
function getBadge(routeName) {
  return routeName in BADGE_CACHE ? BADGE_CACHE[routeName].get() : null;
}
function setBadge(routeName, badge) {
  if (routeName in BADGE_CACHE) {
    BADGE_CACHE[routeName].set(badge)
    return true;
  }
  return false
}

module.exports = {
  createBottomTab,
  getBadge,
  setBadge
}