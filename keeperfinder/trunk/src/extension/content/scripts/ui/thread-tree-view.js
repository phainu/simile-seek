/*======================================================================
 *  Thread Tree View
 *======================================================================
 */
KeeperFinder.ThreadTreeView = function(dbView, msgFolder, baseMsgKeyArray, settings) {
    settings = settings || {};
    
    this.wrappedJSObject = this;
    this.msgFolder = msgFolder;
    this.msgDatabase = msgFolder.getMsgDatabase(msgWindow);
    
    this.dbView = dbView;
    
    if (!("sortColumnId" in settings)) {
        settings.sortColumnId = "dateCol";
        settings.sortAscending = false;
    } else if (!("sortAscending" in settings)) {
        settings.sortAscending = true;
    }
    
    if (!("showThreads" in settings)) {
        settings.showThreads = false;
    }
    if (!("showNewMessages" in settings)) {
        settings.showNewMessages = false;
    }
    
    this._settings = settings;
    this._baseMsgKeyArray = baseMsgKeyArray;
    this._msgKeyToRecord = {};
    this._processedThreads = {};
    
    this._atomService = Components.classes["@mozilla.org/atom-service;1"].
        getService(Components.interfaces.nsIAtomService);
        
    this._headerParser = Components.classes["@mozilla.org/messenger/headerparser;1"].
        getService(Components.interfaces.nsIMsgHeaderParser);
    
    this._dateFormat = Components.classes["@mozilla.org/intl/scriptabledateformat;1"].
        getService(Components.interfaces.nsIScriptableDateFormat);
        
    this._initialize();
};

KeeperFinder.ThreadTreeView._priorityLabels = [
    "", //"notset",
    "", //"none",
    "Lowest",
    "Low",
    "", //"normal",
    "High",
    "Highest"
];

KeeperFinder.ThreadTreeView.prototype = {
    get currentlyDisplayedMessage() {
        return this.selection.currentIndex;
    },
    get db() {
        return this.msgDatabase;
    },
    get viewIndexForFirstSelectedMsg() {
        return this.selection.currentIndex;
    },
    get hdrForFirstSelectedMessage() {
        var row = this.selection.currentIndex;
        var msgKey = this.getMsgKeyForRow(row);
        return this.getMessageHeader(msgKey);
    },
    get keyForFirstSelectedMessage() {
        var row = this.selection.currentIndex;
        var msgKey = this.getMsgKeyForRow(row);
        return msgKey;
    },
    get URIForFirstSelectedMessage() {
        var row = this.selection.currentIndex;
        var msgKey = this.getMsgKeyForRow(row);
        return this.msgFolder.generateMessageURI(msgKey);
    },
    get numSelected() {
        return this.selection.count;
    },
    get removeRowOnMoveOrDelete() {
        return true;
    },
    get searchSession() {
        return null;
    },
    get supportsThreading() {
        return this._settings.showThreads;
    },
    get suppressCommandUpdating() {
        return false;
    },
    get suppressMsgDisplay() {
        return false;
    },
    get usingLines() {
        return true;
    },
    get viewFlags() {
        return 0;
    },
    get viewFolder() {
        return this.msgFolder;
    },
    get viewType() {
        return 0;
    },
    
    
    get rowCount() {
        return this._flattenedRecords.length;
    },
    setTree: function(treebox) {
        this.treebox = treebox;
    },
    setSelection: function(selection) {
        this.selection = selection;
        this.dbView.selection = selection;
    },
    setCellText :          function(row, col, text) {},
    hasNextSibling :       function(row, after) { return true; },
    toggleOpenState :      function(row) {},
    isEditable :           function(row) { return false; },
    isSeparator :          function(row) { return false; },
    isSorted :             function(row) { return false; },
    getImageSrc :          function(row, col) {},
    getProgressMode :      function(row, col) {},
    getCellValue :         function(row, col) {},
    cycleHeader :          function(colID, elmt) {},
    cycleCell :            function(row, col) {},
    getRowProperties :     function(row, props) {},
    getCellProperties :    function(row, col, props) {},
    getColumnProperties :  function(colid, col, props) {},
    performAction :        function(action) {},
    performActionOnCell :  function(action, row, col) {}
};

