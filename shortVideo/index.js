import React, {PureComponent} from 'react';
import {
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableWithoutFeedback,
  View,
  Image,
  Text,
} from 'react-native';
import vStore from 'react-native-video-store';
import PureVideo from 'react-native-pure-video';
import {ViewPagerList} from 'react-native-viewpager-list';

/**
 * 通用型 类似于抖音的 短视频组件
 * 可用 Props 参见下面的 defaultProps 注释
 * 依赖
 * react-native-pure-video
 * react-native-video-store
 * react-native-viewpager-list
 * 
 * <ShortVideo
 *   ...props
 *   ref="video"
 * />
 * 
 * ref.video
 *    reload()
 *    isPaused()
 *    playVideo()
 *    pauseVideo()
 *    toggleVideo()
 *    showMsg()
 * ref.video.pager
 *    react-native-viewpager-list 方法, 如
 *    renderItem()
 * 
 */
class ShortVideo extends PureComponent {
  state = {
    error:false
  }
  componentDidMount(){
    this._loadFirst();
  }
  componentWillUnmount(){
    this._clearPageTimer();
  }

  // 下拉刷新
  _lastPage = 0;
  _lastItem = -1;
  _nomore = false;
  _onRefresh = (resolve) => {
    this._loadFirst(resolve)
  }
  _loadFirst = (refreshResolve) => {
    const {onLoadInitData} = this.props;
    if (!onLoadInitData) {
      this._triggerError();
      return;
    }
    const isRefresh = Boolean(refreshResolve);
    onLoadInitData(isRefresh).catch(() => {
      return {list:[]}
    }).then(rs => {
      const {list=[], page=1, nomore=false, index=0} = rs||{};
      if (!Array.isArray(list) || !list.length) {
        if (isRefresh) {
          this.showMsg(this.props.tipsRefreshEmpty)
        } else {
          this._triggerError();
        }
        return;
      }
      preLoadImages(list);
      this._lastPage = page;
      this._nomore = nomore||false;
      this._lastItem = list.length - 1;
      this.pager.update(list, isRefresh ? 0 : index||0);
      if (isRefresh) {
        this._runPageChangeTimer(0);
        refreshResolve();
      }
    })
  }

  // 导出一个 reload 函数, 可在 errorMask 组件中调用
  reload = () => {
    if (this.state.error) {
      this.setState({error:false})
    }
    this._toggleSpinner(true, true);
    this._loadFirst();
  }
  _triggerError = () => {
    this._toggleSpinner(false);
    this.setState({error: true})
  }

  // 上拉加载
  _loadingMore = false;
  _loadMore = () => {
    const {onLoadPageData} = this.props;
    if (!onLoadPageData) {
      this._nomore = true;
      return;
    }
    if (this._loadingMore) {
      return;
    }
    const page = this._lastPage + 1;
    this._loadingMore = true;
    onLoadPageData(page).catch(() => {
      return [];
    }).then(list => {
      this._loadingMore = false;
      if (!Array.isArray(list) || !list.length) {
        this._nomore = true;
        return;
      }
      preLoadImages(list);
      this._lastPage = page;
      this._lastItem += list.length;
      this.pager.push(list);
    })
  }

