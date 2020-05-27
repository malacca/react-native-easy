import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {
  View,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
const {
  width:screenWidth, 
  height:screenHeight
} = Dimensions.get('window');

/**
 * 修改自 react-native-swiper
 * 移除了 button / title 组件, 删除了一些多余代码, 优化性能
 * 
 * <Swiper {...props}>
 *    <View />
 *    <View />
 * </Swiper>
 * 
 * 
 * 
 */
export default class extends Component {

  static propTypes = {
    // 方向
    horizontal: PropTypes.bool,

    // 循环 / 当前显示 / 子组件
    loop: PropTypes.bool,
    index: PropTypes.number,
    children: PropTypes.node.isRequired,

    // 自动播放
    autoplay: PropTypes.bool,
    autoplayTimeout: PropTypes.number,
    autoplayDirection: PropTypes.bool,

    // 容器
    style: PropTypes.oneOfType([
      PropTypes.object,
      PropTypes.number,
      PropTypes.array
    ]),

    // 小圆点
    showsPagination: PropTypes.bool,
    renderPagination: PropTypes.func,
    dotColor: PropTypes.string,
    activeDotColor: PropTypes.string,
    paginationStyle: PropTypes.oneOfType([
      PropTypes.object,
      PropTypes.number,
      PropTypes.array
    ]),
    dotStyle: PropTypes.oneOfType([
      PropTypes.object,
      PropTypes.number,
      PropTypes.array
    ]),
    activeDotStyle: PropTypes.oneOfType([
      PropTypes.object,
      PropTypes.number,
      PropTypes.array
    ]),

    /*
     自定义 scrollView 属性, 以下属性无法设置
     其他所有支持的属性都可以设置
      horizontal: props.horizontal
      contentOffset: {}
      pagingEnabled: true,
      showsHorizontalScrollIndicator: false,
      showsVerticalScrollIndicator: false,
      bounces: false,
      scrollsToTop: false,
      automaticallyAdjustContentInsets: false,
    */
    scrollViewProps: PropTypes.object,

    // 切换回调
    onIndexChanged: PropTypes.func
  }

  static defaultProps = {
    horizontal: true,
    loop: true,
    index: 0,
    showsPagination: true,
    autoplay: false,
    autoplayTimeout: 2500,
    autoplayDirection: true,
    onIndexChanged: () => null
  }

  autoplayEnd = false;
  autoplayTimer = null;
  state = this._initState({}, true);

  componentDidMount() {
    this._startAutoplay()
  }

  componentDidUpdate(prevProps) {
    // 若 props.horizontal 或 props.index 变化, 更新 state
    const props = this.props;
    const indexChange = props.index !== prevProps.index;
    if (indexChange || props.horizontal !== prevProps.horizontal) {
      this._initState({...this.state, index: indexChange ? props.index : this.state.index})
    }
    if (props.autoplay !== prevProps.autoplay) {
      this.autoplayTimer && clearTimeout(this.autoplayTimer);
      if (props.autoplay) {
        this._startAutoplay()
      }
    } 
  }

  componentWillUnmount() {
    this.autoplayTimer && clearTimeout(this.autoplayTimer)
  }
  
  // 获取当前 state
  fullState() {
    return Object.assign({}, this.state, this.internals)
  }

  // 外部可用的接口, 切换到 index
  scrollTo = (index, animated = true) => {
    const total = this.state.total;
    if (total < 2) {
      return;
    }
    index = Math.max(0, Math.min(index, total - 1));
    this._scrollBy(index, animated);
  }

  _initState = (state, init) => {
    const props = this.props;
    const newState = {};
    let resetScroll = false;

    // props.width / props.height 仅载入时生效, 后面将自动使用 layout 尺寸
    const width = state.width || props.width || screenWidth;
    const height = state.height || props.height || screenHeight;
    if (init || width !== this.state.width) {
      resetScroll = true;
      newState.width = width;
    }
    if (init || height !== this.state.height) {
      resetScroll = true;
      newState.height = height;
    }

    let total = state.total || 0;
    if (props.children !== state.children) {
      newState.children = props.children;
      newState.total = total = Array.isArray(props.children) ? newState.children.length : 1;
    }

    let newIndex = typeof state.index === 'number' ? state.index : props.index||0;
    newIndex = Math.max(0, Math.min(newIndex, total - 1));
    if (init || newIndex !== this.state.index) {
      resetScroll = true;
      newState.index = newIndex;
    }

    const horizontal = props.horizontal !== false;
    const dir = horizontal ? 'x' : 'y';
    const offset = total > 1 ? (
      (props.loop ? newIndex + 1 : newIndex) * (horizontal ? width : height) 
    ) : 0;
    const newOffset = {
      x:0,
      y:0
    };
    newOffset[dir] = offset;
    if (dir !== state.dir || !state.offset) {
      resetScroll = true;
      newState.dir = dir;
      newState.offset = newOffset;
    } else if (offset !== state.offset[dir]) {
      resetScroll = true;
      newState.offset = newOffset;
    }

    if (total > 1 && resetScroll && this.scrollView) {
      setTimeout(() => {
        this.scrollView.scrollTo({...newOffset, animated:false})
      }, 0)
    }
    this.internals = {
      ...this.internals,
      offset: newOffset,
      isScrolling: false
    };
    if (!init) {
      this.setState(newState)
    }
    return newState
  }

  _onLayout = event => {
    const {width, height} = event.nativeEvent.layout;
    this._initState({...this.state, width, height})
  }

  _startAutoplay = () => {
    if (
      this.internals.isScrolling ||
      this.autoplayEnd || 
      !this.props.autoplay ||
      !Array.isArray(this.state.children)
    ) {
      return;
    }
    this.autoplayTimer && clearTimeout(this.autoplayTimer);
    this.autoplayTimer = setTimeout(this._runAutoPlay, this.props.autoplayTimeout)
  }

  _runAutoPlay = () => {
    if (!this.props.loop && (
      this.props.autoplayDirection ? this.state.index === this.state.total - 1 : this.state.index === 0
    )) {
      this.autoplayEnd = true;
    } else {
      this._scrollBy(this.state.index + (this.props.autoplayDirection ? 1 : -1))
    }
  }

  _scrollBy = (index, animated = true) => {
    const state = this.state;
    if (this.internals.isScrolling || state.total < 2 || index === state.index) {
      return;
    }
    let diff = index + (this.props.loop ? 1 : 0);
    let x = 0, y = 0;
    if (state.dir === 'x') {
      x = diff * state.width
    }
    if (state.dir === 'y') {
      y = diff * state.height
    }
    this.autoplayEnd = false;
    this.internals.isScrolling = true;
    this.scrollView && this.scrollView.scrollTo({x, y, animated});
    // android 使用 scrollTo 不会触发 scrollView 的 
    // onMomentumScrollEnd 回调, 这里主动调用
    if (!animated || Platform.OS !== 'ios') {
      requestAnimationFrame(() => {
        this._onMomentumScrollEnd({
          nativeEvent: {
            position: diff
          }
        })
      })
    }
  }

  _renderScrollView = pages => {
    const {contentContainerStyle, ...scrollViewProps} = this.props.scrollViewProps||{};
    return (
      <ScrollView
        ref={this._refScrollView}
        {...scrollViewProps}
        contentContainerStyle={[styles.swiper, contentContainerStyle]}
        horizontal={this.props.horizontal}
        contentOffset={this.state.offset}
        pagingEnabled={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bounces={false}
        scrollsToTop={false}
        automaticallyAdjustContentInsets={false}
        onScrollBeginDrag={this._onScrollBeginDrag}
        onScrollEndDrag={this._onScrollEndDrag}
        onMomentumScrollEnd={this._onMomentumScrollEnd}
      >
        {pages}
      </ScrollView>
    )
  }
  
  _refScrollView = view => {
    this.scrollView = view
  }

  _onScrollBeginDrag = e => {
    this.internals.isScrolling = true;
    this.props.scrollViewProps && 
    this.props.scrollViewProps.onScrollBeginDrag &&
    this.props.scrollViewProps.onScrollBeginDrag(e);
  }

  _onScrollEndDrag = e => {
    const {horizontal} = this.props;
    const {offset} = this.internals;
    const {contentOffset} = e.nativeEvent;
    const previousOffset = horizontal ? offset.x : offset.y;
    const newOffset = horizontal ? contentOffset.x : contentOffset.y;
    const {children, index} = this.state;
    if (
      previousOffset === newOffset &&
      (index === 0 || index === children.length - 1)
    ) {
      this.internals.isScrolling = false
    }
    this.props.scrollViewProps && 
    this.props.scrollViewProps.onScrollEndDrag &&
    this.props.scrollViewProps.onScrollEndDrag(e);
  }

  _onMomentumScrollEnd = e => {
    this.internals.isScrolling = false;
    // 不是 scrollView 的事件触发, 而是 scrollTo 触发的
    if (!e.nativeEvent.contentOffset) {
      if (this.state.dir === 'x') {
        e.nativeEvent.contentOffset = {
          x: e.nativeEvent.position * this.state.width
        }
      } else {
        e.nativeEvent.contentOffset = {
          y: e.nativeEvent.position * this.state.height
        }
      }
    }
    const offset = e.nativeEvent.contentOffset,
      state = this.state,
      dir = state.dir;
    if (!this.internals.offset) {
      this.internals.offset = {}
    }
    const diff = offset[dir] - this.internals.offset[dir];

    // 拖拽了一下, 没到切换位置, 又弹回原位了
    if (!diff) {
      this._afterMomentumScrollEnd(e);
      return;
    }

    // 有可能拖拽的超级快, 一次切换好几个卡片
    let index = state.index;
    const step = dir === 'x' ? state.width : state.height;
    index = parseInt(index + Math.round(diff / step));

    // 计算循环播放的 offset
    if (this.props.loop) {
      if (index <= -1) {
        index = state.total - 1
        offset[dir] = step * state.total
      } else if (index >= state.total) {
        index = 0
        offset[dir] = step
      }
    }
    this.internals.offset = offset;
    // 更新 state
    const newState = {}
    newState.index = index;
    this.setState(newState, () => {
      // 修正循环播放的 scroll offset
      if (this.props.loop) {
        const {index, width, height, total} = this.state;
        const lastIndex = index === total - 1;
        if (lastIndex || index === 0) {
          const horizontal = this.props.horizontal;
          this.scrollView.scrollTo({
            x: horizontal ? (lastIndex ? width * total : width) : 0,
            y: !horizontal ? (lastIndex ? height * total : height) : 0,
            animated: false
          });
        }
      }
      this._afterMomentumScrollEnd(e);
    })
  }
  
  _afterMomentumScrollEnd = e => {
    this.props.onIndexChanged(this.state.index);
    this._startAutoplay();
    this.props.scrollViewProps && 
    this.props.scrollViewProps.onMomentumScrollEnd &&
    this.props.scrollViewProps.onMomentumScrollEnd(e);
  }

  // 两个以上子组件, 绘制小圆点
  _renderPagination = () => {
    if (this.state.total <= 1) {
        return null
    }
    let dots = []
    const ActiveDot = this.props.activeDot || (
      <View
        style={[
          {
            backgroundColor: this.props.activeDotColor || '#007aff',
            width: 8,
            height: 8,
            borderRadius: 4,
            marginLeft: 3,
            marginRight: 3,
            marginTop: 3,
            marginBottom: 3
          },
          this.props.activeDotStyle
        ]}
      />
    )
    const Dot = this.props.dot || (
      <View
        style={[
          {
            backgroundColor: this.props.dotColor || 'rgba(0,0,0,.2)',
            width: 8,
            height: 8,
            borderRadius: 4,
            marginLeft: 3,
            marginRight: 3,
            marginTop: 3,
            marginBottom: 3
          },
          this.props.dotStyle
        ]}
      />
    )
    for (let i = 0; i < this.state.total; i++) {
      dots.push(
        i === this.state.index
          ? React.cloneElement(ActiveDot, { key: i })
          : React.cloneElement(Dot, { key: i })
      )
    }
    return (
      <View
        pointerEvents="none"
        style={[
          styles['pagination_' + this.state.dir],
          this.props.paginationStyle
        ]}
      >
        {dots}
      </View>
    )
  }

  render() {
    const {index, total, width, height, children} = this.state;
    const {
      loop,
      style,
      renderPagination,
      showsPagination
    } = this.props;
    let pages = [];
    const pageStyle = [styles.item, {width, height}];
    if (total > 1) {
      pages = Object.keys(children)
      if (loop) {
        pages.unshift(total - 1 + '')
        pages.push('0')
      }
      pages = pages.map((page, i) => {
        return (
          <View style={pageStyle} key={i}>
            {children[page]}
          </View>
        )
      })
    } else {
      pages = (
        <View style={pageStyle} key={0}>
          {children}
        </View>
      )
    }
    return (
      <View style={[styles.container, style]} onLayout={this._onLayout}>
        {this._renderScrollView(pages)}
        {showsPagination && (renderPagination
            ? renderPagination(index, total, this)
            : this._renderPagination()
        )}
      </View>
    )
  }
}

const styles = {
  // 容器
  container: {
    backgroundColor: 'transparent',
    position: 'relative',
    flex: 1
  },
  swiper: {
    backgroundColor: 'transparent'
  },
  item: {
    backgroundColor: 'transparent'
  },
  // 小圆点
  pagination_x: {
    position: 'absolute',
    bottom: 25,
    left: 0,
    right: 0,
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  pagination_y: {
    position: 'absolute',
    right: 15,
    top: 0,
    bottom: 0,
    flexDirection: 'column',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
}