/*==================================================
 *  KeeperFinder.DBChangeListener
 *==================================================
 */
 
KeeperFinder.DBChangeListener = function(msgDatabase) {
    this.msgDatabase = msgDatabase;
}

KeeperFinder.DBChangeListener.prototype.onAnnouncerGoingAway = function(instigator) {
    this.msgDatabase.RemoveListener(this);
};

KeeperFinder.DBChangeListener.prototype.onHdrAdded = function(hdrChanged, parentKey, flags, instigator) {
    KeeperFinder.log("onHdrAdded");
};

KeeperFinder.DBChangeListener.prototype.onHdrChange = function(hdrChanged, oldFlags, newFlags, instigator) {
    KeeperFinder.log("onHdrChange");
};

KeeperFinder.DBChangeListener.prototype.onHdrDeleted = function(hdrChanged, parentKey, flags, instigator) {
    KeeperFinder.log("onHdrDeleted");
};

KeeperFinder.DBChangeListener.prototype.onJunkScoreChanged = function(instigator) {
    KeeperFinder.log("onJunkScoreChanged");
};

KeeperFinder.DBChangeListener.prototype.onParentChanged = function(keyChanged, oldParent, newParent, instigator) {
    KeeperFinder.log("onParentChanged");
};

KeeperFinder.DBChangeListener.prototype.onReadChanged = function(instigator) {
    KeeperFinder.log("onReadChanged");
};
