/*
 * Copyright (c) 2008 David Huynh
 *
 * Permission to use, copy, modify, and distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 * */

var Seek = {
    _visible:               false,
    _selectedFolder:        null,
    _database:              null,
    _facets:                [],
    _currentSettings:       null,
    _dbChangeListener:      null,
    _processingUpdates:     false,
    _folderSettings:        null
};

Seek.log = function(msg) {
    Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService)
            .logStringMessage(msg);
};
Seek.warn = function(msg) {
    Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService)
            .logStringMessage(msg);
};
Seek.exception = function(e) {
    Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService)
            .logMessage(e);
};

Seek.cancelEvent = function(evt) {
    evt.returnValue = false;
    evt.cancelBubble = true;
    if ("preventDefault" in evt) {
        evt.preventDefault();
    }
    return false;
};

Seek.onLoad = function() {
    // initialization code
    Seek.initialized = true;
    Seek.strings = document.getElementById("seek-strings");
    
    window.addEventListener("mousemove", Seek.onWindowMouseMove, false);
    window.addEventListener("mouseup", Seek.onWindowMouseUp, false);
    
    var addFacetPopup = document.getElementById("seekPane-addFacetPopup");
    var makeMenuItem = function(n) {
        var config = Seek.FacetConfigurations.possibleFacets[n].config;
        var menuItem = document.createElement("menuitem");
        
        addFacetPopup.appendChild(menuItem);
        
        menuItem.setAttribute("label", config.facetLabel);
        menuItem.addEventListener('command', function() {
            Seek.appendFacet(n);
        }, false);
    };
    for (var n in Seek.FacetConfigurations.possibleFacets) {
        makeMenuItem(n);
    }
    
    document.getElementById("seekPane-browsingLayer-textSearch-input").
        addEventListener('keyup', Seek.onContentSearchInputKeyUp, false);
    
    document.getElementById("seekPane-browsingLayer-textSearch-pastEntry-remove").
        addEventListener('click', Seek.onClearContentSearch, false);
};
window.addEventListener("load", Seek.onLoad, false);

Seek.onToggleSeek = function() {
    Seek._visible = !Seek._visible;
    
    document.getElementById("seek-theMenuItem").setAttribute("checked", Seek._visible);
    
    var deck = document.getElementById("seekPane-deck");
    var splitter = document.getElementById("seek-mainSplitter");
    
    deck.hidden = !Seek._visible;
    splitter.hidden = !Seek._visible;
}

Seek._getCurrentlySelectedFolder = function() {
    var folderTree = GetFolderTree();
    var folderSelection = folderTree.view.selection;
    var startIndex = {};
    var endIndex = {};

    folderSelection.getRangeAt(0, startIndex, endIndex);
    var folderResource = GetFolderResource(folderTree, startIndex.value);
    var msgFolder = folderResource.QueryInterface(Components.interfaces.nsIMsgFolder);
    
    return msgFolder;
};

var oldFolderPaneSelectionChange = FolderPaneSelectionChange;
FolderPaneSelectionChange = function() {
    var msgFolder = Seek._getCurrentlySelectedFolder();
    var changed = (Seek._selectedFolder != msgFolder);
    
    if (changed) {
        Seek.Indexer.cancelIndexingJob();
        Seek._relinquishThreadPaneOurselves();
    }
    
    oldFolderPaneSelectionChange();
    
    if (changed) {
        Seek._selectedFolder = msgFolder;
        
        var deck = document.getElementById("seekPane-deck");
        
        var msgDatabase = msgFolder.getMsgDatabase(msgWindow);
        if (msgDatabase) {
            deck.selectedIndex = 1; // UI for starting indexing
        } else {
            deck.selectedIndex = 0; // don't support message
        }
    }
};

Seek.disengage = function() {
    Seek._disposeFacets();
    Seek._relinquishThreadPaneOurselves();
    
    Seek._database = null;
    Seek._collection = null;
    
    var deck = document.getElementById("seekPane-deck");
    deck.selectedIndex = 1;
};