  // 页面切换过程中
  _pageState = -1;
  _pageSelected = -1;
  _pageCurrent = -1;
  _pagePlayed = -1;
  _pageChecked = -1;
  _changeTimer = null;
  _flashTimer = null;
  _currentItem = null;
  _videoTried = 0;
  _videoSuccess = null;
  _videoWillPause = null;
  _videoPaused = true;
  _videoPreload = [];
  _touchStartPageY = 0;
  _touchMovedPageY = 0;
  _shouldHandleTouch = () => {
    return (!this.props.supportRefresh && this._pageCurrent === 0) 
      || this._pageCurrent === this._lastItem;
  }
  _shouldGiveTouch = () => {
    return true;
  }
  _onTouchStart = e => {
    this._touchStartPageY = e.nativeEvent.pageY;
  }
  _onTouchEnd = e => {
    this._touchMovedPageY = e.nativeEvent.pageY - this._touchStartPageY;
  }
  // 已到顶或到底了还继续拖拽
  _onReachEdeg = (bottom) => {
    this._touchReachNotice = true;
    if (bottom) {
      if (this._nomore) {
        this.showMsg(this.props.tipsReachEnd)
      } else if (this._loadingMore) {
        this.showMsg(this.props.tipsLoading)
      } else {
        this._loadMore();
      }
    } else {
      this.showMsg(this.props.tipsReachTop)
    }
  }
  // 页面切换 state 发生变化
  _onPageStateChange = ({state}) => {
    if (state === 0) {
      // 页面切换完成
      this._pageState = -1;
      if (!this.props.supportRefresh && this._pageCurrent === 0 && this._pageSelected === 0 && this._touchMovedPageY > 60) {
        this._onReachEdeg(false);
      } else if (this._pageCurrent === this._lastItem && this._pageSelected === this._lastItem && this._touchMovedPageY < -60) {
        this._onReachEdeg(true);
      }
      this._onPageChanged(this._pageSelected);
      return;
    }
    // state=1|2 (1为touchStart, 2为touchEnd)
    this._pageState = state;
    if (state === 1) {
      this._clearPageTimer();
      // 若视频处于暂停状态, 隐藏播放按钮, 播放按钮是全局的
      // 如果改为每个 Item 都有一个播放按钮的话, 就不需要这样了
      this._showPlayButton(false);
    }
  }
  _onPageSelected = ({position}) => {
    this._pageSelected = position;
    if (this._pageState === -1) {
      this._onPageChanged(position)
    }
  }
  _clearPageTimer = () => {
    this._clearFlashTimer();
    this._clearDoubleTimer();
    this._clearPageChangeTimer();
    this._toggleSpinner(false);
    this.showMsg();
  }

  // 切换页面完成, 为预防快速滑动, 做一个小延迟
  _onPageChanged = (position) => {
    // 测试: 正在播放 page3, 从 page3 上拉到 page4, 该函数触发, 且 video 已插入到了 page4
    // 在 _changeTimer 未执行前迅速按住, 触发 _onPageStateChange 清除了 _changeTimer
    // 1. page3 原本处于播放状态, 那么遮罩图为透明, 按住后顺势网上拉, 因为图片透明, video 也不在 page3了
    //    上拉会看到一个黑屏, 所以在 position!==this._pageCurrent 恢复遮罩, 这样上拉就能看到正确遮罩
    // 2. 按住后松手, 会再次触发本函数, position=4, 会再次执行 _changeTimer, 符合预期
    // 3. 按住上拉, 拖拽回 page3, 再次触发本函数, 原本 page3 就是播放页, 所以符合 position===this._pagePlayed
    //    但由于刚刚切换到 page4 已恢复了遮罩, 所以需要再次透明化遮罩, 此时为了遮罩与视频无缝衔接, 视频从头播放
    if (position !== this._pageCurrent) {
      this._pageCurrent = position;
      this._pauseVideo(true);
      // 恢复遮罩层
      const pageChecked = this._pageChecked;
      const checkedItem = pageChecked !== -1 && pageChecked !== position
                        ? this.pager.getItem(pageChecked) : null;
      if (checkedItem && checkedItem.__checked) {
        this._pageChecked = -1;
        this.pager.updateItem(pageChecked, {...checkedItem, __checked:false});
      }
    }
    if (position === this._pagePlayed) {
      this._startVideo(position, true);
      return;
    }
    this._clearPageChangeTimer();
    this._changeTimer = setTimeout(() => {
      this._changeTimer = null;
      this._pagePlayed = position;
      this._runPageChangeTimer(position);
    }, 200);
  }
  _clearPageChangeTimer = () => {
    if (this._changeTimer) {
      clearTimeout(this._changeTimer);
      this._changeTimer = null;
    }
  }
  _runPageChangeTimer = (position) => {
    // 更新当前页面 video
    const list = this.pager.getItem(), 
          total = list.length;
    if (position < total) {
      this._videoTried = 0;
      this._currentItem = list[position];
      this._updateVideo();
    }
    // 预加载前后视频
    if (this.props.cacheVideo) {
      this._preLoadVideo(list, position - 1);
      this._preLoadVideo(list, position + 1);
    }
    // 上拉加载
    if (position > total - 5) {
      this._loadMore();
    }
  }
  _preLoadVideo = (list, position) => {
    if (position < 0 || position > list.length - 1) {
      return;
    }
    const item = list[position], 
      videoId = String(item.item_id),
      srcs = item.video_url;
    if (this._videoPreload.includes(videoId) || srcs.length < 1) {
      return;
    }
    this._videoPreload.push(videoId);
    vStore.preload(videoId, srcs[0], 500);
  }

