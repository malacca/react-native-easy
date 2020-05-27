import React from 'react';
import { 
  BackHandler,
  StyleSheet,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Animated,
  View,
  Text,
} from 'react-native';

/**
 * component: ReactCompoent || Function,
 * props: 将原样传递给所指定的 component,
 * config: {
 * 
 *    // 动效: 起始位置, 
 *    // 默认为 center, 直接在原位置显示
 *    // 若设置方向, Modal 将从屏幕外滑入屏幕
 *    start: "center|top|bottom|left|right",
 * 
 *    // 动效: 由于同一时间, 只允许一个 Modal, 所以打开新 modal 会关闭当前已打开的 modal
 *    // 默认情况, 关闭旧 modal 无任何效果, 会直接关闭, 即使旧 modal 设置了效果
 *    // 若希望按照旧 modal 动画设置进行关闭, 可设置 smooth=true
 *    smooth:false,
 * 
 *    // 动效: 起始透明度
 *    opacity: 1,
 * 
 *    // 动效: 起始缩放百分比, start=center 的默认值为0, 其他为1
 *    scale: 1,
 * 
 *    // 动效: 动画类型, none 为不使用动效, 默认为 timing
 *    animation: "timing | spring | none"
 * 
 *    // 动效: animation=timing 的时长
 *    duration: 250,
 * 
 *    // 动效: animation=timing 的函数
 *    easing: null,
 *    
 *    // 动效: animation=spring 时的动画 config
 *    spring: {},
 *    
 *    // 动效: 独立设置关闭动效, 不设置则使用打开动效
 *    closeAnimation:"",
 *    closeDuration:250,
 *    closeEasing:null,
 *    closeSpring:{},
 * 
 * 
 * 
 *    // 背景组件
 *    overlay: ReactCompoent | Function | null
 * 
 *    // 未指定背景组件, 默认使用背景色
 *    overlayColor: 'rgba(0,0,0,.2)',
 *    
 *    // 背景组件是否可点透
 *    overlayThrough: false,
 *    
 *    // 点击背景组件是否关闭弹窗
 *    // 若为 true, 则 overlayThrough=true 无效
 *    overlayClose: false,
 * 
 * 
 *    // 自动关闭 (0: 不自动关闭)
 *    timeout:0,
 * 
 *    // 显示之后回调
 *    onShow: null,
 * 
 *    // 关闭之后回调
 *    onClose: null,
 * 
 *    // 响应物理返回键: 默认为 close
 *    // 1. close: 关闭弹窗, 
 *    // 2. back: 关闭弹窗并返回上一页
 *    // 3. none: 不做处理 (会被导航器处理, 返回上一页但不关闭弹窗)
 *    // 4. Function: 自定义处理函数
 *    onBack: "close|back|none" | Function,
 * }
 * 
*/
const DEFAULT_ANIMATION = 'timing';
const DEFAULT_DURATION = 250;
const DEFAULT_START = 'center';
const ANIMATION_FIELD = ['Animation', 'Duration', 'Easing', 'Spring'];

