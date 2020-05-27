import React from 'react';
import {StyleSheet, Animated, View, ScrollView} from 'react-native';
import {ViewPager} from 'react-native-viewpager-list';
import createEvent from './../utils/createEvent';
import Button from './../button';

const AnimatedViewPager = Animated.createAnimatedComponent(ViewPager);

/**
 * TopTabView  依赖  
 * react-native-viewpager-list
 * 
 * <TopTabView
 *   // 必选配置
 *   tabs={[item, item, ...]}   //tab 配置
 *   currentIndex={0}    //当前显示的 Tab
 * 
 *   // 基本属性
 *   style={}       //包裹 tabBar 和 screen 的外层 view style
 *   
 *   // viewpager 配置
 *   pageOptions = {
 *      style={}    //viewPager 整体样式
 *      lazy={true} //是否懒加载
 *      placeholder={Function|Component}  //懒加载前的占位组件
 *      onPageChanged={Function(e)}     //与原始 viewpager 不同, 默认切换 index, 可 e.preventDefault() 阻止默认事件
 *      // 其他 ViewPagerList 支持的属性, 如
 *      offscreenPageLimit={0}  //原生层保持的前后 page 数目
 *      disableSwipe={false}   //禁止手势切换页面
 *      disableWave={false}    //不显示滑动到边缘时的水波纹
 *      transformer="|card|zoomOut|depth"  //页面切换效果
 *   }
 *   
 *   // TabBar 样式配置, 可做一些 layout 相关的, 如 padding margin 等
 *   tabBarOptions = {
 *      style={}             //包裹 tabBackground 和 tabContainer 的 TabBar 整体样式
 *      scrollable={true}    //TabBar 是否可横向滚动
 *      renderBackground={}  //自定义 TabBar 背景组件, 默认为 Animated.View
 *      backgroundStyle={}   //自定义 TabBar 背景组件样式
 *      containerStyle={}    //包裹所有 Tab 的外层 view 样式
 *      renderTab={Function|Component}  //Tab 组件, 默认为 Animated.Text
 *      tabStyle={}           //Tab 单项样式 (可同时指定 font** 相关属性, 自动应用到 Text 组件)
 *      tabPressStyle={}      //Tab 按下样式, 同上
 *      tabLongPressStyle={}  //Tab 长按样式
 *      underlineVisible={true} //是否在激活的 Tab 显示一条 下划线
 *      underlineStyle={}       //自定义下划线样式
 *      onTabPress={Function(e)}   //点击Tab回调, 默认为切换到当前页面, 可使用 e.preventDefault() 阻止默认事件
 *      onTabLongPress={}       //长按Tab回调
 *   }
 *   
 *   // 颜色相关配置, 若没有颜色变化, 动态 animate 会使用 nativeDriver
 *   colorOptions = {
 *      backgroundColor="transparent" //TabBar 背景色
 *      underLineColor="#2196F3"      //underline 下划线颜色
 *      tabActiveScale={1}            //激活 Tab 文字缩放比例
 *      tabInactiveColor="#000"       //未激活的 Tab 文字颜色
 *      tabInactiveOpacity=1          //未激活的 Tab 文字透明度
 *      tabActiveColor="#2196F3"      //激活的 Tab 文字颜色
 *      tabActiveOpacity=1            //激活的 Tab 文字透明度
 *   }
 * />
 * 
 * tabs 中的 item
 * 
 * item = {
 *    // 页面组件、组件载入 props
 *    screen: Function|Component,
 *    props: {},
 *    
 *    // 可设置以下参数
 *    // 1. renderTab 所需参数, 默认为 Animated.Text, 仅需要 label 属性
 *    // 2. 可重置 全局 colorOptions 中的参数, 即可以给每个 Tab 页面配置不同颜色的 TabBar
 *    // 3. 可设置 placeholder, 即为当前页面单独配置占位组件
 *    options: {
 *      label:"", 
 * 
 *      backgroundColor:"red",
 *      ...,
 * 
 *      placeholder
 *    }
 * }
 * 
 */
