/*======================================================================
 *  Thread Tree View
 *======================================================================
 */
KeeperFinder.ThreadTreeView = function(dbView, msgFolder, baseMsgKeyArray, settings) {
    this.wrappedJSObject = this;
    
    this.dbView = dbView;
    this.msgFolder = msgFolder;
    this.msgDatabase = msgFolder.getMsgDatabase(msgWindow);
    
    settings = settings || {};
    
    if (!("showThreads" in settings)) {
        settings.showThreads = false;
    }
    if (!("showNewMessages" in settings)) {
        settings.showNewMessages = false;
    }

    this.sortType = settings.sortType;
    this.sortOrder = settings.sortOrder;
    
    this._settings = settings;
    this._baseMsgKeyArray = baseMsgKeyArray;
    this._msgKeyToRecord = {};
    this._processedThreadKeys = {};
    this._viewFlags = 0;
    this._suppressChangeNotification = false;
    
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
    "Normal",
    "High",
    "Highest"
];

KeeperFinder.ThreadTreeView.prototype = {
    QueryInterface: function(iid) {
        if (iid.equals(Components.interfaces.nsIMsgDBView) ||
            iid.equals(Components.interfaces.nsITreeView) ||
            iid.equals(Components.interfaces.nsISupports)) {
            return this;
        }
        throw Components.interfaces.NS_ERROR_NOINTERFACE;
    },
    
    /*
     *  nsIMsgDBView
     */
     
    get currentlyDisplayedMessage() {
        return this.selection.currentIndex;
    },
    get db() {
        return this.msgDatabase;
    },
    get viewIndexForFirstSelectedMsg() {
        if (this.selection.count > 0) {
            var start = {};
            var end = {};
            this.selection.getRangeAt(0, start, end);
            return start.value;
        } else {
            return -1;
        }
    },
    get hdrForFirstSelectedMessage() {
        var msgKey = this.keyForFirstSelectedMessage;
        return msgKey == null ? null : this.getMessageHeader(msgKey);
    },
    get keyForFirstSelectedMessage() {
        var index = this.viewIndexForFirstSelectedMsg;
        return index < 0 ? null : this.getMsgKeyForRow(index);
    },
    get URIForFirstSelectedMessage() {
        var msgKey = this.keyForFirstSelectedMessage;
        return msgKey == null ? null : this.msgFolder.generateMessageURI(msgKey);
    },
    get numSelected() {
        return this.selection.count;
    },
    get removeRowOnMoveOrDelete() {
        return true; // there's something about mark to delete for imap, which we don't handle now
    },
    get searchSession() {
        return null; // not implemented
    },
    get supportsThreading() {
        return false; // this._settings.showThreads; // not sure why but the C++ impl. returns false always
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
        return this._viewFlags;
    },
    get viewFolder() {
        return this.msgFolder;
    },
    get viewType() {
        return 0;
    },
    
    /*
     *  nsITreeView
     */
    get rowCount() {
        return this._flattenedRecords.length;
    },
    setTree: function(treebox) {
        this.treebox = treebox;
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
    getRowProperties :     function(row, props) {},
    getCellProperties :    function(row, col, props) {},
    getColumnProperties :  function(colid, col, props) {},
    performAction :        function(action) {},
    performActionOnCell :  function(action, row, col) {}
};

KeeperFinder.ThreadTreeView.prototype.setSelection = function(selection) {
    selection.clearSelection();
    
    this.selection = selection;
    gCurrentMessageUri = null;
    gCurrentFolderUri = null;
};

KeeperFinder.ThreadTreeView.prototype.getMessageHeader = function(msgKey) {
    try {
        return this.msgFolder.GetMessageHeader(msgKey);
    } catch (e) {
        return null;
    }
};

KeeperFinder.ThreadTreeView.prototype.getRecordForRow = function(row) {
    return this._flattenedRecords[row];
};

KeeperFinder.ThreadTreeView.prototype.getMsgKeyForRow = function(row) {
    return this.getRecordForRow(row).msgKey;
};

KeeperFinder.ThreadTreeView.prototype.getMsgHdrForRow = function(row) {
    return this.getMessageHeader(this.getRecordForRow(row).msgKey);
};

KeeperFinder.ThreadTreeView.prototype.selectionChanged = function() {
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
        
        this.msgFolder.lastMessageLoaded = msgKey;
        
        gCurrentMessageUri = this.URIForFirstSelectedMessage;
        gCurrentFolderUri = this.hdrForFirstSelectedMessage.folder.URI;
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
    
    if (record.level == 0) {
        record.expandedDescendantCount = record.opened ? record.children.length : 0;
    } else {
        var thisRootRow = row - 1;
        while (thisRootRow >= 0 && this._flattenedRecords[thisRootRow].level > 0) {
            thisRootRow--;
        }
        
        var nextRootRow = row + 1;
        while (nextRootRow < this._flattenedRecords.length && this._flattenedRecords[nextRootRow].level > 0) {
            nextRootRow++;
        }
        
        var thisRootRecord = this._flattenedRecords[thisRootRow];
        thisRootRecord.expandedDescendantCount = nextRootRow - thisRootRow - 1;
    }
    
    this.treebox.endUpdateBatch();
};

KeeperFinder.ThreadTreeView.prototype.cycleCell = function(row, col) {
    switch (col.id) {
    case "unreadCol":
    case "unreadButtonColHeader":
        this._applyCommandToIndices(Components.interfaces.nsMsgViewCommandType.toggleMessageRead, [ row ]);
        break;
        
    case "flaggedCol":
        var msgHdr = this.getMsgHdrForRow(row);
        this._applyCommandToIndices(
            (msgHdr.flags & 0x0004) ? //MSG_FLAG_MARKED
                Components.interfaces.nsMsgViewCommandType.unflagMessages :
                Components.interfaces.nsMsgViewCommandType.flagMessages, 
            [ row ]
        );
        break;
        
    case "junkStatusCol":
        this._applyCommandToIndices(
            (KeeperFinder.ThreadTreeView.getJunkScore(this.getMsgHdrForRow(row)) < 50) ?
                Components.interfaces.nsMsgViewCommandType.junkMessages :
                Components.interfaces.nsMsgViewCommandType.unjunkMessages, 
            [ row ]
        );
        break;
        
    case "threadCol":
        // TODO
    }
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
        this._expandAll();
    } else {
        this._flattenedRecords = this._rootRecords;
    }
};