KeeperFinder.ThreadTreeView.prototype.getMessageHeader = function(msgKey) {
    return this.msgFolder.GetMessageHeader(msgKey);
};

KeeperFinder.ThreadTreeView.prototype.getRecordForRow = function(row) {
    return this._flattenedRecords[row];
};

KeeperFinder.ThreadTreeView.prototype.getMsgKeyForRow = function(row) {
    return this.getRecordForRow(row).msgKey;
};

KeeperFinder.ThreadTreeView.prototype.selectionChanged = function() {
    //UpdateMailToolbar("keeper finder driven, thread pane");
    if (this.selection.count == 1) {
        var row = this.selection.currentIndex;
        var msgKey = this.getMsgKeyForRow(row);
        var msgURI = this.msgFolder.generateMessageURI(msgKey);
        
        var messenger = Components.classes["@mozilla.org/messenger;1"].createInstance().
            QueryInterface(Components.interfaces.nsIMessenger);
            
        messenger.SetWindow(window, msgWindow);
        messenger.OpenURL(msgURI);
        
        if (gThreadPaneCommandUpdater) {
            var msgHdr = this.getMessageHeader(msgKey);
            gThreadPaneCommandUpdater.displayMessageChanged(
                this.msgFolder, 
                msgHdr.subject, 
                msgHdr.getStringProperty("keywords")
            );
            gThreadPaneCommandUpdater.updateCommandStatus();
        }
        
        //this.msgFolder.setLastMessageLoaded(msgKey);
    }
};

KeeperFinder.ThreadTreeView.prototype.getLevel = function(row) {
    return this.getRecordForRow(row).level;
};

KeeperFinder.ThreadTreeView.prototype.getParentIndex = function(row) {
    var level = this.getRecordForRow(row).level;
    if (level == 0) {
        return -1;
    }
    
    var parentRow = row - 1;
    while (parentRow >= 0 && this.getRecordForRow(parentRow).level >= level) {
        parentRow--;
    }
    return parentRow;
};

KeeperFinder.ThreadTreeView.prototype.isContainer = function(row) {
    return this.getRecordForRow(row).hasChildren;
};

KeeperFinder.ThreadTreeView.prototype.isContainerOpen = function(row) {
    return this.getRecordForRow(row).opened;
};

KeeperFinder.ThreadTreeView.prototype.isContainerEmpty = function(row) {
    return this.getRecordForRow(row).children.length == 0;
};

KeeperFinder.ThreadTreeView.prototype.hasNextSibling = function(row, after) {
    var level = this.getLevel(row);
    for (var r = after + 1; r < this._flattenedRecords.length; r++) {
        var level2 = this.getLevel(r);
        if (level2 == level) {
            return true;
        } else if (level2 < level) {
            break;
        }
    }
    return false;
};

KeeperFinder.ThreadTreeView.prototype.toggleOpenState = function(row) {
    if (this.isContainerEmpty(row))
        return;
        
    this.treebox.beginUpdateBatch();
            
    var record = this._flattenedRecords[row];
    if (record.opened) {
        var deleteCount = 0;
        var level = this.getLevel(row);
        for (var r = row + 1; r < this._flattenedRecords.length; r++) {
            if (this.getLevel(r) > level) {
                deleteCount++;
                this._flattenedRecords[r].opened = false;
            } else {
                break;
            }
        }
      
        if (deleteCount > 0) {
            this._flattenedRecords.splice(row + 1, deleteCount);
            
            this.treebox.rowCountChanged(row, -1 - deleteCount);
            this.treebox.rowCountChanged(row, 1);
        }
    } else {
        var newRows = record.children;
        this._flattenedRecords = this._flattenedRecords.slice(0, row + 1).concat(newRows).concat(this._flattenedRecords.slice(row + 1));
        
        this.treebox.rowCountChanged(row, -1);
        this.treebox.rowCountChanged(row, 1 + newRows.length);
    }
    record.opened = !record.opened;
    
    this.treebox.endUpdateBatch();
};

