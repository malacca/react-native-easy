const SPACE_LOW = "\u200b";
const SPACE_HIG = "\u200c";
const SPACE_WRD = "\u200d";
const SPACE_SPT = "\u200e";
const txtToBin = txt => txt.split('').map( char => char.charCodeAt(0).toString(2) ).join(' ');
const binToTxt = bin => bin.split(' ').map( num => String.fromCharCode(parseInt(num, 2)) ).join('');

const encode = (data) => {
  return SPACE_SPT + txtToBin(data).split('').map((str) => {
    switch (str) {
      case "0":
        return SPACE_LOW;
      case "1":
        return SPACE_HIG
      default:
        return SPACE_WRD
    }
  }).join('') + SPACE_SPT;
};

const decode = (data) => {
  let len = data.length,
      find = false,
      error = false,
      bins = [],
      bin = '',
      k = 0,
      chr;
  while (k < len) {
    chr = data.charAt(k);
    if (chr === SPACE_SPT) {
      if (find) {
        // 零宽字符结束
        if (!error) {
          bins.push(bin);
        }
        find = false;
      } else {
        // 零宽字符开始
        find = true;
        error = false;
      }
      bin = '';
    } else if (find && !error) {
      switch(chr) {
        case SPACE_LOW:
          bin += "0";
          break;
        case SPACE_HIG:
          bin += "1";
          break;
        case SPACE_WRD:
          bin += " ";
          break;
        default:
          error = true;
          break;
      }
    }
    k++;
  }
  len = bins.length;
  if (!len) {
    return null;
  }
  bins = bins.map(bin => binToTxt(bin));
  return len > 1 ? bins : bins[0];
}

module.exports = {
  encode,
  decode
};