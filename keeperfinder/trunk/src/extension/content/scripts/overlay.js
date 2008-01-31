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

var KeeperFinder = {
    _selectedFolder:    null,
    _database:          null
};

KeeperFinder.log = function(msg) {
    Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService)
            .logStringMessage(msg);
};
KeeperFinder.warn = function(msg) {
    Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService)
            .logStringMessage(msg);
};
KeeperFinder.exception = function(e) {
    Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService)
            .logMessage(e);
};

KeeperFinder.onLoad = function() {
    // initialization code
    this.initialized = true;
    this.strings = document.getElementById("keeperfinder-strings");
    document.getElementById("threadPaneContext")
            .addEventListener("popupshowing", function(e) { this.showContextMenu(e); }, false);
};
window.addEventListener("load", function(e) { KeeperFinder.onLoad(e); }, false);

KeeperFinder.showContextMenu = function(event) {
    // show or hide the menuitem based on what the context menu is on
    // see http://kb.mozillazine.org/Adding_items_to_menus
    document.getElementById("context-keeperfinder").hidden = (GetNumSelectedMessages() > 0);
};

KeeperFinder.onMenuItemCommand = function(e) {
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    promptService.alert(window, this.strings.getString("helloMessageTitle"),
                                this.strings.getString("helloMessage"));
};

KeeperFinder.onToolbarButtonCommand = function(e) {
    // just reuse the function above.  you can change this, obviously!
    keeperfinder.onMenuItemCommand(e);
};

KeeperFinder._getCurrentlySelectedFolder = function() {
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
    oldFolderPaneSelectionChange();
    
    var msgFolder = KeeperFinder._getCurrentlySelectedFolder();
    if (KeeperFinder._selectedFolder != msgFolder) {
        KeeperFinder.Indexer.cancelIndexingJob();
        
        KeeperFinder._selectedFolder = msgFolder;
        
        var deck = document.getElementById("keeperFinderPane-deck");
        
        var msgDatabase = msgFolder.getMsgDatabase(msgWindow);
        if (msgDatabase) {
            deck.selectedIndex = 1; // UI for starting indexing
        } else {
            deck.selectedIndex = 0; // don't support message
        }
    }
};

KeeperFinder.onStartIndexingFolder = function() {
    var progress = document.getElementById("keeperFinderPane-indexingLayer-progress");
    progress.value = 0;
    
    var deck = document.getElementById("keeperFinderPane-deck");
    deck.selectedIndex = 2; // indexing UI
    
    KeeperFinder._database = KeeperFinder.Database.create();
    KeeperFinder.Indexer.startIndexingJob(
        KeeperFinder._database, 
        KeeperFinder._selectedFolder,
        function(percent) {
            progress.value = percent;
        },
        KeeperFinder._onFinishIndexingJob
    );
};

KeeperFinder._onFinishIndexingJob = function() {
    var deck = document.getElementById("keeperFinderPane-deck");
    deck.selectedIndex = 3;
    
    KeeperFinder._collection = KeeperFinder.Collection.createTypeBasedCollection(
        "default", KeeperFinder._database, [ "Message" ]);
    KeeperFinder._collection.addListener({
        onItemsChanged: function() {
            KeeperFinder.log(KeeperFinder._collection.countRestrictedItems());
        }
    });
    
    var facetContainer = document.getElementById("keeperFinderPane-browsingLayer-facetContainer");
    while (facetContainer.firstChild != null) {
        facetContainer.removeChild(facetContainer.firstChild);
    }
    
    var appendFacet = function(settings) {
        var vbox = document.createElement("vbox");
        vbox.style.width = "17em";
        facetContainer.appendChild(vbox);
        
        var facet = new KeeperFinder.ListFacet(
            KeeperFinder._database, 
            KeeperFinder._collection, 
            vbox, 
            settings
        );
        
        var splitter = document.createElement("splitter");
        splitter.resizebefore = "closest";
        facetContainer.appendChild(splitter);
    }
    
    appendFacet({
        facetLabel:     "To/CC",
        expression:     ".recipient",
        sortMode:       "value",
        sortDirection:  "forward",
        showMissing:    true,
        missingLabel:   "(No recipient)"
    });
    
    appendFacet({
        facetLabel:     "To/CC domain",
        expression:     ".recipient.domain",
        sortMode:       "value",
        sortDirection:  "forward",
        showMissing:    true,
        missingLabel:   "(No domain)"
    });
    
    appendFacet({
        facetLabel:     "From",
        expression:     ".author",
        sortMode:       "value",
        sortDirection:  "forward",
        showMissing:    true,
        missingLabel:   "(No sender)"
    });
    
    appendFacet({
        facetLabel:     "From domain",
        expression:     ".author.domain",
        sortMode:       "value",
        sortDirection:  "forward",
        showMissing:    true,
        missingLabel:   "(No domain)"
    });
    
    appendFacet({
        facetLabel:     "Tag",
        expression:     ".tag",
        sortMode:       "value",
        sortDirection:  "forward",
        showMissing:    true,
        missingLabel:   "(No tag)"
    }, true);
    
    var spacer = document.createElement("spacer");
    spacer.style.width = "20px";
    facetContainer.appendChild(spacer);
};
