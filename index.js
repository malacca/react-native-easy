module.exports = {
  // methods
  get app(){
    return require('./app');
  },
  get font(){
    return require('./utils/normalizeText');
  },
  get imageSize(){
    return require('./utils/imageSize').default;
  },
  get gallery(){
    return require('./utils/gallery');
  },
  get zero(){
    return require('./utils/zero');
  },
  get splitStyle(){
    return require('./utils/splitStyle').default;
  },
  get useInterval(){
    return require('./utils/useInterval').default;
  },
  get bezier(){
    return require('./utils/bezier').default;
  },

  
  // components
  get ImagePlus(){
    return require('./components/ImagePlus').default;
  },
  get Button(){
    return require('./components/Button').default;
  },
  get Icon(){
    return require('./components/Icon').default;
  },
  get Countdown(){
    return require('./components/Countdown').default;
  },
  get Empty(){
    return require('./components/Empty').default;
  },
  get Offline(){
    return require('./components/Offline').default;
  },
  get Parabola(){
    return require('./components/Parabola').default;
  },
  get CodeInput(){
    return require('./components/CodeInput').default;
  },
  get Cursor(){
    return require('./components/Cursor').default;
  },
  get Resend(){
    return require('./components/Resend').default;
  },
  get Confetti(){
    return require('./components/Confetti').default;
  },
}