Seek.onStartIndexingFolder = function() {
    Seek._disposeFacets();
    
    var msgDatabase = Seek._selectedFolder.getMsgDatabase(msgWindow);
    Seek._dbChangeListener = Seek._createDBChangeListener();
    msgDatabase.AddListener(Seek._dbChangeListener);
    
    var progress = document.getElementById("seekPane-indexingLayer-progress");
    progress.value = 0;
    
    var deck = document.getElementById("seekPane-deck");
    deck.selectedIndex = 2; // indexing UI
    
    var remainingLabel = document.getElementById("seekPane-indexingLayer-remaining");
    remainingLabel.value = "";
    
    var start = new Date().getTime();
    
    Seek._database = Seek.Database.create();
    Seek.Indexer.startIndexingJob(
        Seek._database, 
        Seek._selectedFolder,
        function(percent) {
            if (percent > 5) {
                var now = new Date().getTime();
                var ellapsed = (now - start) / 1000; // in seconds
                var remaining = Math.ceil(ellapsed * (100 - percent) / percent);
                if (remaining >= 120) {
                    remainingLabel.value = String.substitute(
                        Seek.strings.getString("seek.remainingTime.minutes"),
                        [ Math.floor(remaining / 60) ]
                    );
                } else if (remaining > 60) {
                    var seconds = remaining - 60;
                    remainingLabel.value = String.substitute(
                        Seek.strings.getString("seek.remainingTime.oneMinuteMore"),
                        [ seconds ]
                    );
                } else if (remaining > 1) {
                    remainingLabel.value = String.substitute(
                        Seek.strings.getString("seek.remainingTime.seconds"),
                        [ remaining ]
                    );
                } else {
                    remainingLabel.value =
                        Seek.strings.getString("seek.remainingTime.almostDone");
                }
            }
            progress.value = percent;
        },
        Seek._onFinishIndexingJob
    );
};

Seek.onCancelIndexing = function() {
    Seek.Indexer.cancelIndexingJob();
    
    var deck = document.getElementById("seekPane-deck");
    deck.selectedIndex = 1;
};

Seek.toggleShowThreads = function() {
    Seek._currentSettings.showThreads = document.getElementById("seekPane-browsingLayer-showThreads").checked;
    Seek._rewireThreadPane();
    Seek._saveSettings();
};

Seek.toggleShowNewMessages = function() {
    Seek._currentSettings.showNewMessages = document.getElementById("seekPane-browsingLayer-showNewMessages").checked;
    Seek._rewireThreadPane();
    Seek._saveSettings();
};

Seek._disposeFacets = function() {
    for (var i = 0; i < Seek._facets.length; i++) {
        Seek._facets[i].dispose();
    }
    Seek._facets = [];
    
    var facetContainer = Seek._getFacetContainer();
    while (facetContainer.firstChild != null) {
        facetContainer.removeChild(facetContainer.firstChild);
    }
}

Seek._getFacetContainer = function() {
    return document.getElementById("seekPane-browsingLayer-facetContainer");
};

Seek._onFinishIndexingJob = function() {
    Seek._collection = Seek.Collection.createTypeBasedCollection(
        "default", Seek._database, [ "Message" ]);
    Seek._collection.addListener({
        onItemsChanged: Seek._onCollectionItemsChanged
    });
    
    Seek._retrieveSettings();
    
    document.getElementById("seekPane-browsingLayer-showThreads").checked = 
        Seek._currentSettings.showThreads;
    document.getElementById("seekPane-browsingLayer-showNewMessages").checked = 
        Seek._currentSettings.showNewMessages;
        
    document.getElementById("seekPane-browsingLayer-textSearch-input").value = "";
    document.getElementById("seekPane-browsingLayer-textSearch-pastEntry").hidden = true;

    var deck = document.getElementById("seekPane-deck");
    deck.selectedIndex = 3;
    
    var spacer = document.createElement("spacer");
    spacer.style.width = "5px";
    Seek._getFacetContainer().appendChild(spacer);
    
    if ("facetNames" in Seek._currentSettings) {
        var facetNames = Seek._currentSettings.facetNames;
        for (var i = 0; i < facetNames.length; i++) {
            Seek.appendFacet(facetNames[i]);
        }
    } else {
        for (var n in Seek.FacetConfigurations.possibleFacets) {
            var config = Seek.FacetConfigurations.possibleFacets[n];
            if (config.showInitially) {
                Seek.appendFacet(n);
            }
        }
    }
    Seek._rewireThreadPane();
    Seek._setCounts();
};

Seek.appendFacet = function(name) {
    var facetContainer = Seek._getFacetContainer();
    
    var vbox = document.createElement("vbox");
    vbox.style.width = "17em";
    facetContainer.insertBefore(vbox, facetContainer.lastChild);
    
    var facet = Seek.FacetConfigurations[name](
        Seek._database,
        Seek._collection,
        vbox
    );
    
    facetContainer.insertBefore(Seek.FacetUtilities.createFacetSplitter(), facetContainer.lastChild);
    
    Seek._facets.push(facet);
    
    Seek._saveSettings();
    
    return facet;
};

