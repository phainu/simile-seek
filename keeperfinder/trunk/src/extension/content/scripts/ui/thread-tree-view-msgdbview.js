/*======================================================================
 *  Thread Tree View - nsIMsgDBView
 *======================================================================
 */

KeeperFinder.ThreadTreeView.prototype.addColumnHandler = function(column, msgCustomColumnHandler) {
};

KeeperFinder.ThreadTreeView.prototype.cloneDBView = function(messengerInstance, msgWindow, commandUpdater) {
    return null;
};

KeeperFinder.ThreadTreeView.prototype.close = function() {
    this.dbView.close();
};

KeeperFinder.ThreadTreeView.prototype.doCommand = function(command) {
    var nsMsgViewCommandType = Components.interfaces.nsMsgViewCommandType;
    
    switch (command) {
    case nsMsgViewCommandType.downloadSelectedForOffline:
        // this.DownloadForOffline(mMsgWindow, indices, numIndices);
        break;
        
    case nsMsgViewCommandType.downloadFlaggedForOffline:
        // this.DownloadFlaggedForOffline(mMsgWindow);
        break;
        
    case nsMsgViewCommandType.markMessagesRead:
    case nsMsgViewCommandType.markMessagesUnread:
    case nsMsgViewCommandType.toggleMessageRead:
    case nsMsgViewCommandType.flagMessages:
    case nsMsgViewCommandType.unflagMessages:
    case nsMsgViewCommandType.deleteMsg:
    case nsMsgViewCommandType.undeleteMsg:
    case nsMsgViewCommandType.deleteNoTrash:
    case nsMsgViewCommandType.markThreadRead:
    case nsMsgViewCommandType.junk:
    case nsMsgViewCommandType.unjunk:
        var indices = this._getSelectedIndices();
        indices.sort();
        
        this._applyCommandToIndices(command, indices);
        /*
        NoteStartChange(nsMsgViewNotificationCode.none, 0, 0);
        rv = ApplyCommandToIndices(command, indices, numIndices);
        NoteEndChange(nsMsgViewNotificationCode.none, 0, 0);
        */
        break;
        
    case nsMsgViewCommandType.selectAll:
        // if in threaded mode, we need to expand all before selecting
        if (this._settings.showThreads) {
            this._expandAll();
        }
        this.selection.selectAll();
        this.treebox.invalidate();
        break;
        
    case nsMsgViewCommandType.selectThread:
        //rv = ExpandAndSelectThread();
        break;
        
    case nsMsgViewCommandType.selectFlagged:
        /*
        if (!mTreeSelection) {
            rv = NS_ERROR_UNEXPECTED;
        } else {
            mTreeSelection->SetSelectEventsSuppressed(PR_TRUE);
            mTreeSelection->ClearSelection();
            // XXX ExpandAll?
            nsMsgViewIndex numIndices = GetSize();
            for (nsMsgViewIndex curIndex = 0; curIndex < numIndices; curIndex++) {
                if (m_flags.GetAt(curIndex) & MSG_FLAG_MARKED) {
                    mTreeSelection->ToggleSelect(curIndex);
                }
            }
            mTreeSelection->SetSelectEventsSuppressed(PR_FALSE);
        }
        */
        break;
    case nsMsgViewCommandType.markAllRead:
        /*
        if (m_folder) {
            rv = m_folder->MarkAllMessagesRead();
        }
        */
        break;
        
    case nsMsgViewCommandType.toggleThreadWatched:
        /*
        rv = ToggleWatched(indices,	numIndices);
        */
        break;
        
    case nsMsgViewCommandType.expandAll:
        if (this._settings.showThreads) {
            this._expandAll();
        }
        this.treebox.invalidate();
        
        break;
    case nsMsgViewCommandType.collapseAll:
        /*
        rv = CollapseAll();
        m_viewFlags &= ~nsMsgViewFlagsType.kExpandAll;
        SetViewFlags(m_viewFlags);
        NS_ASSERTION(mTree, "no tree, see bug #114956");
        if (mTree) {
            mTree->Invalidate();
        }*/
        break;
        
    default:
        /*
        NS_ASSERTION(PR_FALSE, "invalid command type");
        rv = NS_ERROR_UNEXPECTED;
        */
        break;
    }
};

KeeperFinder.ThreadTreeView.prototype.doCommandWithFolder = function(command, msgFolder) {
    alert(command);
};

KeeperFinder.ThreadTreeView.prototype.ExpandAndSelectThreadByIndex = function(index, augment) {
    
};

KeeperFinder.ThreadTreeView.prototype.findIndexFromKey = function(msgKey, expand) {
    return -1;
};