const AnimatedModal = React.forwardRef((props, ref) => {
  const [style, setStyle] = React.useState(props.style);
  React.useImperativeHandle(ref, () => {
    return {
      update:(style) => {
        setStyle(style)
      },
    };
  });

  // 获取 Modal 尺寸以及 Modal Children 的相对尺寸以便计算动效
  // chilren 尺寸的获取方式并不是 RN 暴露的接口, 有一定的风险性
  // 但这也是目前能找到的最优解了
  // TODO: 找到更安全的办法了, 可优化这部分
  const animateRef = React.useRef();
  const layoutCalled = React.useRef(false);
  const {needPosition, onLayout} = props;
  const onNativeLayout = (e) => {
    // layout 只调用一次, 一般情况下, 这里也只会调用一次
    // 但如果正在显示, 途中修改 statusBar 的 translucent
    // 会造成二次调用, 导致多次触发 onShow 回调
    if (layoutCalled.current) {
      return;
    }
    layoutCalled.current = true;
    if (!needPosition) {
      onLayout();
      return;
    }
    const ref = animateRef.current;
    const nodeId = ref._nativeTag;
    const layout = e.nativeEvent.layout;
    // 可能会有多个子视图, 获取所有子视图的边界坐标
    findEdgePosition(nodeId, ref._children, 0, {
      minX: layout.width,
      minY: layout.height,
      maxX: 0,
      maxY: 0,
    }, (position) => {
      const {minX, minY, maxX, maxY} = position;
      onLayout({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        screenWidth: layout.width,
        screenHeight:  layout.height
      });
    });
  }
  const findEdgePosition = (nodeId, children, index, position, callback) => {
    if (index >= children.length) {
      callback(position);
      return;
    }
    children[index].measureLayout(nodeId, (x, y, width, height) => {
      const x2 = x + width, y2 = y + height;
      if (x < position.minX) {
        position.minX = x;
      }
      if (y < position.minY) {
        position.minY = y;
      }
      if (x2 > position.maxX) {
        position.maxX = x2;
      }
      if (y2 > position.maxY) {
        position.maxY = y2;
      }
      findEdgePosition(nodeId, children, index + 1, position, callback)
    }, () => {
      findEdgePosition(nodeId, children, index + 1, position, callback)
    })
  }
  return <Animated.View
    ref={animateRef}
    children={props.children}
    pointerEvents="box-none"
    style={[styles.modal, style]}
    onLayout={onNativeLayout}
  />
});

export class Modal extends React.PureComponent {
  _config = null;
  _backHandle = null;
  _upFromInset = false;
  _isShowed = false;
  _closeTimer = null;
  _animateTimer = null;
  _animateRef = React.createRef();
  _animate = new Animated.Value(0);
  state = {
    component:null,
  };

  componentDidMount(){
    const {component, config, props} = this.props;
    this.open(component, config, props);
  }
  componentDidUpdate() {
    if (this._upFromInset) {
      this._upFromInset = false;
    } else {
      const {component, config, props} = this.props;
      this.open(component, config, props);
    }
  }
  componentWillUnmount(){
    this._clearAnimateTimer();
    this._unbindBackHandle();
  }
  _clearAnimateTimer = () => {
    if (this._animateTimer) {
      this._animateTimer.stop();
      this._animateTimer = null;
    }
    if (this._closeTimer) {
      clearTimeout(this._closeTimer);
      this._closeTimer = null;
    }
  }
  _unbindBackHandle = () => {
    if (this._backHandle) {
      this._backHandle.remove();
      this._backHandle = null;
    }
  }

  // 绑定物理返回键事件
  _bindBackHandle = () => {
    this._unbindBackHandle();
    if (this._config && this._config.onBack !== 'none') {
      this._backHandle = BackHandler.addEventListener('hardwareBackPress', this._onBackPress);
    }
  }
  _onBackPress = () => {
    const {onBack} = this._config||{};
    if (typeof onBack === 'function') {
      return onBack();
    }
    this._close();
    return onBack !== 'back';
  }

  isOpen = () => {
    return this.state.component !== null;
  }

  open = (component, config, props) => {
    if (!component) {
      if (this.isOpen()) {
        this._close();
      }
      return false;
    }
    const _config = {
      ...config,
      props
    };
    // 已有 Modal 先关闭再打开, 不需要平滑过渡的, 采用无动效关闭
    if (this.isOpen()) {
      const closeConfig = _config.smooth ? null : {
        animation: "none"
      };
      this.close(() => {
        this._config = _config;
        this._openModal(component)
      }, closeConfig)
    } else {
      this._clearAnimateTimer();
      this._config = _config;
      this._openModal(component);
    }
    return true;
  }

