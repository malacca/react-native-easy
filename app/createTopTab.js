import {formatScreens, createNavigator} from './utils';
import createTopTabNavigator from './../topTabView/createTopTabNavigator';

const TopTab = createTopTabNavigator();

/**
 * 创建 Stack 导航器 
 * 依赖 @react-navigation/stack
 */
function createTopTab(screens, props) {
  screens = formatScreens(screens, 'topTabOptions');
  const tabChildren = createNavigator(TopTab, screens, props);
  return () => tabChildren;
}

export default createTopTab;