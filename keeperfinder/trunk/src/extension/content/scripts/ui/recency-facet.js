/*==================================================
 *  KeeperFinder.RecencyFacet
 *==================================================
 */

KeeperFinder.RecencyFacet = function(name, database, collection, box, settings) {
    this.name = name;
    this._database = database;
    this._collection = collection;
    this._box = box;
    this._settings = settings;
    
    this._now = new Date().getTime();
    this._expression = KeeperFinder.ExpressionParser.parse(settings.expression);
    this._selection = null;
    
    var self = this;
    this._listener = { 
        onRootItemsChanged: function() {
            if ("_rangeIndex" in self) {
                delete self._rangeIndex;
            }
        }
    };
    this._collection.addListener(this._listener);
    this._cache = new KeeperFinder.FacetCache(database, collection, this._expression);
    
    this._initializeUI();
    this._collection.addFacet(this);
};

KeeperFinder.RecencyFacet._settingSpecs = {
    "facetLabel":       { type: "text" }
};

KeeperFinder.RecencyFacet.prototype.dispose = function() {
    this._cache.dispose();
    this._cache = null;
    
    this._collection.removeListener(this._listener);
    this._collection.removeFacet(this);
    this._collection = null;
    this._listener = null;
    
    this._box = null;
    
    this._expression = null;
    this._selection = null;
    this._settings = null;
};

KeeperFinder.RecencyFacet.prototype.hasRestrictions = function() {
    return this._selection != null;
};

KeeperFinder.RecencyFacet.prototype.clearAllRestrictions = function() {
    var restrictions = this._selection;
    if (this.hasRestrictions()) {
        this._selection = null;
        this._notifyCollection();
    }
    return restrictions;
};

KeeperFinder.RecencyFacet.prototype.applyRestrictions = function(restrictions) {
    this._selection = restrictions;
    this._notifyCollection();
};

KeeperFinder.RecencyFacet.prototype.restrict = function(items) {
    if (!this.hasRestrictions()) {
        return items;
    }
    
    this._buildRangeIndex();
    
    var recency = KeeperFinder.RecencyFacet.computeRecency();
    var from = recency[this._selection];
    var to = new Date().getTime();
    
    return this._rangeIndex.getSubjectsInRange(from, to, false, null, items);
};

KeeperFinder.RecencyFacet.prototype.update = function(items) {
    if (!this._changingSelection) {
        this._entries = this._computeFacet(items);
        this._constructBody();
    }
};

KeeperFinder.RecencyFacet.prototype._computeFacet = function(items) {
    this._buildRangeIndex();

    var database = this._database;
    var entries = [];
    
    var recency = KeeperFinder.RecencyFacet.computeRecency();
    var to = new Date().getTime();
    var selection = this._selection;
    
    var rangeIndex = this._rangeIndex;
    var addEntry = function(value) {
        var count = rangeIndex.getSubjectsInRange(recency[value], to, false, null, items).size();
        if (count > 0 || selection == value) {
            entries.push({
                value:          value,
                selectionLabel: value,
                count:          count,
                selected:       selection == value
            });
        }
    };
    
    for (var n in recency) {
        addEntry(n);
    }
    
    return entries;
}

KeeperFinder.RecencyFacet.prototype._notifyCollection = function() {
    this._collection.onFacetUpdated(this);
};

KeeperFinder.RecencyFacet.prototype._initializeUI = function() {
    this._dom = KeeperFinder.FacetUtilities.constructFacetFrame(
        this._box,
        this._settings.facetLabel,
        false
    );
    this._dom.valuesContainer.selType = "single";
    this._registerEventListeners();
};

KeeperFinder.RecencyFacet.prototype.refresh = function() { 
    this._registerEventListeners();  
    this._constructBody();
};

