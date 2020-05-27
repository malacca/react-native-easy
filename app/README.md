# 导航器

在 [react-navigation](https://github.com/react-navigation/react-navigation) 基础上拓展的导航器，用于快速创建 App，该组件为应用最基础组件，依赖以下包：

 - `@react-navigation/native` 
 - `@react-navigation/stack`
 - `@malacca/bottom-tabs`


# 安装

由于 bottom-tabs 不使用官方的分支了，所以需注意通过 [bottom-tabs](https://github.com/malacca/bottom-tabs/blob/master/package.json) 的 `devDependencies` 字段查看所依赖的 `@react-navigation/native` 最低版本。

`@react-navigation/native` 也有依赖，所以这里将所以依赖全部列出

`yarn add react-native-gesture-handler react-native-screens react-native-safe-area-context @react-native-community/masked-view @react-navigation/native @react-navigation/stack @malacca/bottom-tabs`

- `react-native-gesture-handler` 用于手势切换页面
- `react-native-screens` 用于原生层释放未展示的页面，改善 app 内存使用
- `react-native-safe-area-context` 用于保证页面显示在安全区域（主要针对刘海屏）
- `@react-native-community/masked-view` 用在头部导航栏中返回按钮的颜色设置
- `@react-navigation/native` 为 React Navigation 的核心

官方文档中提到的 `yarn add react-native-reanimated`，该依赖在使用 DrawerNavigator 才用的到，不晓得为啥放到了总的安装文档中，或许后期升级可能会用到，尽量也装上。

安装完之后，在 js 入口文件，如 index.js 顶部添加 `import 'react-native-gesture-handler';`，少了这一句，可能会导致生产环境 app 出现闪退现象。

在 App.js 中添加以下代码，激活 `react-native-screens` 的原生端

```
import { enableScreens } from 'react-native-screens';
enableScreens();
```

可选（建议配置）

修改 `android/app/src/main/java/[project]/MainActivity.java`
新增以下两段代码：

```java
...

// for react-native-gesture-handler
import com.facebook.react.ReactRootView;
import com.facebook.react.ReactActivityDelegate;
import com.swmansion.gesturehandler.react.RNGestureHandlerEnabledRootView;

public class MainActivity extends ReactActivity {
  ....
  

  // for react-native-gesture-handler 
  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new ReactActivityDelegate(this, getMainComponentName()) {
      @Override
      protected ReactRootView createRootView() {
       return new RNGestureHandlerEnabledRootView(MainActivity.this);
      }
    };
  }

  
}
```

安装结束。


# 使用

```js
import {
  AppContainer,    //根组件容器
  createBottomTab, //创建 BottomTab 导航器
  createStack,     //创建 stack 导航器
  TransitionPresets, //页面切换效果
  getBadge,    //获取当前 badge 角标
  setBadge,    //设置 badge 角标
  navigation,  //全局可用的导航函数
  modal,       //全局可用的弹窗函数
} from 'react-native-easy/app';


// App.js 示例：BottomTab 作为 stack 的首页
const MainTab = createBottomTab({
  HomeScreen,
  UserScreen
}, {
  initialRouteName,
  screenOptions,
  injectTabs,
  stackOptions,
  cacheStackHeader,
  ...tabProps 
});

const navigator = createStack({
  MainTab,
  DetailsScreen,
}, {
  initialRouteName,
  screenOptions,
  headerMode,
  ...stackProps
})


// App.js 示例二: stack 作为 BottomTab 的页面
const HomeStack = createStack({
  HomeIndex,
  HomeScreen,
}, {
  ...homeStackProps
})

const UserStack = createStack({
  UserIndex,
  UserScreen,
}, {
  ...userStackProps
})

const navigator = createBottomTab({
  HomeStack,
  UserStack,
}, {
  ...tabProps
})



// 最后, 导出 AppContainer
export default function App() {
  return <AppContainer {...appProps}>
    {navigator()}
  </AppContainer>
}

```

上面示例中，第一种是最常用的，没啥好说的，解释一下第二种，按需选择；BottmTab 做为主导航器，每个 Tab 都有自己的一套 Stack。

- 优势：

  在 Home 这个 Tab 页面切换到该 Tab 其他 stack 页面，不会覆盖底部的 TabBar，仍可快速切换到其他 Tab 页面，且再次切回来，仍停留在上次访问的页面。

  第一种方式就无法这么操作，若 Tab 内打开页面，TabBar 会被覆盖，想切换到其他 Tab，需返回到 Tab 才可以。

- 劣势：

  两个不同的 Tab 页面无法同时打开同一个页面，比如有一个 Detail 页面，配置在 HomeStack，那么无论从哪个 Tab 打开这个页面，都会切换到 Home Tab 页面，实际使用有很大困扰，体验很不好。

  若希望利用其优势，需各个 Tab 页面不会打开其他 Tab 的页面，如有个别的需要所有 Tab 都要打开的页面，比如 Login， 可以将 BottomTab 和 Login 再通过 createStack 嵌套一层。 


# appProps

不同版本可能有所改动，可参考 [官方文档](https://reactnavigation.org/docs/navigation-container)，支持以下属性

### `theme`

主题，该属性由 `@react-navigation/native` 缓存，但并未有任何作用，会下发到导航器，由导航器获取并加以利用，默认为以下属性：

```
theme={
    dark: boolean;
    colors: {
        primary: string;
        background: string;
        card: string;
        text: string;
        border: string;
    };
}
```

### `initialState`

自定义传入变量，多用于 deepLink，该项暂未验证

### `onStateChange`

导航状态变化的监听函数，可用于页面统计或其他操作

### `linking`

导航器载入的 link

### `fallback`

导航器载入 link 失败的 fallback

### `ref`

获取 `NavigationContainer` 实例，用于调用实例 api，可通过 console.log 打印可用 api

### `modal` (新增)

载入 APP 时，就显示一个 Modal （modal 会在下面进行说明）

### `style` (新增)

`AppContainer` 结构为 `<View><NavigationContainer/><Modal/></View>`，所以新增了
 - style
 - ref.setNativeProps 方法

这两个属性是针对最外层 View 的，在有些状况下，比如需加载时，通过 Modal 显示一个开屏引导，但需要同时加载 App，又不希望出现闪屏，就可以在初始化时，设置 `style={opacity:0}` 在合适的时机 `ref.setNativeProps({style:{opacity:1}})`



# stackProps / tabProps

不同版本可能有所改动，可参考 [stackProps](https://reactnavigation.org/docs/stack-navigator#props)， [tabProps](https://github.com/malacca/bottom-tabs#%E4%B8%80-%E5%B1%9E%E6%80%A7%E8%AF%B4%E6%98%8E)，支持以下属性

### `initialRouteName`

导航器默认要显示的 screen

### `screenOptions`

参数值可以是 `Object` 或 `Function({route, navigation}) => Object`，stack 和 tab 支持的 Object 字段不同，该配置是导航器包裹页面的默认配置，每个页面还可以再次设置。

### `stackProps` 额外支持

  - `headerMode`：标题栏模式

    - `float`: 浮动标题栏，所有打开的 stack 页面 header 在一个容器内，且浮动在 screen 上方
    - `screen`: 标题栏在 stack 页面内
    - `none`: 不使用标题栏

  - `mode`: 页面模式，该属性一般用不到，类似于同时设置多个属性，完全有其他替代方案，且更灵活

    - `card`: 默认模式（android 的 headerMode 为 screen，页面切换效果为上下渐隐； iOS 的 headerMode 为 float，页面切换效果为左右滑动）
    - `modal`: 设置为该模式，iOS 的 headerMode 为 screen，切换效果变成上下滑动

  - `keyboardHandlingEnabled`: 切换页面是否自动隐藏打开的键盘，默认为 true

### `tabProps` 额外支持

 默认支持： [文档](https://github.com/malacca/bottom-tabs#%E4%B8%80-%E5%B1%9E%E6%80%A7%E8%AF%B4%E6%98%8E)

  - `backBehavior`
  - `lazy` 
  - `tabBar`
  - `injectTabs`
 
 新增支持：针对 Tab 嵌套在 Stack 中，新增以下参数

 - `stackOptions`: Tab 嵌套在 Stack 中，那么整个 Tab 相当于 Stack 的一个页面，该属性设置 Tab 作为 Stack.Screen 的 options

 - `enableStackOptions`: 默认情况下，所有 Tab 页面会公用一个 stack 配置，是否开启每个页面独立设置 stack 配置，默认为 true

 - `cacheStackHeader`:  若 `enableStackOptions=true`
   
    即 Tab 中每个页面可配置不同的 Stack options， 这意味着不同 Tab 可使用不同 Header， 默认的页面 Header 结构相同， 切换 Tab 页面相当于更新Header props，这种情况还好
 
   若结构不同，那么切换 Tab 页面，都会销毁前一页面的 Header，并重建新 Header，对于这种情况, 可通过 `cacheStackHeader=true` 开启 Header 缓存, 提升性能

   默认: false



# screenOptions

上面已提到该属性，直接在 stackProps / tabProps 设置的为默认属性，另外支持每个页面单独设置，对于 BottomTab 嵌套在 stack 的情况，若 `enableStackOptions=true` 支持每个 Tab 独立设置 stackProps。配置方式如下：

```js
/**
 * Tab 页面 
 */
function HomeScreen() {
}

// 设置该 Tab 页面的 Tab 配置
HomeScreen.tabOptions = {};

// 设置该 Tab 页面的 Stack 配置
HomeScreen.stackOptions = {};

// 当然，也可以使用函数
HomeScreen.tabOptions = ({route, navigation}) => {}
HomeScreen.stackOptions = ({route, navigation}) => {}


/**
 * Stack 页面 
 */
function DetailsScreen() {
}

// Stack 中的独立页面仅可设置 stackOptions 
HomeScreen.stackOptions = {};

// 或
HomeScreen.stackOptions = ({route, navigation}) => {}

```


# tabOptions

可以通过 `tabProps.screenOptions` 整体设置，也可通过 `Screen.tabOptions` 在每个页面独立设置，支持属性：查看 [文档](https://github.com/malacca/bottom-tabs#%E4%BA%8Cscreenoptions---screenoptions)，另新增以下特性：

### `badge`

不要在 tabOptions 中设置该属性，否则无法使用 `getBadge` / `setBadge` 函数

### `activeIcon` / `inactiveIcon`

若未在 `tabProps.screenOptions` 中设置 `tabBarIcon`，可在 `Screen.tabOptions` 中直接激活/未激活的 Icon 图标

```js
Screen.tabOptions = { 
  activeIcon:require('img_path'),
  inactiveIcon:require('img_path') 
} 
```


# stackOptions

可以通过 `stackProps.screenOptions` 整体设置，也可通过 `Screen.stackOptions` 在每个页面独立设置，支持属性：查看 [文档](https://reactnavigation.org/docs/stack-navigator#options)，这里列一下，有部分属性修改了默认配置，但仍可以自行覆盖默认配置：

### 与 Header 组件相关的属性

标题
- `title`: string, 标题文字
- `headerTitleAlign`: 标题对齐方式，支持 `left` (Android 默认)  /  `center` (iOS 默认)
- `headerTitleAllowFontScaling`: 标题文字是否随系统文字大小缩放
- `headerTintColor`: 标题颜色
- `headerTitleStyle`: 自定义标题文字样式
- `headerTitleContainerStyle`: 自定义标题文字所在 View 容器的样式
- `headerTitle`: 标题，可直接设置文字，优先级高于 `title`；也可以设置为函数，返回一个组件，函数参数为 `{allowFontScaling, style, children}`，这三个参数是由上面属性结合而来。

左侧返回组件
- `headerBackImage`: 返回键，设置为一个函数，返回“返回键”组件，函数参数为 `{tintColor:"标题颜色"}`
- `headerBackTitle`: string 返回键右侧的返回文字
- `headerTruncatedBackTitle`: 返回文字过长，标题栏无法显示时的替代返回文字，默认: "Back"
- `headerBackAllowFontScaling`: 返回文字是否随系统文字大小缩放
- `headerBackTitleStyle`: 自定义返回文字样式
- `headerBackTitleVisible`: 是否显示返回文字，Android 默认 false，iOS 默认 true
- `headerPressColorAndroid`: Android 5 以上，点击返回按钮的水波纹颜色
- `headerLeftContainerStyle`: 自定义返回键和返回文字所在容器的样式
- `headerLeft`: 自定义 HeaderBackButton 左侧组件，指定为函数 或 RN组件，props 会传递上面的返回键和返回文字相关的设置

右侧自定义组件
- `headerRight`: 自定义标题栏右侧组件
- `headerRightContainerStyle`: 自定义右侧组件所在容器的样式

标题栏整体属性
- `headerStatusBarHeight`: 设置 statusBar 高度，Header 组件会 paddingTop 这个值以保证在刘海屏机型也可以正常使用，默认会由系统自动获取。
- `headerStyle`: 自定义标题栏样式；**【修改：默认的 android header 改 投影 -> 下划线】**
- `headerTransparent`: 标题栏是否透明，与在 `headerStyle` 直接设置 `backgroundColor` 的不同在于：这里设置透明，会使页面的 `marginTop` 为 0，此时需要定义 `headerBackground` 组件来遮挡。
- `headerBackground`: 标题栏背景组件，配合 `headerTransparent` 使用的，可以用来实现毛玻璃 Header 效果。
- `safeAreaInsets`: Header安全区域设置（针对刘海屏机型），默认情况下会自动设置，但也可以使用 `{left, right, top, bottom}` 手动设置，自定义设置注意考虑横竖屏的情况。
- `headerShown`: 是否显示标题栏
- `header`: 自定义标题栏组件，定义为函数，返回一个 RN 组件；设置该属性，即不使用默认 Header 了，以上属性失效。

### 与页面组件相关的属性

- `cardStyle`: 页面 Card 的样式
- `cardShadowEnabled`: 是否显示 Card 边缘的阴影组件；该组件是一个宽度为 3、紧贴边缘、使用 `style.shadowOffset` 定义阴影的 view 组件，所以该组件目前不支持 android，默认也仅在 iOS 上开启。**【修改：通过 elevation 支持了 android】**
- `cardOverlayEnabled`: 是否在 Card 下方添加一个组件（也就是在前一个 Card 的上方添加一个组件）**【修改： android Lollipop 以下版本不支持 elevation，默认开启此项】**
- `cardOverlay`: 函数，返回 `cardOverlayEnabled=true` 要覆盖的组件，该组件可用于页面切换时的效果设定，比如一个黑色的 view，切换过程中逐渐透明，甚至是毛玻璃组件，下方页面就呈现出一种逐渐显示的感官。

### 与页面切换效果相关的属性

- `animationEnabled`: 是否使用页面切换动效，该属性在 web 端为关闭状态
- `animationTypeForReplace`: 动画切换过程使用的类型： "push" 或 "pop"
- `cardStyleInterpolator`: 页面过渡的动画效果配置；配置动画函数，时长等。
- `cardStyleInterpolator`: 函数，返回页面过渡过程中 Card 内相关组件的插值样式。
- `headerStyleInterpolator`: 函数，返回页面过渡过程中 Header 内相关组件的插值样式。

### 与页面切换手势相关的属性

- `gestureEnabled`: 是否支持手势返回，iOS默认开启（不开启的话只能在页面上自定义返回按钮了），Android 默认是关闭的（Android 除了返回按钮，还有物理/虚拟返回键）
- `gestureDirection`: 返回的手势滑动方向，支持以下值
  - `horizontal`: 从左到右
  - `horizontal-inverted`: 从右到左
  - `vertical`: 从上到下
  - `vertical-inverted`: 从下到上
- `gestureResponseDistance`: 从边缘为起点，支持手势返回的距离，格式为 `{horizontal:25, vertical:135}`；比如手势方向 `gestureDirection` 为 `horizontal`，那么只有在左边缘 25 以内的区域向右滑动才会响应。
- `gestureVelocityImpact`: 触摸返回的手速设置，在手速低于该值时，滑动距离需大于滑动方向上尺寸的 50% 才会返回到上一页，否则弹回；高于所设置手速，即使滑动距离未达到50%，也会返回到上一页面；默认值为 0.3


# TransitionPresets

页面切换效果，支持以下效果

 - `SlideFromRightIOS`: 左右滑动
 - `ModalSlideFromBottomIOS`: 上下滑动
 - `ModalPresentationIOS`: 从下到上 卡片式弹出
 - `FadeFromBottomAndroid`: 从下到上 渐显
 - `RevealFromBottomAndroid`: 从下到上 展开
 - `ScaleFromCenterAndroid`: 由小变大
 - `DefaultTransition`: 默认效果
 - `ModalTransition`: modal 模式的默认效果

使用方式：

在 `stackProps.screenOptions` 或 `Screen.stackOptions` 中设置

```js
import { TransitionPresets } from 'react-native-easy/app';

stackProps = {
  initialRouteName,
  screenOptions:{
    gestureEnabled:true,
    ...TransitionPresets.SlideFromRightIOS
  }
}

Screen.stackOptions = {
  gestureEnabled:true,
  ...TransitionPresets.SlideFromRightIOS
}

// 当然, 也支持完全自定义
Screen.stackOptions = {
  gestureEnabled:true,
  
  // TransitionPresets.XXX 其实就是以下属性
  gestureDirection,
  transitionSpec,
  cardStyleInterpolator,
  headerStyleInterpolator
}
```

除这种方式外，另外支持了一种新方式，在打开页面时，设置切换方式

```js
// 支持使用字符串，只能使用默认支持的效果
navigation.navigate('routeName', {
  gestureEnabled:false,
  transitionPresets: "SlideFromRightIOS"
})

// 也支持使用 Object
navigation.navigate('routeName', {
  gestureEnabled:false,
  transitionPresets: TransitionPresets.SlideFromRightIOS
})

// 当然, 也支持完全自定义
navigation.navigate('routeName', {
  gestureEnabled:false,
  transitionPresets: {
    gestureDirection,
    transitionSpec,
    cardStyleInterpolator,
    headerStyleInterpolator
  }
})

```

# badge

`@malacca/bottom-tabs` 默认支持 badge 角标，这里更进一步，若没有通过属性直接设置，便可使用全局函数

```js
import { getBadge, setBadge } from 'react-native-easy/app';

// 获取当前角标
const badge = getBadge('tabName');

// 设置当前角标, badge 支持
//          null: 不显示角标
//             0:  显示圆点角标
// number|string: 显示文字角标
setBadge('tabName', badge)

```


# navigation

全局可用的 导航函数

```js
import { navigation } from 'react-native-easy/app';

// 获取原始的 AppContainer ref
const ref = navigation.ref();

// 跳到指定页面
// 1. 若该页面已打开,会返回到该页
// 2. 否则会打开该页
// 3. 当前就在该页, 什么都不会发生
navigation.navigate(name, params);

// 打开页面, 与 navigate 的不同在于总是打开新页面
// 即同一个页面可被打开多次, params 可不同
navigation.push(name, params);

// 将当前页替换为指定页面
navigation.replace(name, params);

// 是否能返回
const bool = navigation.canGoBack();

// 返回上一页
navigation.goBack();

// 返回上 count 页
navigation.pop(count);

// 返回到 stack 栈的首页
navigation.popToTop();

// 新增监听事件
navigation.addListener(event, fn);

// 重置当前页面的 params
navigation.setParams(params);

// 获取当前页面的 params
// 该方法 react-navigation 已移除, 
// 但在某项深层组件是有可能需要获取该参数的
// 所以这里捡回来
const params = navigation.getParams();

```


# modal

全局 Modal 操作，RN 自带的 Modal 组价是真 Modal, 会在原生层面创建一个 activity，这里提供的是一个 View 模拟的 modal, 仍在在当前 activity 方便全局调用，有以下特性

- 仍然可以在 Screen 中使用原生 Modal
- 该全局 Modal 不能嵌套, 每次只显示一个, 若正在显示 modal，打开新 modal 会关闭目前的 modal

使用方法：

```js
import { modal } from 'react-native-easy/app';

// 当前是否有正在显示的 modal
const bool = modal.isOpen();

// 打开 modal
modal.open(component, config, props);

// 关闭 modal
modal.close(callback, config);

// modal 小应用: toast
modal.toast(msg, timeout, config);

// modal 小应用: loading, 需手动调用 close 才会关闭
// small: bool, 是否使用小尺寸, 默认为 false,
modal.loading(small, color, config);

```

打开 modal 支持三个参数，同时也是 `appProps.modal` 的设置参数，如

```js
export default function App() {
  const modal = {
    component,
    config,
    props
  };
  return <AppContainer modal={modal}>
    {navigator()}
  </AppContainer>
}
```

以下对三个参数进行说明

### `component`

弹出的组件 ReactCompoent || Function

### `props`

作为属性，原样传递给 `component`

示例：

```js
class C extends React.Component{
  render() {
    // 会收到所设置的 props
    // 且 modal.close 会作为 props 传递进来
    const {close, ...props} = this.props;
  }
}

function C(props) {
  // 会收到所设置的 props, 同上
}


// 静态组件, 无法使用 props
const C = <View />


modal.open(C, {}, props)

```

### `config`

支持以下配置

```js
const config = {
     
  // 动效: 起始位置, 
  // 默认为 center, 直接在原位置显示
  // 若设置方向, Modal 将从屏幕外滑入屏幕
  start: "center|top|bottom|left|right",
  
  // 动效: 由于同一时间, 只允许一个 Modal, 所以打开新 modal 会关闭当前已打开的 modal
  // 默认情况, 关闭旧 modal 无任何效果, 会直接关闭, 即使旧 modal 设置了效果
  // 若希望按照旧 modal 动画设置进行关闭, 可设置 smooth=true
  smooth:false,
  
  // 动效: 起始透明度
  opacity: 1,
  
  // 动效: 起始缩放百分比, start=center 的默认值为0, 其他为1
  scale: 1,
  
  // 动效: 动画类型, none 为不使用动效, 默认为 timing
  animation: "timing | spring | none"
  
  // 动效: animation=timing 的时长
  duration: 250,
  
  // 动效: animation=timing 的函数
  easing: null,
  
  // 动效: animation=spring 时的动画 config
  spring: {},
  
  // 动效: 独立设置关闭动效, 不设置则使用打开动效
  closeAnimation:"",
  closeDuration:250,
  closeEasing:null,
  closeSpring:{},
  
  
  
  // 背景组件
  overlay: ReactCompoent | Function | null
  
  // 未指定背景组件, 默认使用背景色
  overlayColor: 'rgba(0,0,0,.2)',
  
  // 背景组件是否可点透
  overlayThrough: false,
  
  // 点击背景组件是否关闭弹窗
  // 若为 true, 则 overlayThrough=true 无效
  overlayClose: false,
  
  
  // 自动关闭 (0: 不自动关闭)
  timeout:0,
  
  // 显示之后的回调函数
  onShow: null,
  
  // 关闭之后的回调函数
  onClose: null,
  
  // 响应物理返回键: 默认为 close
  // 1. close: 关闭弹窗, 
  // 2. back: 关闭弹窗并返回上一页
  // 3. none: 不做处理 (会被导航器处理, 返回上一页但不关闭弹窗)
  // 4. Function: 自定义处理函数
  onBack: "close|back|none" | Function,
}

modal.open(C, config)
```

### `modal.close(callback, config)`

- `callback`: 关闭后的回调函数，不影响 `modal.open` 时设置的 `config.onClose`，二者都会被调用

- `config`: 强制设置关闭动效，不设置则使用 `modal.open` 时设置的动效，支持 
  
   `{ animation, duration, easing, spring }`


### 弹出 component 额外说明

```jsx

// 可全屏
const component = <View style={{
  flex:1
}}/>

// 非全屏, 通过 alignSelf margin 设置 垂直方向的 位置
// 水平放心总是居中
const component = <View style={{
  width:'50%',
  height:150,

  // 顶部以下
  alignSelf: "flex-start",
  marginTop: 20,

  // 底部以上
  alignSelf: "flex-end",
  marginBottom: 20,

  // 居中
  alignSelf: "center",
}}/>


// 想做一个右下角浮窗?
const component = <View style={{
  flex:1,
  alignSelf: "flex-end",
  alignItems:"flex-end",
}}>
  <View />
</View>


// 支持多 component, 但不鼓励这么用
const component = [
  <View key="" />
  <View key="" />
];

```