Seek.removeFacet = function(facet) {
    for (var i = 0; i < Seek._facets.length; i++) {
        if (Seek._facets[i] == facet) {
            facet.dispose();
            Seek._facets.splice(i, 1);
            
            var facetContainer = Seek._getFacetContainer();
            facetContainer.removeChild(facetContainer.childNodes[i * 2]);
            facetContainer.removeChild(facetContainer.childNodes[i * 2]); // remove the resizer, too
            
            Seek._saveSettings();
            break;
        }
    }
};

Seek._onCollectionItemsChanged = function() {
    if (!Seek._processingUpdates) {
        try {
            Seek._rewireThreadPane();
            Seek._setCounts();
        } catch (e) {
            alert(e);
        }
    }
};

Seek._setCounts = function() {
    var totalCount = Seek._selectedFolder.getTotalMessages(false);
    var restrictedCount = this._collection.countRestrictedItems();
    
    document.getElementById("seekPane-browsingLayer-count-number").value = restrictedCount;
    document.getElementById("seekPane-browsingLayer-count-message").value =
        (restrictedCount < totalCount) ?
        String.substitute(
            Seek.strings.getString("seek.filterStatus.withFilters"),
            [ totalCount ]
        ) : 
        Seek.strings.getString("seek.filterStatus.noFilter")
}

Seek._relinquishThreadPaneOurselves = function() {
    if ("_oldDBView" in Seek) {
        if (Seek._selectedFolder != null && Seek._dbChangeListener != null) {
            var msgDatabase = Seek._selectedFolder.getMsgDatabase(msgWindow);
            msgDatabase.RemoveListener(Seek._dbChangeListener);
            Seek._dbChangeListener = null;
        }
        
        var treeView = Seek._getOurOwnTreeView();
        treeView.selection.clearSelection();
        gCurrentMessageUri = null;
        gCurrentFolderUri = null;
        
        gDBView = Seek._oldDBView;
        delete Seek._oldDBView;
        
        GetThreadTree().treeBoxObject.view = gDBView;
    }
};

Seek._rewireThreadPane = function() {
    if (!("_oldDBView" in Seek)) {
        Seek._oldDBView = gDBView;
    }
    Seek._currentSettings.sortType = gDBView.sortType;
    Seek._currentSettings.sortOrder = gDBView.sortOrder;
    
    var collection = Seek._collection;
    var items = Seek._collection.getRestrictedItems();
    var database = Seek._database;
    
    var baseMsgKeyArray = [];
    items.visit(function(itemID) {
        baseMsgKeyArray.push(database.getObject(itemID, "msgKey"));
    });
    
    var treeView = new Seek.ThreadTreeView(
        gDBView,
        Seek._selectedFolder,
        baseMsgKeyArray,
        Seek._currentSettings
    );
    gDBView = treeView;
    
    GetThreadTree().treeBoxObject.view = treeView;
};

Seek._createDBChangeListener = function() {
    var msgDatabase = Seek._selectedFolder.getMsgDatabase(msgWindow);
    var l = new Seek.DBChangeListener(msgDatabase);
    l.onHdrChange = Seek._onHdrChange;
    l.onHdrAdded = Seek._onHdrAdded;
    l.onHdrDeleted = Seek._onHdrDeleted;
    return l;
};

Seek._onHdrChange = function(hdrChanged, oldFlags, newFlags, instigator) {
    if (Seek._hasOurOwnTreeView()) {
        Seek._getOurOwnTreeView().onHdrChange(hdrChanged);
    }
};

Seek._onHdrAdded = function(hdrChanged, parentKey, flags, instigator) {
    /*
     *  Flagging _processingUpdates will let us update the thread tree incrementally
     *  while the facets get updated the usual way. This avoids reconstructing the
     *  whole thread tree.
     */
    Seek._processingUpdates = true;
    
        var entityMap = {};
        var items = [];
        Seek.Indexer.indexMsg(hdrChanged, Seek._database, entityMap, items);
        Seek._database.loadItems(items, "");
        
        if (Seek._hasOurOwnTreeView()) {
            var msgKey = hdrChanged.messageKey;
            var itemID = Seek.Indexer.makeMessageID(msgKey);
            
            var collection = Seek._collection;
            var items = Seek._collection.getRestrictedItems()
            
            var treeView = Seek._getOurOwnTreeView();
            if (items.contains(itemID)) {
                treeView.onNewMatch(msgKey);
            } else {
                treeView.onHdrChange(hdrChanged);
            }
            
            Seek._setCounts();
        }
    Seek._processingUpdates = false;
};