KeeperFinder.RecencyFacet.prototype._registerEventListeners = function() {
    var self = this;
    this._dom.reset.onmousedown = function(event) {
        return KeeperFinder.cancelEvent(event);
    };
    this._dom.reset.onclick = function(event) {
        self.clearAllRestrictions();
    };
    this._dom.valuesContainer.onselect = function() {
        if (!self._constructingBody) {
            self._onSelectionChange(self._dom.valuesContainer.treeBoxObject.view.wrappedJSObject);
        }
        return true;
    };
    this._dom.headerLabel.onmousedown = function(e) {
        KeeperFinder.startDraggingFacet(e, self, self._box);
    };
    this._dom.closeButton.onclick = function(e) {
        KeeperFinder.removeFacet(self);
    };
};

KeeperFinder.RecencyFacet.prototype._constructBody = function() {   
    this._constructingBody = true;
    
    var entries = this._entries;
    var tree = this._dom.valuesContainer;
    var treeView = KeeperFinder.RecencyFacet._createTreeView(this, entries);
    tree.treeBoxObject.view = treeView;
    
    var selection = treeView.selection;
    for (var i = 0; i < entries.length; i++) {
        if (entries[i].selected) {
            selection.select(i);
        }
    }
    
    this._dom.setSelectionCount(this._selection != null ? 1 : 0);
    this._constructingBody = false;
};

KeeperFinder.RecencyFacet.prototype._onSelectionChange = function(view) {
    var restrictions = null;
    var entries = view.wrappedJSObject._entries;
    
    var rowCount = view.rowCount;
    for (var i = 0; i < rowCount; i++) {
        entries[i].selected = false;
    }
    
    var selection = view.selection;
    if (selection.count > 0) {
        restrictions = view.getValue(selection.currentIndex);
        entries[selection.currentIndex].selected = true;
    }
    
    this._changingSelection = true;
    this.applyRestrictions(restrictions);
    this._dom.setSelectionCount(selection.count);
    this._changingSelection = false;
};

KeeperFinder.RecencyFacet.prototype._buildRangeIndex = function() {
    if (!("_rangeIndex" in this)) {
        var expression = this._expression;
        var database = this._database;
        var getter = function(item, f) {
            expression.evaluateOnItem(item, database).values.visit(function(value) {
                if (typeof value != "number") {
                    value = parseFloat(value);
                }
                if (!isNaN(value)) {
                    f(value);
                }
            });
        };
    
        this._rangeIndex = new KeeperFinder.Database._RangeIndex(
            this._collection.getAllItems(),
            getter
        );    
    }
};

KeeperFinder.RecencyFacet._createTreeView = function(facet, entries) {
    var treeView = new KeeperFinder.StaticListTreeView();
    treeView._entries = entries;
    treeView.rowCount = entries.length;
    treeView.getCellText = function(row, column) {
        var entry = this._entries[row];
        switch (column.id) {
        case "count-column":
            return entry.count;
        case "value-column":
            return entry.selectionLabel;
        }
        return null;
    };
    treeView.getValue = function(row) {
        return this._entries[row].value;
    };

    return treeView;
};

KeeperFinder.RecencyFacet.computeRecency = function() {
    var result = {};
    
    var t = new Date();
    t.setMilliseconds(0);
    t.setSeconds(0);
    t.setMinutes(0);
    
    result["within the hour"] = t.getTime();
    
    t.setHours(0);
    
    result["today"] = t.getTime();
    result["since yesterday"] = t.getTime() - 24 * 60 * 60 * 1000;
    result["since 2 days ago"] = t.getTime() - 2 * 24 * 60 * 60 * 1000;
    result["within a week"] = t.getTime() - 6 * 24 * 60 * 60 * 1000;
    result["within 2 weeks"] = t.getTime() - 13 * 24 * 60 * 60 * 1000;
    result["within a month"] = t.getTime() - 30 * 24 * 60 * 60 * 1000;
    result["within 3 months"] = t.getTime() - 3 * 30 * 24 * 60 * 60 * 1000;
    
    return result;
};