  // 更新 video source
  _updateVideo = () => {
    const item = this._currentItem,
       videoTried = this._videoTried,
       srcs = item.video_url;
    this._videoSuccess = false;
    if (this._videoTried > srcs.length - 1) {
      this._toggleSpinner(false);
      if (this._pagePlayed === this._pageCurrent) {
        this.showMsg(this.props.tipsVideoError);
      }
      return;
    }
    this._videoTried++;
    this._toggleSpinner(true);
    if (this.props.cacheVideo) {
      vStore.getProxyUrl(item.item_id, srcs[videoTried], true).then(uri => {
        this.video.setNativeProps({
          source: {uri}
        })
      });
    } else {
      const uri = srcs[videoTried];
      const headers = getRequestHeader(uri, true);
      const source = {uri};
      if (headers) {
        source.headers = headers;
      }
      this.video.setNativeProps({source}) 
    }
  }
  _onVideoLoad = () => {
    this._videoSuccess = true;
    const loadPos = this._pagePlayed;
    if (loadPos === this._pageCurrent) {
      this._startVideo(loadPos);
    }
  }
  _startVideo = (loadPos, reuse) => {
    const item = this.pager.getItem(loadPos);
    if (!item) {
      return;
    }
    if (!item.__checked) {
      this._toggleSpinner(false);
      if (!reuse) {
        this._pageChecked = loadPos;
        this.pager.updateItem(loadPos, {...item, __checked:true});
        this._willPlayVideo();
        return;
      }
      if (!this._videoSuccess) {
        return;
      }
      // 视频并未切换地址, 而是直接复用, 此时切换回来, 若立即透明化遮罩, 播放视频
      // 由于图片刚展示, 还未进入视觉就立即透明, 所以看起来会闪一下黑屏, 体验不好
      // 这里强制延迟一下, 此时视频还处于暂停状态, 先 seek 到开头
      this.video.setNativeProps({
        seek:0
      });
      this._clearFlashTimer();
      this._flashTimer = setTimeout(() => {
        this._pageChecked = loadPos;
        this.pager.updateItem(loadPos, {...item, __checked:true});
        this._willPlayVideo();
      }, 400);
    } else if (this._videoPaused) {
      // 恢复 _onPageStateChange 时隐藏的播放按钮
      this._showPlayButton(true)
    }
  }
  _willPlayVideo = () => {
    if (this._videoWillPause === null) {
      this.playVideo();
    } else {
      this.pauseVideo(this._videoWillPause);
    }
  }
  _clearFlashTimer = () => {
    if (this._flashTimer) {
      clearTimeout(this._flashTimer);
      this._flashTimer = null;
    }
  }

  // 点击暂停/播放视频 (可在父级组件调用)
  _playButtonShowed = false;
  playVideo = () => {
    this._videoWillPause = null;
    this._pauseVideo(false);
    this._showPlayButton(false);
  }
  pauseVideo = (notShowButton) => {
    if (this._videoSuccess) {
      this._videoWillPause = null;
      this._pauseVideo(true);
      this._showPlayButton(!notShowButton);
    } else {
      // 在 video 还未 loaded 时 pause video 
      // 会被 loaded 之后的 play 回调抵消掉, 所以这里仅记录值
      this._videoWillPause = Boolean(notShowButton);
    }
  }
  isPaused = () => {
    return this._videoPaused;
  }
  toggleVideo = () => {
    const paused = !this._videoPaused;
    this._pauseVideo(paused);
    this._showPlayButton(paused);
  }
  _pauseVideo = (paused) => {
    if (this.video && paused !== this._videoPaused){
      this._videoPaused = paused;
      this.video.setNativeProps({
        paused
      });
    }
  }
  _showPlayButton = (show) => {
    if (this.playBtn && show !== this._playButtonShowed) {
      this._playButtonShowed = show;
      this.playBtn.setNativeProps({
        style:{
          display: show ? 'flex' : 'none'
        }
      })
    }
  }