  _openModal = (component) => {
    this._upFromInset = true;
    this.setState({component}, this._bindBackHandle)
  }

  _close = () => {
    this.close();
  }

  /**
   * 1. 可传递一个回调函数, 同时, 仍会调用 open 时设置的 props.onClose 
   * 2. 可设置 config 使用新的动画配置, 默认会使用打开时的配置
   *    参数 config 仅支持 {animation, duration, easing, spring}
   * 3. 关闭动效优先级  config > closeConfig > openConfig
   */
  close = (callback, config) => {
    if (!this.isOpen()) {
      return false;
    }
    this._clearAnimateTimer();
    this._unbindBackHandle();

    // 根据优先级计算关闭动效
    const animationConfig = {};
    const currentConfig = this._config||{};
    ANIMATION_FIELD.forEach(k => {
      const key = k.toLocaleLowerCase(),
        closeKey = 'close' + k;
      if (closeKey in currentConfig) {
        animationConfig[key] = currentConfig[closeKey]
      } else if (key in currentConfig) {
        animationConfig[key] = currentConfig[key]
      }
    });
    const {
      animation=DEFAULT_ANIMATION,
      duration=DEFAULT_DURATION,
      easing,
      spring,
    } = {
      ...animationConfig,
      ...config
    };
    // 无动效
    if (animation === 'none') {
      this._onClose(callback);
      return true;
    }
    // 关闭动效
    this._animateTimer = animation === 'spring' ?
      Animated.spring(this._animate, {
        ...spring,
        toValue:0,
        useNativeDriver:true,
      }) : 
      Animated.timing(this._animate, {
        toValue: 0,
        duration,
        easing,
        useNativeDriver:true,
      });
    this._animateTimer.start(({finished}) => {
      // 在 close 未完成前, 再次中断动画并触发该回调
      // 所以, 需仅在最后一次触发回调, 即关闭完成时执行
      if(finished) {
        this._onClose(callback);
      }
    });
    return true;
  }

  _onClose = (callback) => {
    this._upFromInset = true;
    this.setState({component: null}, () => {
      const {onClose} = this._config;
      this._config = null;
      // 可能还未执行完 打开动画就关闭了, 即为触发 onShow
      // 为保证 onShow 和 onClose 回调成对出现, 
      // 只有 _isShowed 才调用 onClose
      if (this._isShowed && typeof onClose === 'function') {
        this._isShowed = false;
        onClose();
      }
      if (typeof callback === 'function') {
        callback();
      }
    });
  }

  // AnimatedModal 获取尺寸信息后, 开始动效
  _onLayout = (position) => {
    const {
      start=DEFAULT_START,
      opacity=1,
      scale,
      animation=DEFAULT_ANIMATION,
      duration=DEFAULT_DURATION,
      easing,
      spring,
    } = this._config;

    // 计算动效 style
    const transform = [];
    if (start === 'center') {
      transform.push(this._makeScale(scale||0))
    } else {
      const {x, y, width, height, screenWidth, screenHeight} = position;
      const horizontal = start === 'left' || start === 'right';
      const direction = start === 'top' || start === 'left';
      const withScale = scale !== undefined && scale !== 1;

      const screen = horizontal ? screenWidth : screenHeight;
      const size = horizontal ? width : height;
      const offset = horizontal ? x : y; 
      const edge = direction ? offset : screen - size - offset;
      const ds = ((
        withScale 
        ? screen*(0.5 - scale/2)  +  (edge + size)*scale
        : edge + size
      ) + 10) * (direction ? -1 : 1);
      const translate = this._makeInterpolate(ds, 0);
      if (horizontal) {
        transform.push({translateX: translate})
      } else {
        transform.push({translateY: translate})
      }
      if (withScale) {
        transform.push(this._makeScale(scale));
      }
    }
    // 打开不使用动效
    if (animation === 'none') {
      this._updateStyle(1, transform, opacity);
      return this._onShow();
    }
    // 打开动效
    this._updateStyle(0, transform, opacity);
    this._animateTimer = animation === 'spring' ? 
      Animated.spring(this._animate, {
        ...spring,
        toValue:1,
        useNativeDriver:true,
      }) : 
      Animated.timing(this._animate, {
        toValue:1,
        duration,
        easing,
        useNativeDriver:true,
      });
    this._animateTimer.start(({finished}) => {
      finished && this._onShow();
    });
  }

