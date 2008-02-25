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
    
    alert(command);
    switch (command) {
    case nsMsgViewCommandType.downloadSelectedForOffline:
        // this.DownloadForOffline(mMsgWindow, indices, numIndices);
    case nsMsgViewCommandType.downloadFlaggedForOffline:
        // this.DownloadFlaggedForOffline(mMsgWindow);
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
        // since the FE could have constructed the list of indices in
        // any order (e.g. order of discontiguous selection), we have to
        // sort the indices in order to find out which nsMsgViewIndex will
        // be deleted first.
        /*
        if (numIndices > 1) {
            NS_QuickSort (indices, numIndices, sizeof(nsMsgViewIndex), CompareViewIndices, nsnull);
        }
        
        NoteStartChange(nsMsgViewNotificationCode.none, 0, 0);
        rv = ApplyCommandToIndices(command, indices, numIndices);
        NoteEndChange(nsMsgViewNotificationCode.none, 0, 0);
        */
        break;
        
    case nsMsgViewCommandType.selectAll:
        /*if (mTreeSelection && mTree) {
            // if in threaded mode, we need to expand all before selecting
            if (m_viewFlags & nsMsgViewFlagsType.kThreadedDisplay) {
                rv = ExpandAll();
            }
            mTreeSelection->SelectAll();
            mTree->Invalidate();
        }*/
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
        /*
        rv = ExpandAll();
        m_viewFlags |= nsMsgViewFlagsType.kExpandAll;
        SetViewFlags(m_viewFlags);
        NS_ASSERTION(mTree, "no tree, see bug #114956");
        if (mTree) {
            mTree->Invalidate();
        }
        */
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

KeeperFinder.ThreadTreeView.prototype._updateMsgHdr = function(msgHdr) {
    var msgKey = msgHdr.messageKey;
    if (!(msgKey in this._msgKeyToRecord)) {
        return;
    }
    
    var record = this._msgKeyToRecord[msgKey];
    var first = this.treebox.getFirstVisibleRow();
    var last = this.treebox.getLastVisibleRow();
    for (var i = first; i <= last; i++) {
        if (this._flattenedRecords[i] == record) {
            this.treebox.invalidateRow(i);
            break;
        }
    }
};

KeeperFinder.ThreadTreeView.prototype._recordToRow = function(record) {
};
