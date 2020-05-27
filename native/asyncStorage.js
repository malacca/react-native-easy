import {NativeModules}  from 'react-native';

const RCTAsyncStorage = NativeModules.AsyncSQLiteDBStorage 
  || NativeModules.AsyncLocalStorage 
  || NativeModules.RNC_AsyncSQLiteDBStorage;

/**
 * 本地数据存储
 * https://reactnative.cn/docs/0.58/asyncstorage
 */
const AsyncStorage = {
  _getRequests:[],
  _getKeys:[],
  _immediate:null,

  getItem: function(key, callback) {
    return new Promise((resolve, reject) => {
      RCTAsyncStorage.multiGet([key], function(errors, result) {
        const value = result && result[0] && result[0][1] ? result[0][1] : null;
        const errs = convertErrors(errors);
        callback && callback(errs && errs[0], value);
        if (errs) {
          reject(errs[0]);
        } else {
          resolve(value);
        }
      });
    });
  },

  setItem: function(key, value, callback) {
    return new Promise((resolve, reject) => {
      RCTAsyncStorage.multiSet([[key, value]], function(errors) {
        const errs = convertErrors(errors);
        callback && callback(errs && errs[0]);
        if (errs) {
          reject(errs[0]);
        } else {
          resolve(null);
        }
      });
    });
  },

  removeItem: function(key, callback) {
    return new Promise((resolve, reject) => {
      RCTAsyncStorage.multiRemove([key], function(errors) {
        const errs = convertErrors(errors);
        callback && callback(errs && errs[0]);
        if (errs) {
          reject(errs[0]);
        } else {
          resolve(null);
        }
      });
    });
  },

  mergeItem: function(key, value, callback) {
    return new Promise((resolve, reject) => {
      RCTAsyncStorage.multiMerge([[key, value]], function(errors) {
        const errs = convertErrors(errors);
        callback && callback(errs && errs[0]);
        if (errs) {
          reject(errs[0]);
        } else {
          resolve(null);
        }
      });
    });
  },

  clear: function(callback) {
    return new Promise((resolve, reject) => {
      RCTAsyncStorage.clear(function(error) {
        callback && callback(convertError(error));
        if (error && convertError(error)) {
          reject(convertError(error));
        } else {
          resolve(null);
        }
      });
    });
  },

  getAllKeys: function(callback) {
    return new Promise((resolve, reject) => {
      RCTAsyncStorage.getAllKeys(function(error, keys) {
        callback && callback(convertError(error), keys);
        if (error) {
          reject(convertError(error));
        } else {
          resolve(keys);
        }
      });
    });
  },

  flushGetRequests: function() {
    const getRequests = this._getRequests;
    const getKeys = this._getKeys;
    this._getRequests = [];
    this._getKeys = [];

    RCTAsyncStorage.multiGet(getKeys, function(errors, result) {
      const map = {};
      result && result.forEach(([key, value]) => {
        map[key] = value;
        return value;
      });
      const reqLength = getRequests.length;
      for (let i = 0; i < reqLength; i++) {
        const request = getRequests[i];
        const requestKeys = request.keys;
        const requestResult = requestKeys.map(key => [key, map[key]]);
        request.callback && request.callback(null, requestResult);
        request.resolve && request.resolve(requestResult);
      }
    });
  },

  multiGet: function(keys, callback) {
    if (!this._immediate) {
      this._immediate = setImmediate(() => {
        this._immediate = null;
        this.flushGetRequests();
      });
    }
    const getRequest = {
      keys: keys,
      callback: callback,
      // do we need this?
      keyIndex: this._getKeys.length,
      resolve: null,
      reject: null,
    };
    const promiseResult = new Promise((resolve, reject) => {
      getRequest.resolve = resolve;
      getRequest.reject = reject;
    });
    this._getRequests.push(getRequest);
    // avoid fetching duplicates
    keys.forEach(key => {
      if (this._getKeys.indexOf(key) === -1) {
        this._getKeys.push(key);
      }
    });
    return promiseResult;
  },


  multiSet: function(keyValuePairs, callback) {
    return new Promise((resolve, reject) => {
      RCTAsyncStorage.multiSet(keyValuePairs, function(errors) {
        const error = convertErrors(errors);
        callback && callback(error);
        if (error) {
          reject(error);
        } else {
          resolve(null);
        }
      });
    });
  },


  multiRemove: function(keys, callback) {
    return new Promise((resolve, reject) => {
      RCTAsyncStorage.multiRemove(keys, function(errors) {
        const error = convertErrors(errors);
        callback && callback(error);
        if (error) {
          reject(error);
        } else {
          resolve(null);
        }
      });
    });
  },


  multiMerge: function(keyValuePairs, callback) {
    return new Promise((resolve, reject) => {
      RCTAsyncStorage.multiMerge(keyValuePairs, function(errors) {
        const error = convertErrors(errors);
        callback && callback(error);
        if (error) {
          reject(error);
        } else {
          resolve(null);
        }
      });
    });
  },
};

function convertErrors(errs) {
  if (!errs) {
    return null;
  }
  return (Array.isArray(errs) ? errs : [errs]).map(e => convertError(e));
}

function convertError(error) {
  if (!error) {
    return null;
  }
  const out = new Error(error.message);
  out.key = error.key; // flow doesn't like this :(
  return out;
}

module.exports = AsyncStorage;