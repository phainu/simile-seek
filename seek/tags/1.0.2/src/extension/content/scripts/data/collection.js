/*======================================================================
 *  Collection
 *======================================================================
 */
Seek.Collection = function(id, database) {
    this._id = id;
    this._database = database;
    
    this._listeners = new Seek.ListenerQueue();
    this._facets = [];
    this._contentSearchTerms = [];
    this._contentSearchMode = "all";
    this._updating = false;
    
    this._items = null;
    this._restrictedItems = null;
};

Seek.Collection.createAllItemsCollection = function(id, database) {
    var collection = new Seek.Collection(id, database);
    collection._internalUpdate = Seek.Collection._allItemsCollection_update;
    
    Seek.Collection._initializeBasicCollection(collection, database);
    
    return collection;
};

Seek.Collection.createTypeBasedCollection = function(id, database, itemTypes) {
    var collection = new Seek.Collection(id, database);
    collection._itemTypes = itemTypes;
    collection._internalUpdate = Seek.Collection._typeBasedCollection_update;
    
    Seek.Collection._initializeBasicCollection(collection, database);
    
    return collection;
};

Seek.Collection._initializeBasicCollection = function(collection, database) {
    var update = function() { collection._update(); };
    collection._listener = { 
        onAfterLoadingItems: update,
        onAfterRemovingAllStatements: update
    };
    database.addListener(collection._listener);
        
    collection._update();
};

/*======================================================================
 *  Implementation
 *======================================================================
 */
Seek.Collection._allItemsCollection_update = function() {
    this._items = this._database.getAllItems();
};

Seek.Collection._typeBasedCollection_update = function() {
    var newItems = new Seek.Set();
    for (var i = 0; i < this._itemTypes.length; i++) {
        this._database.getSubjects(this._itemTypes[i], "type", newItems);
    }
    
    this._items = newItems;
};

/*======================================================================
 *  Common Implementation
 *======================================================================
 */
Seek.Collection.prototype.getID = function() {
    return this._id;
};

Seek.Collection.prototype.dispose = function() {
    if ("_baseCollection" in this) {
        this._baseCollection.removeListener(this._listener);
        this._baseCollection = null;
        this._expression = null;
    } else {
        this._database.removeListener(this._listener);
    }
    this._database = null;
    this._listener = null;
    
    this._listeners = null;
    this._items = null;
    this._restrictedItems = null;
};

Seek.Collection.prototype.addListener = function(listener) {
    this._listeners.add(listener);
};

Seek.Collection.prototype.removeListener = function(listener) {
    this._listeners.remove(listener);
};

Seek.Collection.prototype.getFacets = function() {
    return [].concat(this._facets);
};

Seek.Collection.prototype.addFacet = function(facet) {
    this._facets.push(facet);
    
    if (facet.hasRestrictions()) {
        this._computeRestrictedItems();
        this._updateFacets(null);
        this._listeners.fire("onItemsChanged", []);
    } else {
        facet.update(this.getRestrictedItems());
    }
};

Seek.Collection.prototype.removeFacet = function(facet) {
    for (var i = 0; i < this._facets.length; i++) {
        if (facet == this._facets[i]) {
            this._facets.splice(i, 1);
            if (facet.hasRestrictions()) {
                this._computeRestrictedItems();
                this._updateFacets(null);
                this._listeners.fire("onItemsChanged", []);
            }
            break;
        }
    }
};

Seek.Collection.prototype.clearAllRestrictions = function() {
    var restrictions = [];
    
    this._updating = true;
    for (var i = 0; i < this._facets.length; i++) {
        restrictions.push(this._facets[i].clearAllRestrictions());
    }
    this._updating = false;
    
    this.onFacetUpdated(null);
    
    return restrictions;
};

Seek.Collection.prototype.applyRestrictions = function(restrictions) {
    this._updating = true;
    for (var i = 0; i < this._facets.length; i++) {
        this._facets[i].applyRestrictions(restrictions[i]);
    }
    this._updating = false;
    
    this.onFacetUpdated(null);
};

Seek.Collection.prototype.setContentSearch = function(searchTerms, searchMode) {
    this._contentSearchTerms = searchTerms;
    this._contentSearchMode = searchMode;
    this._update();
};