KeeperFinder.ThreadTreeView.prototype._initialize = function() {
    var self = this;
    var sorter = this._createSorter();
    
    this._rootRecords = [];
    for (var i = 0; i < this._baseMsgKeyArray.length; i++) {
        var rootRecord = this._makeRootRecord(this._baseMsgKeyArray[i], this._settings.showThreads);
        if (rootRecord != null) {
            this._rootRecords.push(sorter.prepare(rootRecord));
        }
    }
    this._rootRecords.sort(sorter.comparator);
    
    if (this._settings.showThreads) {
        var flattenedRecords = this._flattenedRecords = [];
        
        var pushRecordAndChildren = function(record) {
            flattenedRecords.push(record);
            
            if (record.hasChildren) {
                record.opened = true;
                for (var j = 0; j < record.children.length; j++) {
                    pushRecordAndChildren(record.children[j]);
                }
            }
        };
        
        for (var i = 0; i < this._rootRecords.length; i++) {
            pushRecordAndChildren(this._rootRecords[i]);
        }
    } else {
        this._flattenedRecords = this._rootRecords;
    }
};

KeeperFinder.ThreadTreeView.prototype._makeRecord = function(msgKey) {
    if (msgKey in this._msgKeyToRecord) {
        return this._msgKeyToRecord[msgKey];
    }
    
    var msgHdr = this.getMessageHeader(msgKey);
    var record = {
        msgKey:         msgKey,
        level:          0,
        hasChildren:    false
    };
    
    this._msgKeyToRecord[msgKey] = record;
    
    return record;
};

KeeperFinder.ThreadTreeView.prototype._makeRootRecord = function(msgKey, showThreads) {
    if (msgKey in this._msgKeyToRecord) {
        return null; // processed message already
    }
    
    if (!showThreads) {
        return this._makeRecord(msgKey);
    }
    
    var msgHdr = this.getMessageHeader(msgKey);
    if (msgHdr.threadId in this._processedThreads) {
        return null; // processed thread already
    }
    this._processedThreads[msgHdr.threadId] = true;
    
    var msgThread = this._getMsgThread(msgHdr);
    var msgHdrRoot = msgThread.GetChildAt(0);
    
    return this._makeRecordAndChildren(msgHdrRoot, msgThread, 0);
};

KeeperFinder.ThreadTreeView.prototype._makeRecordAndChildren = function(msgHdr, msgThread, level) {
    var msgKey = msgHdr.messageKey;
    var record = {
        msgKey:         msgKey,
        level:          level,
        hasChildren:    false,
        opened:         false,
        children:       []
    };
    this._msgKeyToRecord[msgKey] = record;
    
    var e = msgThread.EnumerateMessages(msgKey);
    while (e.hasMoreElements()) {
        var child = e.getNext();
        try {
            var childThread = child.QueryInterface(Components.interfaces.nsIMsgThread);
            if (childThread != null) {
                KeeperFinder.log("child thread " + childThread);
                continue;
            }
        } catch (e) {
        }
        
        try {
            var childMsgHdr = child.QueryInterface(Components.interfaces.nsIMsgDBHdr);
            if (childMsgHdr != null) {
                record.children.push(this._makeRecordAndChildren(childMsgHdr, msgThread, level + 1));
                continue;
            }
        } catch (e) {
        }
    }
    
    record.hasChildren = record.children.length > 0;
    
    return record;
};

KeeperFinder.ThreadTreeView.prototype._getMsgThread = function(msgHdr) {
    return this.msgDatabase.GetThreadContainingMsgHdr(msgHdr);
};
