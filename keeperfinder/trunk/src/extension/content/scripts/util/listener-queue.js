/*==================================================
 *  ListenerQueue
 *==================================================
 */

KeeperFinder.ListenerQueue = function(wildcardHandlerName) {
    this._listeners = [];
    this._wildcardHandlerName = wildcardHandlerName;
};

KeeperFinder.ListenerQueue.prototype.add = function(listener) {
    this._listeners.push(listener);
};

KeeperFinder.ListenerQueue.prototype.remove = function(listener) {
    var listeners = this._listeners;
    for (var i = 0; i < listeners.length; i++) {
        if (listeners[i] == listener) {
            listeners.splice(i, 1);
            break;
        }
    }
};

KeeperFinder.ListenerQueue.prototype.fire = function(handlerName, args) {
    var listeners = [].concat(this._listeners);
    for (var i = 0; i < listeners.length; i++) {
        var listener = listeners[i];
        if (handlerName in listener) {
            try {
                listener[handlerName].apply(listener, args);
            } catch (e) {
                KeeperFinder.Debug.exception("Error firing event of name " + handlerName, e);
            }
        } else if (this._wildcardHandlerName != null &&
            this._wildcardHandlerName in listener) {
            try {
                listener[this._wildcardHandlerName].apply(listener, [ handlerName ]);
            } catch (e) {
                KeeperFinder.Debug.exception("Error firing event of name " + handlerName + " to wildcard handler", e);
            }
        }
    }
};