KeeperFinder.ThreadTreeView.prototype._expandAll = function() {
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
        var rootRecord = this._rootRecords[i];
        var c = this._flattenedRecords.length;
        pushRecordAndChildren(rootRecord);
        rootRecord.expandedDescendantCount = this._flattenedRecords.length - c - 1;
    }
}

KeeperFinder.ThreadTreeView.prototype._makeRecord = function(msgKey) {
    if (msgKey in this._msgKeyToRecord) {
        return this._msgKeyToRecord[msgKey];
    }
    
    var msgHdr = this.getMessageHeader(msgKey);
    var record = {
        msgKey:         msgKey,
        level:          0,
        isMatch:        false,
        hasChildren:    false
    };
    
    this._msgKeyToRecord[msgKey] = record;
    
    return record;
};

KeeperFinder.ThreadTreeView.prototype._makeRootRecord = function(msgKey, showThreads) {
    if (msgKey in this._msgKeyToRecord) {
        this._msgKeyToRecord[msgKey].isMatch = true;
        return null; // processed message already
    }
    
    if (!showThreads) {
        return this._makeRecord(msgKey);
    }
    
    var msgHdr = this.getMessageHeader(msgKey);
    var msgThread = this._getMsgThread(msgHdr);
    
    var msgHdrRoot = msgThread.GetChildAt(0);
    var rootRecord = this._makeRecordAndChildren(msgHdrRoot, msgThread, 0);
    this._processedThreadKeys[msgThread.threadKey] = rootRecord;
    
    this._msgKeyToRecord[msgKey].isMatch = true;
    
    return rootRecord;
};