  // 提示信息 (可在父级组件调用)
  _tipMsgTimer = null;
  showMsg = (msg, timeout) => {
    this._clearMsgTimer();
    if (!this.tipMsg) {
      return;
    }
    this.tipMsg.showMsg(msg);
    if (msg) {
      this._tipMsgTimer = setTimeout(() => {
        this._tipMsgTimer = null;
        this.tipMsg.showMsg(null);
      }, timeout||2000);
    }
  }
  _clearMsgTimer = () => {
    if (this._tipMsgTimer) {
      clearTimeout(this._tipMsgTimer);
      this._tipMsgTimer = null;
    }
  }

  // 显示/隐藏 spinner
  _spinnerTimer = null;
  _spinnerIsShow = true;
  _toggleSpinner = (show, immediately) => {
    this._clearSpinnerTimer();
    if (show) {
      if (immediately) {
        this._runSpinnerTimer(true);
        return;
      }
      this._spinnerTimer = setTimeout(() => {
        this._spinnerTimer = null;
        this._runSpinnerTimer(true)
      }, 350);
    } else {
      this._runSpinnerTimer(false)
    }
  }
  _clearSpinnerTimer = () => {
    if (this._spinnerTimer) {
      clearTimeout(this._spinnerTimer);
      this._spinnerTimer = null;
    }
  }
  _runSpinnerTimer = (show) => {
    if (!this.loader || show === this._spinnerIsShow) {
      return;
    }
    this._spinnerIsShow = show;
    this.loader.setNativeProps({animating: show})
  }

  // 读取 Error 组件
  _renderError = () => {
    if (!this.state.error) {
      return null;
    }
    const {errorMask:Mask} = this.props;
    let Error = Mask ? (
      React.isValidElement(Mask) ? Mask : <Mask />
    ) : null;
    if (Error !== null) {
      return <View style={StyleSheet.absoluteFill}>{Error}</View>
    }
    return <TouchableWithoutFeedback onPress={this.reload}>
      <View style={styles.mask}>
        <Text style={{color:"#666"}}>{this.props.tipsNetError}</Text>
      </View>
    </TouchableWithoutFeedback>
  }

  // 读取 video 视频
  _renderVideo = () => {
    return <PureVideo 
      style={styles.itemFull}
      ref={r => this.video = r}
      onLoad={this._onVideoLoad}
      onError={this._updateVideo}
      paused={true}
      repeat={true}
      resizeMode="cover"
    />
  }

  // 读取 video 覆盖层
  _itemProps = {};
  _delayDoubleTap = 200;
  _doublePressTimer = null;
  _doubleSignalTap = null;
  _updateItemProps = (itemProps) => {
    const {delayDoubleTap, ..._itemProps} = itemProps;
    if (delayDoubleTap) {
      this._delayDoubleTap = delayDoubleTap;
    }
    if (_itemProps.onDoubleTap) {
      _itemProps.onPress = this._onItemPress;
      this._doubleSignalTap = itemProps.onPress||this.toggleVideo;
    } else if (!_itemProps.onPress) {
      _itemProps.onPress = this.toggleVideo;
    }
    this._itemProps = _itemProps;
  }
  _renderItem = (item, index) => {
    const checked = item.__checked;
    return <TouchableWithoutFeedback {...this._itemProps}><View style={styles.itemFull}>
      <Image 
        source={{uri: item.cover_url[0]}}
        style={[StyleSheet.absoluteFill, {opacity: checked ? 0 : 1}]}
        resizeMode="cover"
      />
      {this.props.renderItem(item, index)}
   </View></TouchableWithoutFeedback>
  }
  _onItemPress = (e) => {
    if (this._doublePressTimer) {
      clearTimeout(this._doublePressTimer);
      this._doublePressTimer = null;
      this._itemProps.onDoubleTap(e);
    } else {
      this._doublePressTimer = setTimeout(() => {
        this._doublePressTimer = null;
        this._doubleSignalTap(e);
      }, this._delayDoubleTap)
    }
  }
  _clearDoubleTimer = () => {
    if (this._doublePressTimer) {
      clearTimeout(this._doublePressTimer);
      this._doublePressTimer = null;
    }
  }