Seek._onHdrDeleted = function(hdrChanged, parentKey, flags, instigator) {
    var msgKey = hdrChanged.messageKey;
    var itemID = Seek.Indexer.makeMessageID(msgKey);
    Seek._database.removeItem(itemID);
    Seek._collection._update();
    
    // TODO: we need to update the thread tree in a more incremental manner
    
    if (Seek._hasOurOwnTreeView()) {
        var collection = Seek._collection;
        var items = Seek._collection.getRestrictedItems();
        
        var treeView = Seek._getOurOwnTreeView();
        if (!items.contains(itemID)) {
            treeView.onHdrChange(hdrChanged);
        }
    }
};

Seek._hasOurOwnTreeView = function() {
    return ("_oldDBView" in Seek);
};

Seek._getOurOwnTreeView = function() {
    return GetThreadTree().treeBoxObject.view.wrappedJSObject;
};

Seek._retrieveSettings = function() {
    Seek._ensureSettingsLoaded();
    
    var name = Seek._selectedFolder.name;
    if (name in Seek._folderSettings) {
        Seek._currentSettings = Seek._folderSettings[name];
    } else {
        Seek._currentSettings = {
            showThreads:        false,
            showNewMessages:    false
        };
    }
};

Seek._ensureSettingsLoaded = function() {
    if (Seek._folderSettings == null) {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
        var s = null;
        try {
            s = prefs.getCharPref("extensions.seek.folderSettings");
        } catch (e) {}
        
        if (s != null && s.length > 0) {
            Seek._folderSettings = eval("(" + s + ")");
        } else {
            Seek._folderSettings = {}
        }
    }
};

Seek._saveSettings = function() {
    Seek._ensureSettingsLoaded();
    
    var settings = {
        showThreads:        document.getElementById("seekPane-browsingLayer-showThreads").checked,
        showNewMessages:    document.getElementById("seekPane-browsingLayer-showNewMessages").checked,
        facetNames:         []
    };
    
    for (var i = 0; i < Seek._facets.length; i++) {
        settings.facetNames.push(Seek._facets[i].name);
    }
    
    Seek._folderSettings[Seek._selectedFolder.name] = settings;
    
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    prefs.setCharPref(
        "extensions.seek.folderSettings", 
        Seek.JSON.toJSONString(Seek._folderSettings));
};

Seek._getFolderSettingsPrefKey = function() {
    return "seek.folder." + Seek._selectedFolder.name + ".settings";
}

Seek.createSearchSession = function() {
    var searchSession = Components.classes["@mozilla.org/messenger/searchSession;1"].
        createInstance(Components.interfaces.nsIMsgSearchSession);
        
    searchSession.addScopeTerm(
        Seek._selectedFolder.server.searchScope, 
        Seek._selectedFolder
    );
    
    return searchSession;
}

Seek.onContentSearchInputKeyUp = function(event) {
    if (event.keyCode == 13) {
        var contentSearchInput = document.getElementById("seekPane-browsingLayer-textSearch-input");
        var text = contentSearchInput.value.trim();
        
        if (text.length == 0) {
            document.getElementById("seekPane-browsingLayer-textSearch-pastEntry").hidden = true;
            Seek._collection.setContentSearch([], "all");
        } else {
            var searchMode = document.getElementById("seekPane-browsingLayer-textSearch-mode").value;
            var searchTerms = (searchMode == "phrase") ? [ text ] : text.split(" ");
            
            document.getElementById("seekPane-browsingLayer-textSearch-pastEntry-description").value = text;
            document.getElementById("seekPane-browsingLayer-textSearch-pastEntry").hidden = false;
            
            Seek._collection.setContentSearch(searchTerms, searchMode);
        }
    }
}

Seek.onClearContentSearch = function() {
    document.getElementById("seekPane-browsingLayer-textSearch-input").value = "";
    document.getElementById("seekPane-browsingLayer-textSearch-pastEntry").hidden = true;
    Seek._collection.setContentSearch([], "all");
}

Seek.visualize = function() {
    window.openDialog(
        "chrome://seek/content/visualize.xul",
        "seek-visualize",
        "chrome,dialog=no,all",
        null,
        { database: Seek._database }
    );
}