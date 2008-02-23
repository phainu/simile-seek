/*======================================================================
 *  Thread Tree View
 *======================================================================
 */
KeeperFinder.ThreadTreeView = function(msgFolder, baseMsgKeyArray, settings) {
    settings = settings || {};
    
    this.wrappedJSObject = this;
    this.msgFolder = msgFolder;
    this.msgDatabase = msgFolder.getMsgDatabase(msgWindow);
    
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

KeeperFinder.ThreadTreeView.prototype._getMsgThread = function(msgHdr) {
    return this.msgDatabase.GetThreadContainingMsgHdr(msgHdr);
};