  // 按住子视图中的 touchAble 组件切换 page, 松开手指后仍会触发 onPress 事件
  // 显然这不符合预期, 拖拽应阻止 press 事件, 通过该属性阻止子视图 touchStart, 
  _onMoveShouldSetResponderCapture = () => {
    return this._pageState !== -1;
  }

  render(){
    const {
      style, 
      itemProps,
      supportRefresh, 
      renderPlayButton:PlayButton
    } = this.props;
    const Play = PlayButton ? (
      React.isValidElement(PlayButton) ? PlayButton : <PlayButton />
    ) : null;
    this._updateItemProps(itemProps);
    return <View 
      style={[style, styles.container]}
      onMoveShouldSetResponder={this._shouldHandleTouch}
      onResponderTerminationRequest={this._shouldGiveTouch}
      onResponderGrant={this._onTouchStart}
      onResponderRelease={this._onTouchEnd}
    >
      <ViewPagerList
        ref={r => this.pager = r}
        style={StyleSheet.absoluteFill}
        offscreenPageLimit={2}
        renderItem={this._renderItem}
        getBackground={this._renderVideo}
        onPageSelected={this._onPageSelected}
        onPageScrollStateChanged={this._onPageStateChange}
        onMoveShouldSetResponderCapture={this._onMoveShouldSetResponderCapture}
        refreshControl={supportRefresh ? <RefreshControl
          onRefresh={this._onRefresh}
        /> : null}
      />
      <View pointerEvents="none" style={styles.mask}>
        <ActivityIndicator 
          color="#fff"
          style={styles.loading}
          animating={this._spinnerIsShow}
          ref={r => this.loader = r}
        />
        {Play ? (<View
          style={{display:"none"}}
          ref={r => this.playBtn = r}
        >{Play}</View>) : null}
        <TipMsg ref={r => this.tipMsg = r}/>
      </View>
      {this._renderError()}
    </View>
  }
}

const TipMsg = React.forwardRef((props, ref) => {
  const [msg, showMsg] = React.useState();
  React.useImperativeHandle(ref, () => {
    return {
      showMsg
    };
  });
  return <Text style={[styles.tipMsg, {opacity:msg ? 1 : 0}]}>{msg}</Text>
});


// ShortVideo 可用 props
ShortVideo.defaultProps = {
  // 视频加载后是否立即播放
  paused: false,

  // 是否使用 vStore 缓存视频
  cacheVideo: true,

  // 是否支持下拉刷新
  supportRefresh:false,

  /**
   * 加载第一组数据, 返回 Promise
   * onLoadInitData = (isRefresh) => {
   *   return Promise.resolve({
   *     list:[item,item,...], //数据列表
   *     page:Int,     //当前数据已加载到的页数(比如首次可以一次加载两页数据,则page=2)
   *     nomore:false, //是否已加载所有数据,若一次性加载完了,就不再上拉加载了
   *     index:Int,    //加载完成后,直接播放下标为index的视频, 若参数isRefresh=true, index总为0, 无需返回
   *   })
   * }
   * 
   * 其中数据列表中的单项数据
   * item={
   *    item_id:"",    //唯一ID
   *    cover_url:[],  //封面图,可指定多个做 fallback
   *    video_url:[]   //视频地址,可指定多个做 fallback
   *    .....          //其他任意数据, 可在 renderItem() 中使用
   * }
   */
  onLoadInitData:null,

  /**
   * 加载指定页数的数据, 用于上拉自动加载, 直接返回该页的数据列表即可
   * onLoadPageData = (page) => {
   *   return Promise.resolve([
   *     item, item
   *   ])
   * }
   */
  onLoadPageData:null,

  // 播放按钮(RN Component)
  renderPlayButton:null,

  // onLoadInitData 发生错误时的显示组件
  errorMask: null,
 
  /**
   * 读取在视频上方覆盖其他组件
   * Function(item, index)
   * item:  当前视频单项数据
   * index: 数据下标
   */
  renderItem:() => null,

  /**
   * renderItem() 返回的组件 会和 Video 组件一起嵌套在 TouchableWithoutFeedback 中
   * 默认情况下, 仅绑定了 onPress 为 toggleVideo, 可自定义 props, 
   * 支持 TouchableWithoutFeedback 所有属性 和 额外属性
   * 1. 默认 onPress 绑定的 toggleVideo 可重置覆盖
   * 2. 额外支持  onDoubleTap / onPlay / onPause 三个事件监听
   * 3. 额外支持  delayDoubleTap 设置双击间隔时长(毫秒)
   */
  itemProps: {},

  // 提示消息
  tipsRefreshEmpty: "暂无新的推荐",
  tipsReachTop: "已经到顶了哦",
  tipsReachEnd: "已经到底了哦",
  tipsLoading: "正在加载中",
  tipsVideoError: "加载视频失败",
  tipsNetError:"加载失败，点击屏幕重试"
}

