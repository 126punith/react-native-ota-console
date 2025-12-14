// Optional import
let NetInfo = null;
try {
  NetInfo = require('@react-native-community/netinfo');
} catch (e) {
  console.warn('@react-native-community/netinfo not available');
}

class NetworkMonitor {
  constructor() {
    this.isWifi = false;
    this.isConnected = false;
    this.listeners = [];
    this.unsubscribe = null;
  }

  startMonitoring(callback) {
    if (!NetInfo) {
      console.warn('NetInfo not available, network monitoring disabled');
      return;
    }
    
    // Check initial state
    NetInfo.fetch().then(state => {
      this.updateState(state);
      if (callback) callback(this.isWifi, this.isConnected);
    }).catch(err => {
      console.warn('NetInfo.fetch failed:', err);
    });

    // Subscribe to network state changes
    this.unsubscribe = NetInfo.addEventListener(state => {
      this.updateState(state);
      this.listeners.forEach(listener => listener(this.isWifi, this.isConnected));
      if (callback) callback(this.isWifi, this.isConnected);
    });
  }

  updateState(state) {
    this.isConnected = state.isConnected;
    this.isWifi = state.type === 'wifi' && state.isConnected;
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  stopMonitoring() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners = [];
  }

  async checkWifiAsync() {
    if (!NetInfo) {
      return false;
    }
    try {
      const state = await NetInfo.fetch();
      return state.type === 'wifi' && state.isConnected;
    } catch (err) {
      console.warn('NetInfo.fetch failed:', err);
      return false;
    }
  }

  async checkConnectionAsync() {
    if (!NetInfo) {
      return false;
    }
    try {
      const state = await NetInfo.fetch();
      return state.isConnected;
    } catch (err) {
      console.warn('NetInfo.fetch failed:', err);
      return false;
    }
  }
}

export default NetworkMonitor;