function TopTabView(props) {
  const {
    tabs,
    currentIndex=0,
    style,
    pageOptions,
    tabBarOptions,
    colorOptions
  } = props;

  const {
    lazy=true,
    placeholder:pagePlaceholder,
    style:pageStyle,
    onPageScroll,
    onPageChanged,
    offscreenPageLimit,
    ...pageProps
  } = pageOptions||{};

  const {
    scrollable=true,
    style:tabBarStyle,
    renderBackground:Background=Animated.View,
    backgroundStyle,
    containerStyle,
    renderTab,
    tabStyle,
    tabPressStyle,
    tabLongPressStyle,
    underlineVisible=true,
    underlineStyle,
    onTabPress,
    onTabLongPress,
  } = tabBarOptions||{};

  const scrollViewRef = React.useRef();
  const pagerViewRef = React.useRef();
  const barLayouts = React.useRef();
  const labelLayouts = React.useRef();
  const underLineTransform = React.useRef();
  const scrollPosition = React.useRef(new Animated.Value(0));
  const scrollPositionValue = scrollPosition.current;

  const pagerLoaded = React.useRef([]);
  const lastIndexRef = React.useRef(-1);
  const curIndexRef = React.useRef(-1);
  const [update, forceUpdate] = React.useState(false);

  // 判断使用外部 currentIndex 还是 内部 curIndexRef
  let realCurrentIndex = curIndexRef.current;
  if (currentIndex !== lastIndexRef.current) {
    realCurrentIndex = lastIndexRef.current = curIndexRef.current = currentIndex;
  }
  if (realCurrentIndex >= tabs.length) {
    return null;
  }

  // 响应 TabPress, pageChanged 的函数
  const onTabIndexPress = (index) => {
    if (onTabPress) {
      const event = createEvent(index, 'tabPress');
      onTabPress(event);
      if (event.defaultPrevented) {
        return;
      }
    }
    updateToIndex(index);
  }
  const onPageIndexChanged = (e) => {
    if (onPageChanged) {
      const event = createEvent(e, 'pageChanged');
      onPageChanged(event);
      if (event.defaultPrevented) {
        return;
      }
    }
    updateToIndex(e.position);
  }
  const updateToIndex = (index) => {
    if (realCurrentIndex !== index) {
      curIndexRef.current = index;
      forceUpdate(!update);
    }
  }

  // 更新完成后, 若 tabBar scrollable, 页面切换后, 让选中项滚动到正中间
  React.useEffect(() => {
    if (scrollable) {
      updateScrollOffset(realCurrentIndex);
    }
  }, [realCurrentIndex])

  // 计算 color 相关的 style  
  const colorStyles = React.useMemo(
    () => getAnimateStyleRange(tabs, colorOptions, scrollPositionValue), 
    [tabs, colorOptions, scrollPositionValue]
  );

  // Tab unserline
  const renderTabUnderline = () => {
    return underlineVisible ? <Animated.View 
      collapsable={false}
      style={[styles.line, underlineStyle, colorStyles.underline, underLineTransform.current || {opacity: 0}]}
    /> : null;
  }

  // Tab Label
  const tabText = (atts) => {
    const {options, index, style, ...txtProps} = atts;
    txtProps.style = [style, colorStyles.labelStyle[index]];
    if (renderTab) {
      txtProps.options = options;
      txtProps.index = index;
      return renderTab(txtProps);
    }
    return <Animated.Text {...txtProps}>{options.label||'unkown'}</Animated.Text>
  }

  // Tab
  const tabItem = (item, index) => {
    return <Button 
      key={index}
      style={[scrollable ? styles.tab : styles.tabFlex, tabStyle]}
      pressStyle={tabPressStyle}
      longPressStyle={tabLongPressStyle}
      title={tabText}
      textProps={{options: item.options||{}, index}}
      onPress={() => {
        onTabIndexPress(index)
      }}
      onLongPress={onTabLongPress ? () => {
        onTabLongPress(index)
      } : onTabLongPress}
    />
  }

  // 读取 TabBar, 若不需要滚动, 直接使用 View, 居中排列
  // 否则使用 ScrollView, 左对齐排列
  const renderTabBar = () => {
    if (!scrollable) {
      return <View
        ref={scrollViewRef}
        style={[styles.tabFull, containerStyle]}
        onLayout={tabBarChange}
      >
        {tabs.map(tabItem)}
        {renderTabUnderline()}
      </View>
    }
    return <ScrollView 
      ref={scrollViewRef}
      horizontal={true}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      directionalLockEnabled={true}
      scrollsToTop={false}
      onContentSizeChange={tabBarChange}
      contentContainerStyle={containerStyle}
    >
      {tabs.map(tabItem)}
      {renderTabUnderline()}
    </ScrollView>
  }
  
  // TabBar 渲染后记录其宽度, 在 scrollable 的情况下设置 scrollView 居中
  const tabBarLayout = (e) => {
    barLayouts.current = e.nativeEvent.layout.width;
    updateScrollOffset(realCurrentIndex, true);
  }
  
  /**
   * Tabs 外层 View 渲染成功后回调
   * 获取每个 Tab 的尺寸和位置, 用于定位 tabUnderline 和设置 scrollView 居中
   * 这种方法不是官方推荐的, 说不定以后会失效, 但这种方式最简单, 
   * 否则需要在所有 button 和 label 添加 onLayout, 最终依次计算, 
   * TODO:若该方法失效, 再改成安全方案
   */
  const tabBarChange = () => {
    updateLayouts(scrollable 
      ? scrollViewRef.current._innerViewRef
      : scrollViewRef.current
    );
  }
  const updateLayouts = (nativeView) => {
    const nativeId = nativeView._nativeTag;
    const len = nativeView._children.length - (underlineVisible ? 1 : 0);
    const layouts = {};
    for (let k=0; k<len; k++) {
      ((index) => {
        const label = nativeView._children[index]._children[0];
        label.measureLayout(nativeId, (x, y, width, height) => {
          layouts[index] = {x, y, width, height};
          if (Object.keys(layouts).length === len) {
            afterLayouts(layouts)
          }
        })
      })(k)
    }
  }
  const afterLayouts = (layouts) => {
    const len = Object.keys(layouts).length;
    const arrLayouts = [];
    for (let k=0; k<len; k++) {
      arrLayouts.push(layouts[k])
    }
    labelLayouts.current = arrLayouts;
    updateScrollOffset(realCurrentIndex, true);
    if (underlineVisible) {
      upUnderLineTransform();
      forceUpdate(!update)
    }
  }

  // 更新 scrollView 偏移量, 尽量让当前选中的居中 
  const updateScrollOffset = (position, init) => {
    if (!scrollable) {
      return;
    }
    const width = barLayouts.current;
    const layouts = labelLayouts.current;
    if (!width || !layouts) {
      return;
    }
    position = Math.min(position, layouts.length - 1);
    const current = layouts[position];
    const offset = current.x + current.width / 2;
    const x = Math.max(0, offset - width / 2);
    scrollViewRef.current.scrollTo({x, y: 0, animated: !init})
  }

  // 更新 underLine style
  const upUnderLineTransform = () => {
    const layouts = labelLayouts.current;
    let minWidth = 100000;
    layouts.forEach(item => {
      minWidth = Math.min(minWidth, item.width)
    });
    const inputRange = [];
    const scaleOutputRange = [];
    const translateOutputRange = [];
    layouts.forEach((item, index) => {
      inputRange.push(index);
      translateOutputRange.push(item.x + (item.width - minWidth) / 2);
      scaleOutputRange.push(item.width / minWidth * colorStyles.labelScale[index]);
    });
    const translateX = scrollPositionValue.interpolate({
      inputRange,
      outputRange:translateOutputRange,
      extrapolate:'clamp'
    });
    const scaleX = scrollPositionValue.interpolate({
      inputRange,
      outputRange:scaleOutputRange,
      extrapolate:'clamp'
    });
    underLineTransform.current = {
      width: minWidth,
      transform:[{translateX}, {scaleX}]
    }
  }

  // 读取 screen
  const renderScreen = (item, index) => {
    let isLazy = false;
    if (lazy && !pagerLoaded.current.includes(index)) {
      if (offscreenPageLimit) {
        //支持离屏预加载, 判断是否在预加载范围外
        isLazy = Math.abs(index - realCurrentIndex) > offscreenPageLimit
      } else {
        //不需要离屏加载, 仅加载当前 index
        isLazy = realCurrentIndex !== index;
      }
      if (!isLazy) {
        pagerLoaded.current.push(index)
      }
    }
    let pager = null;
    const {screen:Screen, props, options={}} = item;
    if (isLazy) {
      const PlaceHolder = options.placeholder||pagePlaceholder;
      if (PlaceHolder) {
        pager = React.isValidElement(PlaceHolder) ? PlaceHolder : <PlaceHolder />
      }
    } else if (Screen) {
      pager = <Screen {...props} />
    }
    return <View key={index} style={{flex:1}} children={pager} />
  }

  // render
  const render = () => {
    if (underlineVisible && labelLayouts.current && !underLineTransform.current) {
      upUnderLineTransform();
    }
    const pageScrollConfig = {
      useNativeDriver: colorStyles.useNativeDriver,
    }
    if (onPageScroll) {
      pageScrollConfig.listener = onPageScroll;
    }
    return <View style={[styles.container, style]}>
      <AnimatedViewPager 
        {...pageProps}
        ref={pagerViewRef}
        style={[styles.container, pageStyle]}
        horizontal={true}
        currentIndex={realCurrentIndex}
        offscreenPageLimit={offscreenPageLimit}
        onPageChanged={onPageIndexChanged}
        onPageScroll={Animated.event(
          [{nativeEvent: { totalOffset: scrollPositionValue} }],
          pageScrollConfig
        )}
      >
        {tabs.map(renderScreen)}
      </AnimatedViewPager>
      <View style={tabBarStyle} onLayout={tabBarLayout}>
        <Background style={[StyleSheet.absoluteFill, backgroundStyle, colorStyles.background]} /> 
        {renderTabBar()}
      </View>
    </View>
  }
  return render();
};