const styles = StyleSheet.create({
  container:{
    alignItems:"center",
    justifyContent:"center",
  },
  mask:{
    ...StyleSheet.absoluteFill,
    alignItems:"center",
    justifyContent:"center",
  },
  loading:{
    position:"absolute",
    opacity:.75,
  },
  tipMsg:{
    position:"absolute",
    paddingHorizontal:8,
    paddingVertical:6,
    borderRadius:4,
    backgroundColor:'rgba(0,0,0,.6)',
    color:'#fff',
    fontSize:12,
  },
  itemFull:{
    flex:1,
  },
});

/**
 * 导出两个工具函数, 可设置 Image/Video 的请求 header
 * 如果 ShortVideo.props.cacheVideo = true, 
 * 也可自行使用 vStore 设置 Video 的 request header
 * 
 * putImgRequestHeaders({
 *    ".qq.com": {
 *        "Key": "Value",
 *    },
 *    ".baidu.com":{
 *        "User-Agent": "",
 *    }
 * })
 * 
 * putVideoRequestHeaders({
 *    ".qq.com": {
 *        "Key": "Value",
 *    },
 *    ".baidu.com":{
 *        "User-Agent": "",
 *    }
 * })
 * 
 */
let HEADERS_IMG = null, HEADERS_VIDEO = null;
export function putImgRequestHeaders(headers) {
  HEADERS_IMG = typeof headers === 'object' && Object.keys(headers).length 
    ? headers : null;
}
export function putVideoRequestHeaders(headers) {
  if (!(typeof headers === 'object' && Object.keys(headers).length)) {
    HEADERS_VIDEO = null;
    return;
  }
  HEADERS_VIDEO = headers;
  for (let key in headers) {
    vStore.setDomainHeaders(key, headers[key])  
  }
}

// 获取指定 uri 的 request header
function getRequestHeader(uri, video) {
  const headers = video ? HEADERS_VIDEO : HEADERS_IMG;
  if (!headers) {
    return null;
  }
  const match = uri.match("^(https?:)?//([^/]+)/");
  if (!match) {
    return null;
  }
  const host = match[2];
  for (let key in headers) {
    if (host.endsWith(key)) {
      return {...headers[key]};
    }
  }
  return null;
}

// 批量预加载 list 中的 cover_url
const _preLoadImgs = [];
let _preLoadImgsTask = false;
function preLoadImages(list) {
  let slice = [], urls;
  const chunk = 5, len = list.length;
  for (let i=0; i<len; i++) {
    urls = list[i].cover_url;
    if (!Array.isArray(urls) || !urls.length) {
      continue;
    }
    if (slice.push(urls[0]) === chunk) {
      _preLoadImgs.push(slice);
      slice = [];
    }
  }
  if (slice.length) {
    _preLoadImgs.push(slice);
  }
  if (!_preLoadImgsTask) {
    runPreloadImgsTask();
  }
}
function runPreloadImgsTask() {
  if (!_preLoadImgs.length) {
    _preLoadImgsTask = false;
    return;
  }
  _preLoadImgsTask = true;
  const task = [];
  _preLoadImgs.shift().forEach(url => {
    task.push(
      preloadImgUrl(url, getRequestHeader(url))
    )
  })
  return Promise.all(task).then(runPreloadImgsTask)
}
function preloadImgUrl(url, headers) {
  return new Promise((resolve, reject) => {
    headers ? Image.getSizeWithHeaders(url, headers, resolve, reject) 
      : Image.getSize(url, resolve, reject)
  }).catch(() => {
    return null;
  })
}

export default ShortVideo;