/**
 * Handler for scheduled tasks.
 *
 * @constructor
 *
 * @param {string} dbName A name for this instance. Sched5 will use a database by this name.
 * @param {function(Object)} cronCallback A function to run on an object at the scheduled time.
 * @param {function(Object[])} missCallback A function to run on an array of objects that were not
 *    run on their scheduled time.
 */
Sched5 = new function(dbName, cronCallback, missCallback) {
  this._dbName = dbName;
  this._cronCallback = cronCallback;
  this._missCallback = missCallback;
  this._db = null;
  initDb(dbName);
  handleMisses();
  startPolling();
}

/**
 * Initialize the scheduler.
 *
 * @param {function(boolean)} callback Success/failure callback.
 */
Sched5.prototype.initDb = function(callback) {
  var indexedDB = window.indexedDB || window.webkitIndexedDB ||
      window.mozIndexedDB || window.msIndexedDB; 
  if (!indexedDB) {
    fail('Sched5 required a browser with IndexedDb support');
  }
  var request = indexedDB.open(_dbName);
  request.onsuccess = onSuccess(callback);
  request.onerror = onError(callback);
}

function fail(callback, message) {
  callback(false);
  console.error(message);
}

Sched5.prototype.onSuccess = function(request, callback) {
  return function(event) {
    callback(true);
    this._db = request.result;
  }
}

Sched5.prototype.onError =  function(callback) {
  return function(event) {
    fail(callback, 'Failed with errorCode ' + event.errorCode);
    callback(true);
  }
}