  _updateStyle = (start, transform, opacity) => {
    this._animate.setValue(start);
    this._animateRef.current.update({
      transform,
      opacity: this._makeInterpolate(opacity, 1)
    });
  }

  _makeScale = (scale) => {
    return {scale: this._makeInterpolate(scale, 1)}
  }

  _makeInterpolate = (start, end) => {
    return this._animate.interpolate({
      inputRange: [0, 1],
      outputRange: [start, end]
    })
  }

  _onShow = () => {
    const {
      timeout,
      onShow,
    } = this._config;
    if (timeout) {
      this._closeTimer = setTimeout(this._close, timeout);
    }
    this._isShowed = true;
    onShow && onShow();
  }

  render() {
    const {component: Component} = this.state;
    if (!Component) {
      return null;
    }
    const {
      start=DEFAULT_START,
      overlay:OverLay,
      overlayColor='rgba(0,0,0,.2)',
      overlayThrough=false,
      overlayClose=false,
      props={},
    } = this._config;

    // 背景组件
    const overlayPointerEvents = !overlayClose && overlayThrough ? 'none' : 'auto';
    const overlayStyle = {
      flex:1,
      backgroundColor: overlayColor
    };

    const customeOverlay = OverLay ? (
      React.isValidElement(OverLay) 
        ? OverLay 
        : <OverLay style={overlayStyle} pointerEvents={overlayPointerEvents}/>
      ) : null;

    const modalOverlay = customeOverlay ? (
      overlayClose ? <TouchableWithoutFeedback 
        children={customeOverlay} 
        onPress={this._close} 
      /> : customeOverlay
    ) : (
      overlayClose ? <TouchableWithoutFeedback 
        onPress={this._close} 
      ><View style={overlayStyle} /></TouchableWithoutFeedback> : null
    );
    
    return <View 
      pointerEvents={overlayClose || overlayThrough || customeOverlay ? "box-none" : "auto"}
      style={[styles.container, {
        backgroundColor: overlayClose || customeOverlay ? undefined : overlayColor
      }]}
    >
      {modalOverlay}
      <AnimatedModal
        ref={this._animateRef}
        needPosition={start !== 'center'}
        onLayout={this._onLayout}
      >{React.isValidElement(Component)
        ? Component
        : <Component {...props} close={this.close}/>
      }</AnimatedModal>
    </View>
  }
}

export function ModalToast(props) {
  const {
    load,
    msg,
    color="#ddd",
    small
  } = props;
  return <View style={load ? styles.toastLoad : styles.toast}>
    {load 
      ? <ActivityIndicator size={small ? "small" : "large"} color={color}/>
      : <Text style={styles.ToastTxt}>{msg}</Text>
    }
  </View>
}

const styles = StyleSheet.create({
  container:{
    ...StyleSheet.absoluteFill,
    flexDirection:'row',
    justifyContent:'center'
  },
  modal:{
    ...StyleSheet.absoluteFill,
    flexDirection:'row',
    justifyContent:'center',
    opacity:0,
  },
  toastLoad:{
    backgroundColor:'rgba(0,0,0,.7)',
    padding:12,
    borderRadius:6,
    alignSelf:"center",
  },
  toast:{
    backgroundColor:'rgba(0,0,0,.65)',
    paddingVertical:6,
    paddingHorizontal:10,
    borderRadius:4,
    alignSelf:"center",
  },
  ToastTxt:{
    color:'white',
    fontSize:15
  },
});