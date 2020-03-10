# react-native-easy

`yarn add react-native-easy`

Tip: 原本想直接直接安装依赖的，但发现这样搞 RN 就没办法编译依赖的原生层了，所以还必须要手动安装。

以下组件需要锁定版本，版本不正确可能无法运行。

`yarn add react-native-screens@1.0.0-alpha.23 react-navigation@4.0.10 react-navigation-stack@1.10.3 react-navigation-tabs@2.7.0`

以下依赖不确定是否要锁定版本，这里仅列一下测试时的版本，可尝试升级为最新版，看看是否能正确运行；对于存量 app ，需特别注意，app 是否本来就已经安装过这些依赖来，是否存在版本冲突。

`yarn add react-native-reanimated@1.6.0 react-native-gesture-handler@1.5.3 react-native-archives@0.0.8`


# Android

[react-native-screens](https://github.com/software-mansion/react-native-screens) 的配置，安装完依赖后，修改 `android/app/build.gradle`，这两个依赖可查看 [官方文档](https://developer.android.com/jetpack/androidx/releases/appcompat?hl=zh-cn) ， 使用最新版。

```
dependencies {

    // 添加 for react-native-screens
    implementation "androidx.appcompat:appcompat:1.1.0"
    implementation "androidx.swiperefreshlayout:swiperefreshlayout:1.1.0-beta01"
}
```

[react-native-gesture-handler](https://github.com/software-mansion/react-native-gesture-handler) 的配置，修改 `android/app/src/[...]/MainActivity.java`，若安装的不是指定版本，请自行查阅其文档。

```diff
package com.swmansion.gesturehandler.react.example;

import com.facebook.react.ReactActivity;
+ import com.facebook.react.ReactActivityDelegate;
+ import com.facebook.react.ReactRootView;
+ import com.swmansion.gesturehandler.react.RNGestureHandlerEnabledRootView;

public class MainActivity extends ReactActivity {

  @Override
  protected String getMainComponentName() {
    return "Example";
  }

+  @Override
+  protected ReactActivityDelegate createReactActivityDelegate() {
+    return new ReactActivityDelegate(this, getMainComponentName()) {
+      @Override
+      protected ReactRootView createRootView() {
+       return new RNGestureHandlerEnabledRootView(MainActivity.this);
+      }
+    };
+  }
}
```

# iOS

没有什么配置的，执行

`cd ios && pod install`


# app

```js
import React from 'react';
import {app} from 'react-native-easy';

// 启用 screen, 减少运行时内存占用
require('react-native-screens').useScreens();

// Tab 页面
import Index from './pages/Index';
import User from './pages/User';
const MainTab = app.tab({
    Index: {
        screen:Index,
        label:'首页',
        icon:require('./res/tab/a.png'),
        iconActive:require('./res/tab/a2.png')
    },
    User: {
        screen:User,
        label:'我的',
        icon:require('./res/tab/a.png'),
        iconActive:require('./res/tab/a2.png')
    },
}, {
    // Tab 配置
})


// 页面栈
import View from './pages/View';
import Setting from './pages/Setting';

// 创建 App
export default app.create({
  MainTab, View, Setting
}, {
  // Stack 配置

}, {
  // App 监听
  onNavigationStateChange:() => {
    //console.log('change...')
  }
});
```

### Tab 配置

https://reactnavigation.org/docs/4.x/bottom-tab-navigator

1. 新增 activeOpacity/rippleColor 配置项
2. TabNavigatorConfig.defaultNavigationOptions 中的 
   tabBarButtonComponent/tabBarIcon/tabBarLabel 不允许自定义
3. TabNavigatorConfig.navigationOptions 可以不用配置，
   而是像普通页面那样在 tab 具体页面中配置 navigationOptions


### Stack 配置

https://reactnavigation.org/docs/4.x/stack-navigator

一般无需特殊配置，直接使用即可



# API

上面的例子中包含了 `app.tab` 和 `app.create`，其中 `app.create` 只在入口文件调用一次，其他地方用不到。 `app.tab` 可复用，比如在上面例子中的 `./pages/View` 中

```js
import View1 from './pages/View1';
import View2 from './pages/View2';

export default app.tab({
    View1: {
        screen:View1,
        label:'选项一',
        icon:require('./res/tab/a.png'),
        iconActive:require('./res/tab/a2.png')
    },
    View2: {
        screen:View2,
        label:'选项二',
        icon:require('./res/tab/a.png'),
        iconActive:require('./res/tab/a2.png')
    },
}, {
    // Tab 配置
})
```

这相当于从一个包含 TabBar 的页面打开另外一个  也包含 TabBar 的页面。


## TabBar 操作

`app.getBadge`  /  `app.setBadge`

获取/设置 TabBar 的 badage，使用方法：

app.getBadge(routeName [,tabName])

以上面例子说明
 1. getBadge('Index') 就能获取 首页这个 Tab 的 badge
 2. 有多个含有 TabBar 的页面，如上面举例提到的 View，使用方法为：getBadge('View1', 'View') 


app.setBadge(routeName, badge [,tabName])

设置 TabBar 的 badge，与 get 类似，不设置 tabName 即为默认的。


`app.getLabel`  /  `app.setLabel`

获取/设置 tabBar 的 文字， 与 badge 使用方法一致。


## 导航

在页面组件可以直接使用 [NavigationActions](https://reactnavigation.org/docs/4.x/navigation-actions#navigate) 和 [StackActions](https://reactnavigation.org/docs/4.x/stack-actions)，但更深层的组件不方便每一层都传递 props ，那么一个全局的导航 API 就比较有用了。以下是使用方法，与原 API 有不同之处，起码都无需 `dispatch`，仅一步调用即可。

```js
import {app} from 'react-native-easy';

app.navigate(Object params);
app.goBack(String key);
app.setParam(String key, Object params);
app.reset(Object params);
app.replace(Object params);
app.push(Object params);
app.pop(Number step);
app.popToTop();
```

以上与原版 API 基本相似，做了一点点简化，使用时候稍微方便来，另外扩充了几个方法，支持不同的页面切换过渡效果。

```js
// 与 app.navigate 相同
app.navigateNone();
app.navigateFade();
app.navigateModal();
app.navigateBoom();

// 与 app.push 相同
app.pushNone();
app.pushFade();
app.pushModal();
app.pushBoom();
```

## 弹层

`app.modal` / `app.close`

全局可用的 打开、关闭 弹层 API， 仅支持一个弹层，打开新的会替换旧的。

```js
import {app} from 'react-native-easy';

app.modal(ReactCompoent:component, Config:{
    // animation=fade|top|bottom|left|right 动效
    // position=center|top|bottom  最终位置
    // offset=20|70   对最终位置为 top|bottom 的, 设置偏移量
    // overlay='rgba(0,0,0,.2)'  背景色
    // overlayNone=false  背景是否可点透, 会设置为
    // overlayClose=false  点击背景是否关闭modal
    // animationTime=250   动效时长
    // animationEasing=null 动效函数
    // onModalWillShow=null  show 之前回调
    // onModalShow=null  show 之后回调
    // onModalWillClose=null  close 之前回调
    // onModalClose=null  close 之后回调
}, Object:props);

app.close();
```

`app.toast` / `app.loading`

弹层内置小应用

```js
import {app} from 'react-native-easy';


// 提示信息, timeout 后自动消失, config 可缺省, 为 modal config 参数
app.toast(msg, timeout, config);


// 显示加载菊花, 不会自动消失, 需手动 close, config 可缺省, 为 modal config 参数
app.loading(color, config);
```


# 其他

除了 `app` 为，另外还有一系列的函数 和 组件值得探索

```js
import {
    // 方法
    font, imageSize, gallery, zero, 
    splitStyle, useInterval, bezier,

    // 组件
    AutoImage, Button, Icon, Countdown,
    Empty, Offline, Parabola, CodeInput,
    Cursor, Resend, Confetti

} from 'react-native-easy';
```

# Icon

需要设置一个名为 `iconfont` 名称的字体，可以直接在 android 包的 `assets/fonts` 中导入，也可以使用 [react-native-archives](https://github.com/malacca/react-native-archives) 加载字体（react-native-easy 本身就依赖这个组件）

字体内容为 unicode 十六进制值，也可以使用字符串，内部为自动转换

```js
export default class extends Component {
  state = {
    icon: "&#xe677;",
    icon2: "\ue677",
  }

  render() {
    return (<View>
      <Icon text={this.state.icon}/>
      <Icon text={this.state.icon2}/>
      <Icon text="&#xe677;"/>
      <Icon text={"\ue624"}/>
    </View>)
  }
}
```