KeeperFinder.ThreadTreeView.prototype._makeRecordAndChildren = function(msgHdr, msgThread, level) {
    var msgKey = msgHdr.messageKey;
    var record = {
        msgKey:         msgKey,
        level:          level,
        isMatch:        false,
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

KeeperFinder.ThreadTreeView.prototype.onNewMatch = function(msgKey) {
};

KeeperFinder.ThreadTreeView.prototype.onHdrChange = function(msgHdr) {
    var msgKey = msgHdr.messageKey;
    
    if (msgKey in this._msgKeyToRecord) {
        /*
         *  Update existing record
         */
        var record = this._msgKeyToRecord[msgKey];
        var first = this.treebox.getFirstVisibleRow();
        var last = this.treebox.getLastVisibleRow();
        for (var i = first; i <= last; i++) {
            if (this._flattenedRecords[i] == record) {
                this.treebox.invalidateRow(i);
                break;
            }
        }
        return;
    }

    var msgThread = this._getMsgThread(msgHdr);
    if (msgThread != null && msgThread.threadKey in this._processedThreadKeys) {
        /*
         *  New record in an existing thread (but the record is not a match).
         */
        var newRecord = this._makeRecord(msgKey);
        
        var rootRecord = this._processedThreadKeys[msgThread.threadKey];
        var rootRecordRow = this._rootRecordToRow(rootRecord);
        var row = rootRecordRow;
        
        var threadParent = msgHdr.threadParent;KeeperFinder.log("here " + threadParent + " " + rootRecordRow);
        var self = this;
        var f = function(parentRecord, opened) {
            if (opened) {
                row++;
            }
            
            opened = opened && parentRecord.opened;
            if (threadParent == parentRecord.msgKey) {
                newRecord.level = parentRecord.level + 1;
                
                parentRecord.children.push(newRecord);
                if (opened) {
                    while (row < self._flattenedRecords.length && self._flattenedRecords[row].level > parentRecord.level) {
                        row++;
                    }
                    
                    self._flattenedRecords.splice(row, 0, newRecord);
                    rootRecord.expandedDescendantCount++;
                    
                    self.treebox.beginUpdateBatch();
                    self.treebox.rowCountChanged(row, 1);
                    self.treebox.endUpdateBatch();
                }
                
                return true;
            } else {
                for (var i = 0; i < parentRecord.children.length; i++) {
                    if (f(parentRecord.children[i], opened)) {
                        return true;
                    }
                }
                return false;
            }
        };
        
        f(rootRecord, true);
        return;
    }
    
    if (this._settings.showNewMessages && !(msgHdr.flags & 0x0001)) {
        /*
         *  New unread message, put itself or its thread (collapsed) at the top.
         *  TODO: insert it in the sorting order.
         */
        var rootRecord = this._makeRootRecord(msgKey, this._settings.showThreads);
        if (rootRecord != null) {
            this._createSorter().prepare(rootRecord);
            this._collapseAll(rootRecord);
            
            this._rootRecords.unshift(rootRecord);
            this._flattenedRecords.unshift(rootRecord);
            
            this.treebox.beginUpdateBatch();
            this.treebox.rowCountChanged(0, 1);
            this.treebox.endUpdateBatch();
        }
    }
};

KeeperFinder.ThreadTreeView.prototype._collapseAll = function(rootRecord) {
    var collapse = function(r) {
        if (r.hasChildren) {
            r.opened = false;
            for (var i = 0; i < r.children.length; i++) {
                collapse(r.children[i]);
            }
        }
    }
    collapse(rootRecord);
    
    rootRecord.expandedDescendantCount = 0;
};

KeeperFinder.ThreadTreeView.prototype._rootRecordToRow = function(rootRecord) {
    if (this._settings.showThreads) {
        var records = this._flattenedRecords;
        for (var r = 0; r < records.length; ) {
            var record = records[r];
            if (record == rootRecord) {
                return r;
            }
            r += record.expandedDescendantCount + 1;
        }
    } else {
        var records = this._flattenedRecords;
        for (var r = 0; r < records.length; r++) {
            var record = records[r];
            if (record == rootRecord) {
                return r;
            }
        }
    }
    return -1;
};
