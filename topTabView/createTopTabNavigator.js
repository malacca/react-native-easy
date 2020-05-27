import React from 'react';
import {
  useTheme,
  TabRouter,
  TabActions,
  useNavigationBuilder,
  createNavigatorFactory,
  NavigationHelpersContext,
} from '@react-navigation/native';
import Color from 'color';
import TopTabView from './index';

/**
 * 在 TopTabView 基础上顺带搞一个 react navigation 的导航器
 * 可以纳入 navigation 体系, 使用 navigate 和 onFocus onBlur 等监听
 * 若不需要这些, 则可以直接使用 TopTabView 组件
 * 
 * 当前导航器需额外安装 npm 包:  Color 
 * 不过 @react-navigation/stack 也依赖该包, 若安装过该导航器, 就无需再次安装了
 * 
 * 使用方法
 * const TopTab = createTopTabNavigator();
 * 
 * <TopTab.Navigator
 *    initialRouteName=""
 *    backBehavior=""
 *    screenOptions={
 *       ...参考 TopTabView 的 colorOptions
 *    }
 *    pageOptions={
 *       ...参考 TopTabView 的 pageOptions
 *    }
 *    tabBarOptions={
 *       ...参考 TopTabView 的 tabBarOptions
 *    }
 * >
 * 
 *    <TopTab.Screen 
 *      name=""
 *      component={}
 *      options={
 *        ...参考 TopTabView 的 item.options
 *      }
 *      initialParams={}
 *      listeners={
 *        tabPress,
 *        tabLongPress,
 *        swipeStart,
 *        swipeEnd,
 *      }
 *    />
 * 
 * <TopTab.Navigator>
 * 
 */
function TopTabNavigator({
  initialRouteName,
  backBehavior,
  children,
  screenOptions,
  style,
  tabBarOptions={},
  pageOptions={},
}) {
  const {
    state,
    descriptors,
    navigation,
  } = useNavigationBuilder(TabRouter, {
    initialRouteName,
    backBehavior,
    children,
    screenOptions
  });

  const { colors } = useTheme();
  const {
    style:tabBarStyle,
    ...restTabBarOptions
  } = tabBarOptions;
  const {
    onPageChanged, 
    ...restPageOptions
  } = pageOptions;

  const {routes} = state;
  const tabs = routes.map(route => {
    const {key} = route;
    const descriptor = descriptors[key];
    return {
      screen: descriptor.render,
      options: descriptor.options
    }
  });
  const jumpTo = (index) => {
    navigation.dispatch({
      ...TabActions.jumpTo(routes[index].name),
      target: state.key,
    })
  };
  
  return <NavigationHelpersContext.Provider value={navigation}>
    <TopTabView
      tabs={tabs}
      currentIndex={state.index}
      style={[{
        backgroundColor: colors.background
      }, style]}
      tabBarOptions={{
        ...restTabBarOptions,
        style: [{
          backgroundColor: colors.card
        }, tabBarStyle],
        onTabPress: (e) => {
          e.preventDefault();
          const index = e.data;
          const event = navigation.emit({
            type: 'tabPress',
            target: routes[index].key,
            canPreventDefault: true,
          });
          if (index !== state.index && !event.defaultPrevented) {
            jumpTo(index)
          }
        },
        onTabLongPress: (index) => {
          navigation.emit({
            type: 'tabLongPress',
            target: routes[index].key,
          });
        }
      }}
      pageOptions={{
        ...restPageOptions,
        onPageChanged: (e) => {
          e.preventDefault();
          const {position} = e.data;
          if (position !== state.index) {
            jumpTo(position)
          }
          onPageChanged && onPageChanged(e.data);
        },
        onPageScrollStateChanged:({state}) => {
          if (state !== 2) {
            navigation.emit({ type: state > 0 ? 'swipeStart' : 'swipeEnd' })
          }
        }
      }}
      colorOptions={{
        tabActiveColor: colors.text,
        tabInactiveColor: Color(colors.text).mix(Color(colors.card), 0.5).hex(),
        underLineColor: colors.primary
      }}
    />
  </NavigationHelpersContext.Provider>
}
  
export default createNavigatorFactory(TopTabNavigator);