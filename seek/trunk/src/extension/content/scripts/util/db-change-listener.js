/*==================================================
 *  Seek.DBChangeListener
 *==================================================
 */
 
Seek.DBChangeListener = function(msgDatabase) {
    this.msgDatabase = msgDatabase;
}

Seek.DBChangeListener.prototype.QueryInterface = function(iid) {
    if (iid.equals(Components.interfaces.nsIDBChangeListener) ||
        iid.equals(Components.interfaces.nsISupports)) {
        return this;
    }
    throw Components.interfaces.NS_ERROR_NOINTERFACE;
};

Seek.DBChangeListener.prototype.onAnnouncerGoingAway = function(instigator) {
    this.msgDatabase.RemoveListener(this);
};

Seek.DBChangeListener.prototype.onHdrAdded = function(hdrChanged, parentKey, flags, instigator) {
    //Seek.log("onHdrAdded");
};

Seek.DBChangeListener.prototype.onHdrChange = function(hdrChanged, oldFlags, newFlags, instigator) {
    //Seek.log("onHdrChange");
};

Seek.DBChangeListener.prototype.onHdrDeleted = function(hdrChanged, parentKey, flags, instigator) {
    //Seek.log("onHdrDeleted");
};

Seek.DBChangeListener.prototype.onJunkScoreChanged = function(instigator) {
    //Seek.log("onJunkScoreChanged");
};

Seek.DBChangeListener.prototype.onParentChanged = function(keyChanged, oldParent, newParent, instigator) {
    //Seek.log("onParentChanged");
};

Seek.DBChangeListener.prototype.onReadChanged = function(instigator) {
    //Seek.log("onReadChanged");
};
