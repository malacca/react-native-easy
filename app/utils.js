import React from 'react';
import {Platform} from 'react-native';

// android api level > 20 才支持 rippleColor / elevation
export const IsAndroid = Platform.OS === 'android';
export const IsLollipop = Platform.Version > 20;
export function gint(v, def) {
  v = parseInt(v);
  return typeof v === "number" && isFinite(v) && Math.floor(v) === v ? v : def;
}


/**
 * 格式化 screens 参数
 * 1. 支持 screens 仅指定 component
 *    如  screens = {user: UserScreen}
 * 
 *    且支持 component.stackOptions 这样子设置, 推荐这种方式, 就近设置, 便于管理
 *    如 Class 组件
 *    class UserScreen extends Component{
 *      static initialParams={};
 *      static stackOptions={};
 *    }
 *  
 *    再入 Function 组件
 *    function UserScreen() {
 *    }
 *    UserScreen.initialParams={}
 *    UserScreen.stackOptions={}
 *    
 * 2. 若多个页面使用的是同一个组件, 则只能直接使用 screens 进行配置了
 *    screens = {
 *       user:{
 *          screen: UserScreen,
 *          initialParams:{},
 *          stackOptions:{}
 *       }
 *    }
 *    
 * 3. 支持的属性有
 *    {
 *        listeners:{}
 *        initialParams:{}
 *        
 *        ##options## 不再支持, 因为 Screen 可能嵌套, 支持 Screen 作为不同导航器页面的配置
 *        stackOptions,
 *        bottomTabOptions,
 *        topTabOptions
 *    }
 */
export function formatScreens(screens, optionName, extra) {
  const format = {};
  const fields = ['listeners', 'initialParams', optionName].concat(extra||[])
  Object.keys(screens).forEach(name => {
    const component = screens[name];
    const obj = typeof component === 'object';
    const screen = obj ? component.screen : component;
    const item = {
      screen
    };
    fields.forEach(field => {
      const key = field === optionName ? 'options' : field;
      item[key] = obj ? component[field]||screen[field] : screen[field];
    })
    format[name] = item;
  });
  return format;
}


/**
 * 创建导航器
 * 支持通过 screens.** 组件直接设置属性
 */
export function createNavigator(Nav, screens, props) {
  return (<Nav.Navigator {...props}>
    {Object.keys(screens).map(name => {
      const component = screens[name];
      return <Nav.Screen 
        key={name}
        name={name}
        component={component.screen}
        options={component.options}
        listeners={component.listeners}
        initialParams={component.initialParams}
      />
    })}
  </Nav.Navigator>)
}
