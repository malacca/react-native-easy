# react-native-easy

一个 RN 组件/API 合集，并没有直接导出，因为里面的组件比较繁杂，且有些组件依赖其他 RN 插件；另外还有一点，使用时按需引入也可以减小 Bundle 体积。

使用方法: 创建一个 js 文件， 如 `easy.js`

```js

// 按需自行引入
module.exports = {
  get imageSize() {
    return require('react-native-easy/utils/imageSize').default;
  },
  get Startup() {
    return require('react-native-easy/startup').default;
  },
  get UpgradeBox() {
    return require('react-native-easy/upgradeBox').default;
  },
  get Screen() {
    return require('react-native-easy/app/Screen').default;
  },
}
```

在项目需要的地方

```js
import {imageSize, Screen} from 'easy';

```
