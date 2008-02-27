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
        return this._decodeMessageHeaders(msgHdr.mime2DecodedAuthor).join(", ");
        
    case "recipientCol" :
        return this._decodeMessageHeaders(msgHdr.mime2DecodedRecipients).join(", ");
        
    case "dateCol" :
        var d = new Date(msgHdr.date / 1000);
        var dateFormat = Components.interfaces.nsIScriptableDateFormat.dateFormatShort;
        var timeFormat = Components.interfaces.nsIScriptableDateFormat.timeFormatNoSeconds;
        
        var t = new Date();
        t.setMilliseconds(0);
        t.setSeconds(0);
        t.setMinutes(0);
        t.setHours(0);
        
        var diff = d.getTime() - t.getTime();
        if (diff < 86400000) {
            if (diff > 0) {
                dateFormat = Components.interfaces.nsIScriptableDateFormat.dateFormatNone;
            } else if (diff > -518400000) {
                dateFormat = Components.interfaces.nsIScriptableDateFormat.dateFormatWeekday;
            }
        }
        return this._dateFormat.FormatDateTime(
            "",
            dateFormat,
            timeFormat,
            d.getYear() + 1900,
            d.getMonth() + 1,
            d.getDate(),
            d.getHours(),
            d.getMinutes(),
            d.getSeconds()
        );
        //return .toLocaleString();
        
    case "tagsCol" :
        return KeeperFinder.Indexer.getTagLabels(msgHdr);
        
    case "sizeCol" :
        return Math.ceil(msgHdr.messageSize / 1024) + "KB";
        
    case "statusCol" :
        return KeeperFinder.ThreadTreeView._getStatusString(msgHdr);
        
    case "priorityCol" :
        return KeeperFinder.ThreadTreeView._priorityLabels[msgHdr.priority];
    /*
    case "threadCol" :
    case "attachmentCol" :
    case "junkStatusCol" :
    case "unreadButtonColHeader" :
    case "flaggedCol" :
    case "accountCol" :
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
    var columnId = col.id;
    var msgKey = this.getMsgKeyForRow(row);
    var msgHdr = this.getMessageHeader(msgKey);
    
    this._getTagProperties(msgHdr, props, true);
    this._getFlagProperties(msgHdr, props, columnId, false);
    this._getPriorityProperties(msgHdr, props);
    
    var junkscore = msgHdr.getStringProperty("junkscore");
    if (junkscore.length > 0) {
        var j = parseInt(junkscore);
        props.AppendElement(this._atomService.getAtom(j > 50 ? "junk" : "notjunk"));
    }
    
    if (columnId == "subjectCol" && 
        (this._settings.showThreads || this._settings.showNewMessages) && 
        !this.getRecordForRow(row).isMatch) {
        props.AppendElement(this._atomService.getAtom("kf-nonmatch"));
    }
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
        
    case "priorityCol" :
        sortKeyGetter = function(record) {
            return self.getMessageHeader(record.msgKey).priority;
        };
        sortType = "number";
        break;
        
    /*
    case "threadCol" :
    case "attachmentCol" :
    case "junkStatusCol" :
    case "unreadButtonColHeader" :
    case "flaggedCol" :
    case "accountCol" :
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
                if (addSelectedTextProperty) {
                    props.AppendElement(this._atomService.getAtom(
                        color == "#FFFFFF" ? "lc-black" : "lc-white"
                    ));
                }
                
                props.AppendElement(this._atomService.getAtom("lc-" + color.substr(1)));
            }
        }
    }
};

KeeperFinder.ThreadTreeView.prototype._getFlagProperties = function(msgHdr, props, columnId, viewThreads) {
    var flags = msgHdr.flags;
    if (flags & 0x0001) { // read
        props.AppendElement(this._atomService.getAtom("read"));
    } else {
        props.AppendElement(this._atomService.getAtom("unread"));
    }
    
    if (flags & 0x0002) { // replied
        props.AppendElement(this._atomService.getAtom("replied"));
    }
    if (flags & 0x1000) { // forwarded
        props.AppendElement(this._atomService.getAtom("forwarded"));
    }
    if (flags & 0x10000) { // new
        props.AppendElement(this._atomService.getAtom("new"));
    }
    if (flags & 0x10000000) { // attachment
        props.AppendElement(this._atomService.getAtom("attach"));
    }
    if ((columnId == "flaggedCol") && (flags & 0x0004)) { // marked
        props.AppendElement(this._atomService.getAtom("flagged"));
    }
    
    if (viewThreads) {
        var msgThread = this._getMsgThread(msgHdr);
        if (msgThread.numUnreadChildren > 0) {
            props.AppendElement(this._atomService.getAtom("hasUnread"));
        }
        if (flags & 0x0100) { // watched
            props.AppendElement(this._atomService.getAtom("watch"));
        }
        if (flags & 0x40000) { // ignored
            props.AppendElement(this._atomService.getAtom("ignore"));
        }
    }
};

KeeperFinder.ThreadTreeView.prototype._getPriorityProperties = function(msgHdr, props) {
    var a = [
        "", //"priority-notset",
        "", //"priority-none",
        "priority-lowest",
        "priority-low",
        "", //"priority-normal",
        "priority-high",
        "priority-highest"
    ];
    var priority = msgHdr.priority;
    var s = a[priority];
    if (s.length > 0) {
        props.AppendElement(this._atomService.getAtom(s));
    }
};

KeeperFinder.ThreadTreeView.prototype._decodeMessageHeaders = function(s) {
    var addresses = {};
    var fullNames = {};
    var names = {};
    var numAddresses = this._headerParser.parseHeadersWithArray(s, addresses, names, fullNames);
        
    return names.value;
};

KeeperFinder.ThreadTreeView.prototype._setReadByIndex = function(index, read) {
    if (read) {
        this._orExtraFlag(index, 0x0001); // MSG_FLAG_READ
        this._andExtraFlag(index, ~0x10000); // MSG_FLAG_NEW
    } else {
        this._andExtraFlag(index, ~0x0001); // MSG_FLAG_READ
    }
    
    var msgKey = this.getMsgKeyForRow(index);
    this.msgDatabase.MarkRead(msgKey, read, this);
    
    this._noteChange(index, 1, Components.interfaces.nsMsgViewNotificationCode.changed);
    if (this._settings.showThreads) {
        var threadIndex = index;//this._threadIndexOfMsg(msgKey);
        if (threadIndex != index) {
            this._noteChange(threadIndex, 1, Components.interfaces.nsMsgViewNotificationCode.changed);
        }
    }
};

KeeperFinder.ThreadTreeView.prototype._toggleReadByIndex = function(index) {
    var msgKey = this.getMsgKeyForRow(index);
    var msgHdr = this.getMessageHeader(msgKey);
    this._setReadByIndex(index, !(msgHdr.flags & 0x0001)); // MSG_FLAG_READ
};

KeeperFinder.ThreadTreeView.prototype._setFlaggedByIndex = function(index, mark) {
    if (mark) {
        this._orExtraFlag(index, 0x0004); // MSG_FLAG_MARKED
    } else {
        this._andExtraFlag(index, ~0x0004); // MSG_FLAG_MARKED
    }
    
    var msgKey = this.getMsgKeyForRow(index);
    this.msgDatabase.MarkMarked(msgKey, mark, this);
    
    this._noteChange(index, 1, Components.interfaces.nsMsgViewNotificationCode.changed);
};

KeeperFinder.ThreadTreeView.prototype._orExtraFlag = function(index, flag) {
    var msgKey = this.getMsgKeyForRow(index);
    var msgHdr = this.getMessageHeader(msgKey);
    var flags = msgHdr.flags | flag;
    msgHdr.flags = flags;
    
    this._onExtraFlagChanged(index, flags);
};

KeeperFinder.ThreadTreeView.prototype._andExtraFlag = function(index, flag) {
    var msgKey = this.getMsgKeyForRow(index);
    var msgHdr = this.getMessageHeader(msgKey);
    var flags = msgHdr.flags & flag;
    msgHdr.flags = flags;
    
    this._onExtraFlagChanged(index, flags);
};

KeeperFinder.ThreadTreeView.prototype._onExtraFlagChanged = function(index, flags) {
    // not sure what to do here; presumably there's work to do if we're showing threads
};