KeeperFinder.ThreadTreeView.prototype.getColumnHandler = function(column) {
    return null;
};

KeeperFinder.ThreadTreeView.prototype.getCommandStatus = function(command, selectable, selected) {
    // TODO: there are other cases
    var hasSelection = this.selection.count > 0;
    selectable.value = hasSelection;
    selected.value = false;
};

KeeperFinder.ThreadTreeView.prototype.getFolderForViewIndex = function(index) {
    return this.msgFolder;
};

KeeperFinder.ThreadTreeView.prototype.getIndicesForSelection = function(indices, count) {
    var a = this._getSelectedIndices();
    indices.value = a;
    count.value = a.length;
};

KeeperFinder.ThreadTreeView.prototype.getKeyAt = function(index) {
    return this.getMsgKeyForRow(index);
};

KeeperFinder.ThreadTreeView.prototype.getURIForViewIndex = function(index) {
    return this.msgFolder.generateMessageURI(this.getMsgKeyForRow(index));
};

KeeperFinder.ThreadTreeView.prototype.getURIsForSelection = function(uris, count) {
    var a = this._getSelectedIndices();
    for (var i = 0; i < a.length; i++) {
        a[i] = this.getURIForViewIndex(a[i]);
    }
    uris.value = a;
    count.value = a.length;
};

KeeperFinder.ThreadTreeView.prototype.init = function(messengerInstance, msgWindow, commandUpdater) {
    
};

KeeperFinder.ThreadTreeView.prototype.loadMessageByMsgKey = function(msgKey) {
    
};

KeeperFinder.ThreadTreeView.prototype.loadMessageByUrl = function(url) {
    
};

KeeperFinder.ThreadTreeView.prototype.loadMessageByViewIndex = function(index) {
    
};

KeeperFinder.ThreadTreeView.prototype.navigateStatus = function(motion) {
    return true;
};

KeeperFinder.ThreadTreeView.prototype.onDeleteCompleted = function(succeeded) {
    
};

KeeperFinder.ThreadTreeView.prototype.open = function(msgFolder, sortType, sortOrder, viewFlags, count) {
    
};

KeeperFinder.ThreadTreeView.prototype.openWithHdrs = function(headers, sortType, sortOrder, viewFlags, count) {
    
};

KeeperFinder.ThreadTreeView.prototype.reloadMessage = function() {
    
};

KeeperFinder.ThreadTreeView.prototype.reloadMessageWithAllParts = function() {
    
};

KeeperFinder.ThreadTreeView.prototype.removeColumnHandler = function(column) {
    
};

KeeperFinder.ThreadTreeView.prototype.selectFolderMsgByKey = function(msgFolder, msgKey) {
    
};

KeeperFinder.ThreadTreeView.prototype.selectMsgByKey = function(msgKey) {
    
};

KeeperFinder.ThreadTreeView.prototype.sort = function(sortType, sortOrder) {
    
};

KeeperFinder.ThreadTreeView.prototype.viewNavigate = function(motion, resultId, resultIndex, threadIndex, wrap) {
    
};

KeeperFinder.ThreadTreeView.prototype._getSelectedIndices = function() {
    var rangeCount = this.selection.getRangeCount();
    var indices = [];
    var start = {};
    var end = {};
    for (var c = 0; c < rangeCount; c++) {
        this.selection.getRangeAt(c, start, end);
        for (var i = start.value; i <= end.value; i++) {
            indices.push(i);
        }
    }
    return indices;
};

