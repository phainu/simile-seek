/*======================================================================
 *  Thread Tree View
 *======================================================================
 */
KeeperFinder.ThreadTreeView = function(msgFolder, baseMsgKeyArray, settings) {
    settings = settings || {};
    
    this.wrappedJSObject = this;
    this.msgFolder = msgFolder;
    
    if (!("sortColumnId" in settings)) {
        settings.sortColumnId = "dateCol";
        settings.sortAscending = false;
    } else if (!("sortAscending" in settings)) {
        settings.sortAscending = true;
    }
    
    if (!("showThreads" in settings)) {
        settings.showThreads = false;
    }
    if (!("showNew" in settings)) {
        settings.showNew = false;
    }
    
    this._settings = settings;
    this._baseMsgKeyArray = baseMsgKeyArray;
    
    this._initialize();
};

KeeperFinder.ThreadTreeView.prototype = {
    setTree: function(treebox) {
        this.treebox = treebox;
    },
    setSelection: function(selection) {
        this.selection = selection;
    },
    get rowCount() {
        return this._flattenedRecords.length;
    },
    isContainer :          function(row) { return false; },
    isContainerOpen :      function(row) { return false; },
    isContainerEmpty :     function(row) { return true; },
    setCellText :          function(row, col, text) {},
    getParentIndex :       function(row) { return -1; },
    getLevel :             function(row) { return 0; },
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
    selectionChanged :     function() {},
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

KeeperFinder.ThreadTreeView.prototype.getCellText = function(row, column) {
    var columnId = column.id;
    var msgKey = this.getMsgKeyForRow(row);
    if (columnId == "idCol") {
        return msgKey;
    }
    
    var msgHdr = this.getMessageHeader(msgKey);
    switch (columnId) {
    case "subjectCol" :
        return msgHdr.mime2DecodedSubject;
        
    case "senderCol" :
        return msgHdr.mime2DecodedAuthor;
        
    case "recipientCol" :
        return msgHdr.mime2DecodedRecipients;
        
    case "dateCol" :
        return new Date(msgHdr.date / 1000).toLocaleString();
        
    case "tagsCol" :
        return KeeperFinder.Indexer.getTagLabels(msgHdr);
        
    case "sizeCol" :
        return Math.ceil(msgHdr.messageSize / 1024) + "KB";
        
    case "statusCol" :
        return KeeperFinder.ThreadTreeView._getStatusString(msgHdr);
        
    /*
    case "threadCol" :
    case "attachmentCol" :
    case "junkStatusCol" :
    case "unreadButtonColHeader" :
    case "flaggedCol" :
    case "accountCol" :
    case "priorityCol" :
    case "unreadCol" :
    case "totalCol" :
    case "locationCol" :
    */
    }
    return null;
};

KeeperFinder.ThreadTreeView.prototype.getRowProperties = function(row, props) {
    var msgKey = this.getMsgKeyForRow(row);
    var msgHdr = this.getMessageHeader(msgKey);
    
    this._getTagProperties(msgHdr, props, false);
};

KeeperFinder.ThreadTreeView.prototype.getCellProperties = function(row, col, props) {
    var msgKey = this.getMsgKeyForRow(row);
    var msgHdr = this.getMessageHeader(msgKey);
    
    this._getTagProperties(msgHdr, props, true);
};

KeeperFinder.ThreadTreeView.prototype._initialize = function() {
    var self = this;
    var sorter = this._createSorter();
    
    this._rootRecords = [];
    for (var i = 0; i < this._baseMsgKeyArray.length; i++) {
        this._rootRecords.push(sorter.prepare(this._makeRootRecord(this._baseMsgKeyArray[i])));
    }
    this._rootRecords.sort(sorter.comparator);
    this._flattenedRecords = this._rootRecords;
};

KeeperFinder.ThreadTreeView._getStatusString = function(msgHdr) {
    var flags = msgHdr.flags;
    
    // Constants are in mailnews/base/public/nsMsgMessageFlags.h
    if (flags & 0x0002) { // replied
        return "Replied";
    } else if (flags & 0x1000) { // forwarded
        return "Forwarded";
    } else if (flags & 0x10000) { // new
        return "New";
    } else if (flags & 0x0001) { // read
        return "Read";
    } else {
        return "";
    }
};

KeeperFinder.ThreadTreeView.prototype._makeRecord = function(msgKey) {
    var msgHdr = this.getMessageHeader(msgKey);
    var record = {
        msgKey:         msgKey,
        level:          0,
        hasChildren:    false
    };
    return record;
};

KeeperFinder.ThreadTreeView.prototype._makeRootRecord = function(msgKey) {
    return this._makeRecord(msgKey);
};

KeeperFinder.ThreadTreeView.prototype._createSorter = function() {
    var self = this;
    
    var sortColumnId = this._settings.sortColumnId;
    var sortMultiply = this._settings.sortAscending ? 1 : -1;
    var sortType = "text";
    
    var dateGetter = function(record) {
        return self.getMessageHeader(record.msgKey).date;
    };
    var sortKeyGetter = function(record) {
        return "";
    };
    
    switch (sortColumnId) {
    case "subjectCol" :
        sortKeyGetter = function(record) {
            return self.getMessageHeader(record.msgKey).mime2DecodedSubject;
        };
        break;
        
    case "senderCol" :
        sortKeyGetter = function(record) {
            return self.getMessageHeader(record.msgKey).mime2DecodedAuthor;
        };
        break;
        
    case "recipientCol" :
        sortKeyGetter = function(record) {
            return self.getMessageHeader(record.msgKey).mime2DecodedRecipients;
        };
        break;
        
    case "dateCol" :
        sortKeyGetter = dateGetter;
        sortType = "number";
        break;
        
    case "tagsCol" :
        sortKeyGetter = function(record) {
            return KeeperFinder.Indexer.getTags(self.getMessageHeader(record.msgKey));
        };
        break;
        
    case "sizeCol" :
        sortKeyGetter = function(record) {
            return self.getMessageHeader(record.msgKey).messageSize;
        };
        sortType = "number";
        break;
        
    case "statusCol" :
        sortKeyGetter = function(record) {
            return KeeperFinder.ThreadTreeView._getStatusString(self.getMessageHeader(record.msgKey));
        };
        break;
    /*
    case "threadCol" :
    case "attachmentCol" :
    case "junkStatusCol" :
    case "unreadButtonColHeader" :
    case "flaggedCol" :
    case "accountCol" :
    case "priorityCol" :
    case "unreadCol" :
    case "totalCol" :
    case "locationCol" :
    case "idCol" :
    */
    }
    
    return {
        prepare: function(record) {
            record._sortKey = sortKeyGetter(record);
            record._date = dateGetter(record);
            return record;
        },
        comparator: sortType == "text" ?
            function(a, b) {
                var c = sortMultiply * a._sortKey.localeCompare(b._sortKey);
                return c != 0 ? c : (a._date - b._date);
            } :
            function(a, b) {
                var c = sortMultiply * (a._sortKey - b._sortKey);
                return c != 0 ? c : (a._date - b._date);
            }
    };
};

KeeperFinder.ThreadTreeView.prototype._getTagProperties = function(msgHdr, props, addSelectedTextProperty) {
    /*
     *  The logic in this function is adapted from thunderbird's source code,
     *  mailnews/base/src/nsMsgDBView.cpp function AppendKeywordProperties.
     */
    var keys = KeeperFinder.Indexer.getTags(msgHdr);
    if (keys.length > 0) {
        keys = keys.join(" ");
        
        var tagService = Components.classes["@mozilla.org/messenger/tagservice;1"].
            getService(Components.interfaces.nsIMsgTagService);
            
        var topKey = tagService.getTopKey(keys);
        if (topKey != null && topKey.length > 0) {
            var color = tagService.getColorForKey(topKey);
            if (color != null && color.length > 0) {
                var atomService = Components.classes["@mozilla.org/atom-service;1"].
                    getService(Components.interfaces.nsIAtomService);
                    
                if (addSelectedTextProperty) {
                    props.AppendElement(atomService.getAtom(
                        color == "#FFFFFF" ? "lc-black" : "lc-white"
                    ));
                }
                
                props.AppendElement(atomService.getAtom("lc-" + color.substr(1)));
            }
        }
    }
};