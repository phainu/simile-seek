/*======================================================================
 *  Collection
 *======================================================================
 */
KeeperFinder.Collection = function(id, database) {
    this._id = id;
    this._database = database;
    
    this._listeners = new KeeperFinder.ListenerQueue();
    this._facets = [];
    this._updating = false;
    
    this._items = null;
    this._restrictedItems = null;
};

KeeperFinder.Collection.createAllItemsCollection = function(id, database) {
    var collection = new KeeperFinder.Collection(id, database);
    collection._update = KeeperFinder.Collection._allItemsCollection_update;
    
    KeeperFinder.Collection._initializeBasicCollection(collection, database);
    
    return collection;
};

KeeperFinder.Collection.createTypeBasedCollection = function(id, database, itemTypes) {
    var collection = new KeeperFinder.Collection(id, database);
    collection._itemTypes = itemTypes;
    collection._update = KeeperFinder.Collection._typeBasedCollection_update;
    
    KeeperFinder.Collection._initializeBasicCollection(collection, database);
    
    return collection;
};

KeeperFinder.Collection._initializeBasicCollection = function(collection, database) {
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
KeeperFinder.Collection._allItemsCollection_update = function() {
    this._items = this._database.getAllItems();
    this._onRootItemsChanged();
};

KeeperFinder.Collection._typeBasedCollection_update = function() {
    var newItems = new KeeperFinder.Set();
    for (var i = 0; i < this._itemTypes.length; i++) {
        this._database.getSubjects(this._itemTypes[i], "type", newItems);
    }
    
    this._items = newItems;
    this._onRootItemsChanged();
};

/*======================================================================
 *  Common Implementation
 *======================================================================
 */
KeeperFinder.Collection.prototype.getID = function() {
    return this._id;
};

KeeperFinder.Collection.prototype.dispose = function() {
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

KeeperFinder.Collection.prototype.addListener = function(listener) {
    this._listeners.add(listener);
};

KeeperFinder.Collection.prototype.removeListener = function(listener) {
    this._listeners.remove(listener);
};

KeeperFinder.Collection.prototype.addFacet = function(facet) {
    this._facets.push(facet);
    
    if (facet.hasRestrictions()) {
        this._computeRestrictedItems();
        this._updateFacets(null);
        this._listeners.fire("onItemsChanged", []);
    } else {
        facet.update(this.getRestrictedItems());
    }
};

KeeperFinder.Collection.prototype.removeFacet = function(facet) {
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

KeeperFinder.Collection.prototype.clearAllRestrictions = function() {
    var restrictions = [];
    
    this._updating = true;
    for (var i = 0; i < this._facets.length; i++) {
        restrictions.push(this._facets[i].clearAllRestrictions());
    }
    this._updating = false;
    
    this.onFacetUpdated(null);
    
    return restrictions;
};

KeeperFinder.Collection.prototype.applyRestrictions = function(restrictions) {
    this._updating = true;
    for (var i = 0; i < this._facets.length; i++) {
        this._facets[i].applyRestrictions(restrictions[i]);
    }
    this._updating = false;
    
    this.onFacetUpdated(null);
};

KeeperFinder.Collection.prototype.getAllItems = function() {
    return new KeeperFinder.Set(this._items);
};

KeeperFinder.Collection.prototype.countAllItems = function() {
    return this._items.size();
};

KeeperFinder.Collection.prototype.getRestrictedItems = function() {
    return new KeeperFinder.Set(this._restrictedItems);
};

KeeperFinder.Collection.prototype.countRestrictedItems = function() {
    return this._restrictedItems.size();
};

KeeperFinder.Collection.prototype.onFacetUpdated = function(facetChanged) {
    if (!this._updating) {
        this._computeRestrictedItems();
        this._updateFacets(facetChanged);
        this._listeners.fire("onItemsChanged", []);
    }
}

KeeperFinder.Collection.prototype._onRootItemsChanged = function() {
    this._listeners.fire("onRootItemsChanged", []);
    
    this._computeRestrictedItems();
    this._updateFacets(null);
    
    this._listeners.fire("onItemsChanged", []);
};

KeeperFinder.Collection.prototype._updateFacets = function(facetChanged) {
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

KeeperFinder.Collection.prototype._computeRestrictedItems = function() {
    this._restrictedItems = this._items;
    for (var i = 0; i < this._facets.length; i++) {
        var facet = this._facets[i];
        if (facet.hasRestrictions()) {
            this._restrictedItems = facet.restrict(this._restrictedItems);
        }
    }
};
