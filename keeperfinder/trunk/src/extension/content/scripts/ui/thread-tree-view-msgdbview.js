/*======================================================================
 *  Thread Tree View
 *======================================================================
 */

KeeperFinder.ThreadTreeView.prototype.close = function() {
    this.dbView.close();
};

KeeperFinder.ThreadTreeView.prototype.getCommandStatus = function() {
    return true;
};

KeeperFinder.ThreadTreeView.prototype.navigateStatus = function(motion) {
    return true;
};

