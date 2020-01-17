import {Platform} from 'react-native';
import {NavigationActions, StackActions} from 'react-navigation';

const Service = {};
const IsAndroid = Platform.OS === 'android';
const gint = (v) => {
    v = parseInt(v);
    return typeof v === "number" && isFinite(v) && Math.floor(v) === v ? v : 0;
};


/* 导航相关
1.  getNavigator()  获取 react-navigation 原始对象

2.  navigate(routeName, params, action, key)
    push(routeName, params, action)  不支持key
    replace(routeName, params, action, key, newKey)

3.  [navigate|push|replace]({routeName, params, ...}) 可使用 Object 传递参数

4.  navigate/push 支持跳转效果: None | Fade | Modal | Boom, 如
    navigateNone(routeName)
    pushFade(routeName)

5.  goBack() || goBack(string|null) 
6.  pop() || pop(int)

7.  setParam(key, params)  这里的 key 不是 routeName, 不是很常用的函数

8.  reset(params)  
    同: https://reactnavigation.org/docs/en/navigation-prop.html#reset
---------------------------------------------------------------*/
let _navigator;

// 设置 _navigator, 在 app 载入后初始化
Service.setNavigator = (navigator) => {
  _navigator = navigator;
}

// 获取 _navigator, 若以下方法无法满足需求, 可自行拓展
Service.getNavigator = () => {
  return _navigator
}

// 导航函数 适用于 navigate/push/replace
const navigateTo = (to, type, method) => {
  if (!to.length || to[0] === null) {
    return;
  }
  const e = typeof to[0];
  let routeName, params, action, key, newKey;
  if (e === 'string') {
    [routeName, params={}, action, key, newKey] = to;
  } else if (e === 'object') {
    ({routeName, params={}, action, key, newKey} = to[0]);
  }
  if (!routeName) {
    return;
  }
  if (type !== 'native') {
    params.transition = type;
    if (!IsAndroid && type === 'modal') {
      params.modal = true;
    }
  }
  let dispatcher;
  const router = {routeName, params, action};
  if (method > 0) {
    if (key) {
      router.key = key;
    }
    if (method > 1) {
      // replace
      if (newKey) {
        router.newKey = newKey;
      }
      dispatcher = StackActions.replace(router);
    } else {
      // navigate
      dispatcher = NavigationActions.navigate(router);
    }
  } else {
    // push
    dispatcher = StackActions.push(router) 
  }
  _navigator.dispatch(dispatcher)
}

// 导航到指定页面
Service.navigate = (...to) => {
  navigateTo(to, 'native', 1)
}
Service.push = (...to) => {
  navigateTo(to, 'native', 0)
}
['none', 'fade', 'modal', 'boom'].forEach(m => {
  const type = m.charAt(0).toUpperCase() + m.slice(1);
  Service['navigate' + type] = (...to) => {
    navigateTo(to, m, 1)
  }
  Service['push' + type] = (...to) => {
    navigateTo(to, m, 0)
  }
})

// 替换为指定页面
Service.replace = (...to) => {
  navigateTo(to, 'native', 2)
}

// back 返回 
Service.goBack = (key) => {
  const backAction = key === null || typeof key === 'string'
    ? NavigationActions.back({key}) 
    : NavigationActions.back();
  _navigator.dispatch(backAction)
}

// pop 返回
Service.pop = (n) => {
  n = Math.max(1, gint(n));
  _navigator.dispatch(StackActions.pop({n}))
}

// 返回最顶层, 使用 react-native-easy 等于返回到 tab 页面
Service.popToTop = () => {
  _navigator.dispatch(StackActions.popToTop())
}

// 设置指定 key 页面的 param
Service.setParam = (key, params) => {
  _navigator.dispatch(
    NavigationActions.setParams({key, params})
  )
}

// StackActions reset
Service.reset = (params) => {
  _navigator.dispatch(
    StackActions.reset(params)
  )
}

export default Service;