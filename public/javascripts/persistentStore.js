// File: persistentStore.js
// Description: Handles persistent storage on the browser using HTML5
// localStorage
// Author: Kingston Tam

var persistentStore = {
  persistentStoreEnabled: false,
  localStorageKey: null,
  data: null,

  defaults: {
    
  },
  
  initialize: function(profileId) {
    this.persistentStoreEnabled = !!localStorage;
    this.localStorageKey = "data_" + profileId;
    if (!this.persistentStoreEnabled) {
      this.data = this.defaults;
    } else {
      try {
        this.data = $.parseJSON(localStorage.getItem(this.localStorageKey));
      } catch(err) {
        // Ignore and keep on going (it will be reset)
      }
      if (this.data === null) this.data = this.defaults;
    }
  },

  getValue: function(key) {
    if (!this.data.hasOwnProperty(key)) this.data[key] = this.defaults[key];
    return this.data[key];
  },

  setValue: function(key, value) {
    this.data[key] = value;
    if (persistentStoreEnabled) {
      localStorage.setItem(this.localStorageKey, $.toJSON(this.data));
    }
  },
};
