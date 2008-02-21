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
    _visible:           false,
    _selectedFolder:    null,
    _database:          null,
    _facets:            []    
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

KeeperFinder.cancelEvent = function(evt) {
    evt.returnValue = false;
    evt.cancelBubble = true;
    if ("preventDefault" in evt) {
        evt.preventDefault();
    }
    return false;
};

KeeperFinder.onLoad = function() {
    // initialization code
    KeeperFinder.initialized = true;
    KeeperFinder.strings = document.getElementById("keeperfinder-strings");
    
    window.addEventListener("mousemove", KeeperFinder.onWindowMouseMove, false);
    window.addEventListener("mouseup", KeeperFinder.onWindowMouseUp, false);
};
window.addEventListener("load", KeeperFinder.onLoad, false);

KeeperFinder.onToggleKeeperFinder = function(menuItem) {
    KeeperFinder._visible = !KeeperFinder._visible;
    
    var deck = document.getElementById("keeperFinderPane-deck");
    var splitter = document.getElementById("keeperFinder-mainSplitter");
    
    menuItem.setAttribute("checked", KeeperFinder._visible);
    deck.hidden = !KeeperFinder._visible;
    splitter.hidden = !KeeperFinder._visible;
}

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
    KeeperFinder._disposeFacets();
    
    var progress = document.getElementById("keeperFinderPane-indexingLayer-progress");
    progress.value = 0;
    
    var deck = document.getElementById("keeperFinderPane-deck");
    deck.selectedIndex = 2; // indexing UI
    
    var remainingLabel = document.getElementById("keeperFinderPane-indexingLayer-remaining");
    remainingLabel.value = "";
    
    var start = new Date().getTime();
    
    KeeperFinder._database = KeeperFinder.Database.create();
    KeeperFinder.Indexer.startIndexingJob(
        KeeperFinder._database, 
        KeeperFinder._selectedFolder,
        function(percent) {
            if (percent > 5) {
                var now = new Date().getTime();
                var ellapsed = (now - start) / 1000; // in seconds
                var remaining = Math.ceil(ellapsed * (100 - percent) / percent);
                if (remaining >= 120) {
                    remainingLabel.value = String.substitute(
                        KeeperFinder.strings.getString("keeperFinder.remainingTime.minutes"),
                        [ Math.floor(remaining / 60) ]
                    );
                } else if (remaining > 60) {
                    var seconds = remaining - 60;
                    remainingLabel.value = String.substitute(
                        KeeperFinder.strings.getString("keeperFinder.remainingTime.oneMinuteMore"),
                        [ seconds ]
                    );
                } else if (remaining > 1) {
                    remainingLabel.value = String.substitute(
                        KeeperFinder.strings.getString("keeperFinder.remainingTime.seconds"),
                        [ remaining ]
                    );
                } else {
                    remainingLabel.value =
                        KeeperFinder.strings.getString("keeperFinder.remainingTime.almostDone");
                }
            }
            progress.value = percent;
        },
        KeeperFinder._onFinishIndexingJob
    );
};

KeeperFinder.onCancelIndexing = function() {
    KeeperFinder.Indexer.cancelIndexingJob();
    
    var deck = document.getElementById("keeperFinderPane-deck");
    deck.selectedIndex = 1;
};

KeeperFinder._disposeFacets = function() {
    for (var i = 0; i < KeeperFinder._facets.length; i++) {
        KeeperFinder._facets[i].dispose();
    }
    KeeperFinder._facets = [];
    
    var facetContainer = KeeperFinder._getFacetContainer();
    while (facetContainer.firstChild != null) {
        facetContainer.removeChild(facetContainer.firstChild);
    }
}

KeeperFinder._getFacetContainer = function() {
    return document.getElementById("keeperFinderPane-browsingLayer-facetContainer");
};

KeeperFinder._onFinishIndexingJob = function() {
    var deck = document.getElementById("keeperFinderPane-deck");
    deck.selectedIndex = 3;
    
    KeeperFinder._collection = KeeperFinder.Collection.createTypeBasedCollection(
        "default", KeeperFinder._database, [ "Message" ]);
    KeeperFinder._collection.addListener({
        onItemsChanged: KeeperFinder._onCollectionItemsChanged
    });
    
    var facetContainer = KeeperFinder._getFacetContainer();
    var appendFacet = function(name) {
        var vbox = document.createElement("vbox");
        vbox.style.width = "17em";
        facetContainer.appendChild(vbox);
        
        var facet = KeeperFinder.FacetAdapters[name](
            KeeperFinder._database,
            KeeperFinder._collection,
            vbox
        );
        
        facetContainer.appendChild(KeeperFinder.FacetUtilities.createFacetSplitter());
        
        KeeperFinder._facets.push(facet);
        
        return facet;
    }
    appendFacet("from domain");
    appendFacet("from");
    appendFacet("to/cc domain");
    appendFacet("to/cc");
    appendFacet("tag");
    
    var spacer = document.createElement("spacer");
    spacer.style.width = "5px";
    facetContainer.appendChild(spacer);
};

KeeperFinder._onCollectionItemsChanged = function() {
    var collection = KeeperFinder._collection;
    var items = KeeperFinder._collection.getRestrictedItems()
    KeeperFinder.log(items.size());
    
    try {
        initializeSearchBar();
        RerootThreadPane();
        
        gSearchSession.clearScopes();
        
        var searchTerms = gSearchSession.searchTerms;
        var searchTermsArray = searchTerms.QueryInterface(Components.interfaces.nsISupportsArray);
        searchTermsArray.Clear();
        
        var termsArray = Components.classes["@mozilla.org/supports-array;1"].
            createInstance(Components.interfaces.nsISupportsArray);
            
        var facets = collection.getFacets();
        for (var i = 0; i < facets.length; i++) {
            var facet = facets[i];
            if ("getSearchTerm" in facet) {
                termsArray.AppendElement(facet.getSearchTerm());
            }
        }
            
        var ioService = Components.classes["@mozilla.org/network/io-service;1"].
            getService(Components.interfaces.nsIIOService);
            
        gSearchSession.addScopeTerm(
            getScopeToUse(termsArray, KeeperFinder._selectedFolder, ioService.offline), 
            KeeperFinder._selectedFolder
        );
        
        for (var i = 0; i < termsArray.Count(); i++) {
            gSearchSession.appendTerm(termsArray.GetElementAt(i).QueryInterface(Components.interfaces.nsIMsgSearchTerm));
        }
    
        gDBView.searchSession = gSearchSession;
        gSearchSession.search(msgWindow);
    } catch (e) {
        alert(e);
    }
};