Seek.Collection.prototype.getAllItems = function() {
    return new Seek.Set(this._items);
};

Seek.Collection.prototype.countAllItems = function() {
    return this._items.size();
};

Seek.Collection.prototype.getRestrictedItems = function() {
    return new Seek.Set(this._restrictedItems);
};

Seek.Collection.prototype.countRestrictedItems = function() {
    return this._restrictedItems.size();
};

Seek.Collection.prototype.onFacetUpdated = function(facetChanged) {
    if (!this._updating) {
        this._computeRestrictedItems();
        this._updateFacets(facetChanged);
        this._listeners.fire("onItemsChanged", []);
    }
}

Seek.Collection.prototype._update = function() {
    this._internalUpdate();
    if (this._contentSearchTerms.length > 0) {
        this._performSearchWithUI();
    } else {
        this._onRootItemsChanged();
    }
};

Seek.Collection.prototype._onRootItemsChanged = function() {
    this._listeners.fire("onRootItemsChanged", []);
    
    this._computeRestrictedItems();
    this._updateFacets(null);
    
    this._listeners.fire("onItemsChanged", []);
};

Seek.Collection.prototype._updateFacets = function(facetChanged) {
    var restrictedFacetCount = 0;
    for (var i = 0; i < this._facets.length; i++) {
        if (this._facets[i].hasRestrictions()) {
            restrictedFacetCount++;
        }
    }
    
    for (var i = 0; i < this._facets.length; i++) {
        var facet = this._facets[i];
        if (facet.hasRestrictions()) {
            if (restrictedFacetCount <= 1) {
                facet.update(this.getAllItems());
            } else {
                var items = this.getAllItems();
                for (var j = 0; j < this._facets.length; j++) {
                    if (i != j) {
                        items = this._facets[j].restrict(items);
                    }
                }
                facet.update(items);
            }
        } else {
            facet.update(this.getRestrictedItems());
        }
    }
};

Seek.Collection.prototype._computeRestrictedItems = function() {
    this._restrictedItems = this._items;
    for (var i = 0; i < this._facets.length; i++) {
        var facet = this._facets[i];
        if (facet.hasRestrictions()) {
            this._restrictedItems = facet.restrict(this._restrictedItems);
        }
    }
};

Seek.Collection.prototype._performSearchWithUI = function() {
    var self = this;
    var database = this._database;
    var items = new Seek.Set();
    
    var listener = {
        onNewSearch: function() {},
        onSearchDone: function() {
            searchSession.unregisterListener(listener);
            
            parameters.onDone();
            
            self._onDoneContentSearch(items);
        },
        onSearchHit: function(msgHdr, msgFolder) {
            var itemID = Seek.Indexer.makeMessageID(msgHdr.messageKey);
            if (database.containsItem(itemID)) {
                items.add(itemID);
                parameters.setMessage(String.substitute(
                    Seek.strings.getString("seek.contentSearch.matchCount"),
                    [ items.size() ]
                ));
            }
        }
    };
    
    var searchSession = Seek.createSearchSession()
    searchSession.registerListener(listener);
    this._appendSearchTerms(searchSession);
        
    var parameters = {
        onStart: function() {
            searchSession.search(msgWindow);
        },
        onCancel: function() {
            searchSession.interruptSearch();
            searchSession.unregisterListener(listener);
        }
    };
    
    window.openDialog(
        "chrome://seek/content/search-progress.xul",
        "seek-searchProgress",
        "chrome,dialog,modal,resizable=no,centerscreen",
        null,
        parameters
    );
};

Seek.Collection.prototype._appendSearchTerms = function(searchSession) {
    var booleanAnd = (this._contentSearchMode == "all");
    for (var i = 0; i < this._contentSearchTerms.length; i++) {
        var term = searchSession.createTerm();
        var value = term.value;
        value.str = this._contentSearchTerms[i];
        
        term.value = value;
        term.attrib = Components.interfaces.nsMsgSearchAttrib.Body;
        term.op = Components.interfaces.nsMsgSearchOp.Contains;
        term.booleanAnd = booleanAnd;
        
        searchSession.appendTerm(term);
    }
};

Seek.Collection.prototype._onDoneContentSearch = function(items) {
    this._items = items;
    this._onRootItemsChanged();
};