KeeperFinder.ThreadTreeView.prototype._applyCommandToIndices = function(command, indices) {
    if (indices.length == 0) {
        return;
    }
    
    var nsMsgViewCommandType = Components.interfaces.nsMsgViewCommandType;
    
    if (command == nsMsgViewCommandType.deleteMsg) {
        this._deleteMessages(msgWindow, indices, false);
        return;
    }
    if (command == nsMsgViewCommandType.deleteNoTrash) {
        this._deleteMessages(msgWindow, indices, true);
        return;
    }
    
    if (command == nsMsgViewCommandType.junk || command == nsMsgViewCommandType.unjunk) {
        // There's supposedly some preparation to be done here
        alert("Not yet implemented");
        return;
    }
    
    var imapUids = []; //Components.classes["@mozilla.org/supports-array;1"].createInstance(Components.interfaces.nsISupportsArray);
    var folderIsImap = false;
    var imapFolder = null;
    try {
        imapFolder = this.msgFolder.QueryInterface(Components.interfaces.nsIMsgImapMailFolder);
        folderIsImap = true;
    } catch (e) {
    }
   
    this.msgFolder.enableNotifications(Components.interfaces.nsIMsgFolder.allMessageCountNotifications, false, true);
    
    for (var i = 0; i < indices.length; i++) {
        var index = indices[i];
        if (folderIsImap) {
            imapUids.push(this.getMsgKeyForRow(index));
        }
        
        switch (command) {
        case nsMsgViewCommandType.markMessagesRead:
            this._setReadByIndex(index, true);
            break;
            
        case nsMsgViewCommandType.markMessagesUnread:
            this._setReadByIndex(index, false);
            break;
            
        case nsMsgViewCommandType.toggleMessageRead:
            this._toggleReadByIndex(index);
            break;
            
        case nsMsgViewCommandType.flagMessages:
            this._setFlaggedByIndex(index, true);
            break;
            
        case nsMsgViewCommandType.unflagMessages:
            this._setFlaggedByIndex(index, false);
            break;
            
        /*
        case nsMsgViewCommandType.markThreadRead:
        case nsMsgViewCommandType.junk:
        case nsMsgViewCommandType.unjunk:
        case nsMsgViewCommandType.undeleteMsg:
        */
        }
    }
    
    this.msgFolder.enableNotifications(Components.interfaces.nsIMsgFolder.allMessageCountNotifications, true, true);
    
    if (folderIsImap) {
        // flags are from mailnews/imap/src/nsImapCore.h
        
        var flags = 0;
        var addFlags = false;
        var isRead = false;;
        
        switch (command) {
        case nsMsgViewCommandType.markMessagesRead:
        case nsMsgViewCommandType.markThreadRead:
            flags |= 0x0001; // kImapMsgSeenFlag
            addFlags = true;
            break;
            
        case nsMsgViewCommandType.markMessagesUnread:
            flags |= 0x0001; // kImapMsgSeenFlag
            addFlags = false;
            break;
            
        case nsMsgViewCommandType.toggleMessageRead:
            flags |= 0x0001; // kImapMsgSeenFlag
            addFlags = this.msgDatabase.isRead(this.getMsgKeyForRow(indices[0]));
            break;
            
        case nsMsgViewCommandType.flagMessages:
            flags |= 0x0004; // kImapMsgFlaggedFlag
            addFlags = true;
            break;
            
        case nsMsgViewCommandType.unflagMessages:
            flags |= 0x0004; // kImapMsgFlaggedFlag
            addFlags = false;
            break;
            
        case nsMsgViewCommandType.undeleteMsg:
            flags |= 0x0008; // kImapMsgDeletedFlag
            addFlags = false;
            break;
            
        case nsMsgViewCommandType.junk:
            imapFolder.storeCustomKeywords(msgWindow, "Junk", "NonJunk", imapUids, imapUids.length, null);
            return;
            
        case nsMsgViewCommandType.unjunk:
            imapFolder.storeCustomKeywords(msgWindow, "NonJunk", "Junk", imapUids, imapUids.length, null);
            return;
        }
        
        if (flags != 0) {
            imapFolder.storeImapFlags(flags, addFlags, imapUids, imapUids.length, null);
        }
    }
};

KeeperFinder.ThreadTreeView.prototype._deleteMessages = function(msgWindow, indices, deleteStorage) {
    /*
    var headers = Components.classes["@mozilla.org/supports-array;1"].
        createInstance(Components.interfaces.nsISupportsArray);
        
    for (var i = 0; i < indices.length; i++) {
        headers.AppendElement(this.getMessageHeader(this.getMsgKeyForRow(indices[i])));
    }
    this.msgFolder.deleteMessages(headers, msgWindow, deleteStorage, false, null, true);
    */
    alert("Not implemented yet");
};

KeeperFinder.ThreadTreeView.prototype._noteChange = function(firstLineChanged, numChanged, changeType) {
    if (!this._suppressChangeNotification) {
        switch (changeType) {
        case Components.interfaces.nsMsgViewNotificationCode.changed:
            this.treebox.invalidateRange(firstLineChanged, firstLineChanged + numChanged - 1);
            break;
            
        case Components.interfaces.nsMsgViewNotificationCode.insertOrDelete:
            this.treebox.rowCountChanged(firstLineChanged, numChanged);
            break;
            
        case Components.interfaces.nsMsgViewNotificationCode.all:
            // TODO
            break;
        }
    }
};

KeeperFinder.ThreadTreeView.prototype._noteStartChange = function(firstLineChanged, numChanged, changeType) {
};

KeeperFinder.ThreadTreeView.prototype._noteEndChange = function(firstLineChanged, numChanged, changeType) {
    this._noteChange(firstLineChanged, numChanged, changeType);
};