// 计算颜色相关的 animate style
const getAnimateStyleRange = (tabs, colors, positionValue) => {
  if (!tabs.length) {
    return null;
  }
  const {
    backgroundColor="transparent",
    underLineColor="#2196F3",
    tabActiveScale=1,
    tabInactiveColor="#000",
    tabInactiveOpacity=1,
    tabActiveColor="#2196F3",
    tabActiveOpacity=1,
  } = colors||{};

  const inputRange = [];
  const labelScale = [];
  const backgroundColorOutput = [];
  const underLineColorOutput = [];
  const labelStyle = [];
  const activeColors = [];
  const inactiveColors = [];
  const inactiveOpacity=[];
  const activeOpacity=[];

  let pureTabColor = tabInactiveColor === tabActiveColor ? tabActiveColor : false;
  let pureTabOpacity = tabInactiveOpacity === tabActiveOpacity ? tabActiveOpacity : false;
  tabs.forEach((tab, index) => {
    inputRange.push(index);

    const options = tab.options||{};
    const activeScale = options.tabActiveScale||tabActiveScale;

    labelScale.push(options.tabActiveScale||tabActiveScale);
    backgroundColorOutput.push(options.backgroundColor||backgroundColor);
    underLineColorOutput.push(options.underLineColor||underLineColor);

    labelStyle.push(activeScale !== 1 ? {
      transform: [{scale: positionValue.interpolate({
        inputRange: [index-1, index, index+1],
        outputRange: [1, activeScale, 1],
        extrapolate: 'clamp'
      })}],
    } : {});

    // tabColor 是否全部一致
    const aColor = options.tabActiveColor||tabActiveColor;
    const iColor = options.tabInactiveColor||tabInactiveColor;
    activeColors.push(aColor);
    inactiveColors.push(iColor);
    if (pureTabColor && (aColor !== pureTabColor || iColor !== pureTabColor)) {
      pureTabColor = false;
    }

    // tabOpacity 是否全部一致
    const aOpacity = options.tabInactiveOpacity||tabInactiveOpacity;
    const iOpacity = options.tabActiveOpacity||tabActiveOpacity;
    inactiveOpacity.push(aOpacity);
    activeOpacity.push(iOpacity);
    if (pureTabOpacity && (aOpacity !== pureTabOpacity || iOpacity !== pureTabOpacity)) {
      pureTabOpacity = false;
    }
  });

  const isPureBackground = backgroundColorOutput.every(v => v === backgroundColorOutput[0]);
  const background = isPureBackground ? backgroundColorOutput[0] : positionValue.interpolate({
    inputRange,
    outputRange: backgroundColorOutput
  });

  const isPureUnderline = underLineColorOutput.every(v => v === underLineColorOutput[0]);
  const underline = isPureUnderline ? underLineColorOutput[0] : positionValue.interpolate({
    inputRange,
    outputRange: underLineColorOutput
  });

  labelStyle.forEach((style, index) => {
    if (pureTabColor) {
      style.color = pureTabColor;
    } else {
      const outputColorRange = [...inactiveColors];
      outputColorRange[index] = activeColors[index];
      style.color = positionValue.interpolate({
        inputRange,
        outputRange:outputColorRange
      });
    }
    if (pureTabOpacity) {
      style.opacity = pureTabOpacity;
    } else {
      const outputOpacityRange = [...inactiveOpacity];
      outputOpacityRange[index] = activeOpacity[index];
      style.opacity = positionValue.interpolate({
        inputRange,
        outputRange:outputOpacityRange
      });
    }
  });

  // 无颜色动效的情况下, 可使用 Native Driver
  const useNativeDriver = pureTabColor && isPureBackground && isPureUnderline;

  return {
    background: {
      backgroundColor: background
    },
    underline: {
      backgroundColor: underline
    },
    labelStyle,
    labelScale,
    useNativeDriver
  }
}

const tabBaseStyle = {
  borderRadius:0,
  backgroundColor: 'transparent',
  fontSize:12,
};
const styles = StyleSheet.create({
  container:{
    flex:1,
    flexDirection:"column-reverse",
  },
  tabFull:{
    flexDirection:"row",
    justifyContent:"space-around"
  },
  tab:tabBaseStyle,
  tabFlex:{
    flexGrow:1,
    ...tabBaseStyle
  },
  line:{
    backgroundColor:"rgb(33,150,243)",
    position:"absolute",
    left:0,
    bottom:0,
    height:1,
  }
});

export default React.memo(TopTabView);