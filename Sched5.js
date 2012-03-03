/**
 * Handler for scheduled tasks.
 *
 * @constructor
 *
 * @param {string} dbName A name for this instance. Sched5 will use a database by this name.
 * @param {function(Object)} scheduledCallback A function to run on an object at the scheduled time.
 * @param {function(Object[])} missCallback A function to run on an array of objects that were not
 *    run on their scheduled time.
 */
Sched5 = function(dbName, scheduledCallback, missCallback) {
  this._dbName = dbName;
  this._scheduledCallback = scheduledCallback;
  this._missCallback = missCallback;
  this.STORE_NAME = "scheduledItems";
}

/**
 * Initialize the scheduler.
 *
 * @param {function(boolean)} callback Success/failure callback.
 */
Sched5.prototype.init = function(callback) {
  this.initDb(callback);
  this.handleMisses();
  this.startPolling();
}

Sched5.prototype.initDb = function(callback) {
  // Only Chrome is supported officially. Chrome's indexedDB implementation is a bit different than
  // other browsers', pull requests to handle multi browser are welcome.
  var indexedDB = window.indexedDB || window.webkitIndexedDB;
  if (!indexedDB) {
    fail('Sched5 requires a browser with IndexedDB support');
  }
  if ('webkitIndexedDB' in window) {
    window.IDBTransaction = window.webkitIDBTransaction;
    window.IDBKeyRange = window.webkitIDBKeyRange;
  }
  var request = indexedDB.open(this._dbName);
  request.onsuccess = function(event) {

    var db = event.target.result;
    this._db = db;

    // Generic error handler.
    db.onerror = function(e) {
      console.error(event.target.errorCode);
    };

    var v = "1.0";
    if (v != db.version) {
      var setVrequest = db.setVersion(v);

      // onsuccess is the only place we can create Object Stores
      setVrequest.onfailure = db.onerror;
      setVrequest.onsuccess = function(e) {
        var store = db.createObjectStore(this.STORE_NAME,
          {keyPath: "timeStamp"});
        callback(true);
      };
    } else {
      callback(true);
    }
  }.bind(this);
  request.onerror = this.onError(callback);
}

function fail(callback, message) {
  callback(false);
  console.error(message);
}

/**
 * Adds an item to the scheduler. The scheduler will run scheduledCallback on item at timeStamp.
 *
 * @param {Object} An item.
 * @param {number} timeStamp time in milliseconds since Jan 1 1970 at which to schedule the item.
 * @param {function(boolean)} callback A success/failure callback.
 */
Sched5.prototype.schedule = function(item, timeStamp, callback) {
  var db = this._db;
  var trans = db.transaction([this.STORE_NAME], IDBTransaction.READ_WRITE);
  var store = trans.objectStore(this.STORE_NAME);
  var request = store.put({
    "item": item,
    "timeStamp" : timeStamp
  });

  request.onsuccess = this.onSuccess(callback);
  request.onerror = this.onError(callback);
}

Sched5.prototype.getAllItems = function() {
  var db = this._db;
  var trans = db.transaction([this.STORE_NAME], IDBTransaction.READ_WRITE);
  var store = trans.objectStore(this.STORE_NAME);

  // Get everything in the store;
  var keyRange = IDBKeyRange.lowerBound(0);
  var cursorRequest = store.openCursor(keyRange);

  cursorRequest.onsuccess = function(e) {
    var result = e.target.result;
    if(!!result == false)
      return;

    console.log(result.value);
    result.continue();
  };
}

Sched5.prototype.onSuccess = function(callback) {
  return function(event) {
    callback(true);
  }
}

Sched5.prototype.onError =  function(callback) {
  return function(event) {
    fail(callback, 'Failed with errorCode ' + event.target.errorCode);
    callback(true);
  };
}

// TODO:

Sched5.prototype.handleMisses = function(){}
Sched5.prototype.startPolling = function(){}
