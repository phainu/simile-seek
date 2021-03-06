/*==================================================
 *  Seek.FacetUtilities
 *
 *  Utilities for facets' code.
 *==================================================
 */
Seek.FacetUtilities = new Object();

Seek.FacetUtilities.createFacetSplitter = function() {
    var splitter = document.createElement("splitter");
    splitter.setAttribute("resizeafter", "grow");
    splitter.className = "seek-facetContainer-splitter";
    return splitter;
};

Seek.FacetUtilities.constructFacetFrame = function(parentVbox, facetLabel, hasFilter) {
    var header = document.getElementById("seek-facet-header").cloneNode(true);
    header.id = "";
    parentVbox.appendChild(header);
    header.childNodes[1].value = facetLabel;
    
    if (hasFilter) {
        var textbox = document.getElementById("seek-facet-quickFilter").cloneNode(true);
        textbox.id = "";
        parentVbox.appendChild(textbox);
    }
    
    var valuesContainer = document.getElementById("seek-facet-valuesContainer").cloneNode(true);
    valuesContainer.id = "";
    parentVbox.appendChild(valuesContainer);
    
    var r = {
        header: header,
        closeButton: header.childNodes[0],
        headerLabel: header.childNodes[1],
        reset: header.childNodes[2],
        valuesContainer: valuesContainer,
        setSelectionCount: function(count) {
            header.childNodes[2].style.display = (count > 0) ? "block" : "none";
        }
    };
    
    if (hasFilter) {
        r.filterInput = textbox.getElementsByTagName("input")[0];
        r.filterHintedTextbox = new Seek.HintedTextbox(
            r.filterInput,
            Seek.strings.getString("seek.facet.filterHint")
        );
    }
    
    return r;
};

Seek.FacetUtilities.constructFacetItem = function(
    listbox,
    label, 
    value,
    count, 
    selected, 
    facetHasSelection,
    onSelect,
    onSelectOnly
) {
    var listitem = listbox.appendItem(label, value);

    var listcell;
    
    listcell = document.createElement("listcell");
    listcell.setAttribute("label", count);
    listitem.appendChild(listcell);
        
    listcell = document.createElement("listcell");
    listcell.setAttribute("label", label);
    listitem.appendChild(listcell);
    
    /*SimileAjax.WindowManager.registerEvent(dom.elmt, "click", onSelectOnly, SimileAjax.WindowManager.getBaseLayer());
    if (facetHasSelection) {
        SimileAjax.WindowManager.registerEvent(dom.inner.firstChild, "click", onSelect, SimileAjax.WindowManager.getBaseLayer());
    }*/
    return listitem;
};

/*======================================================================
 *  Cache for item/value mapping
 *======================================================================
 */

Seek.FacetCache = function(database, collection, expression) {
    var self = this;
    
    this._database = database;
    this._collection = collection;
    this._expression = expression;
    
    this._listener = { 
        onRootItemsChanged: function() {
            if ("_itemToValue" in self) {
                delete self._itemToValue;
            }
            if ("_valueToItem" in self) {
                delete self._valueToItem;
            }
            if ("_missingItems" in self) {
                delete self._missingItems;
            }
        }
    };
    collection.addListener(this._listener);
}

Seek.FacetCache.prototype.dispose = function() {
    this._collection.removeListener(this._listener);
    this._collection = null;
    this._listener = null;
    
    this._itemToValue = null;
    this._valueToItem = null;
    this._missingItems = null;
}

Seek.FacetCache.prototype.getItemsFromValues = function(values, filter) {
    var set;
    if (this._expression.isPath()) {
        set = this._expression.getPath().walkBackward(
            values, 
            "item",
            filter, 
            this._database
        ).getSet();
    } else {
        this._buildMaps();
        
        set = new Seek.Set();
        
        var valueToItem = this._valueToItem;
        values.visit(function(value) {
            if (value in valueToItem) {
                var itemA = valueToItem[value];
                for (var i = 0; i < itemA.length; i++) {
                    var item = itemA[i];
                    if (filter.contains(item)) {
                        set.add(item);
                    }
                }
            }
        });
    }
    return set;
}

Seek.FacetCache.prototype.getItemsMissingValue = function(filter, results) {
    this._buildMaps();
    
    results = results || new Seek.Set();
        
    var missingItems = this._missingItems;
    filter.visit(function(item) {
        if (item in missingItems) {
            results.add(item);
        }
    });
    return results;
}

Seek.FacetCache.prototype.getValueCountsFromItems = function(items) {
    var entries = [];
    var database = this._database;
    var valueType = "text";
    
    if (this._expression.isPath()) {
        var path = this._expression.getPath();
        var facetValueResult = path.walkForward(items, "item", database);
        valueType = facetValueResult.valueType;
        
        if (facetValueResult.size > 0) {
            facetValueResult.forEachValue(function(facetValue) {
                var itemSubcollection = path.evaluateBackward(facetValue, valueType, items, database);
                entries.push({ value: facetValue, count: itemSubcollection.size });
            });
        };
    } else {
        this._buildMaps();
        
        valueType = this._valueType;
        for (var value in this._valueToItem) {
            var itemA = this._valueToItem[value];
            var count = 0;
            for (var i = 0; i < itemA.length; i++) {
                if (items.contains(itemA[i])) {
                    count++;
                }
            }
            
            if (count > 0) {
                entries.push({ value: value, count: count });
            }
        }
    }
    return { entries: entries, valueType: valueType };
}

Seek.FacetCache.prototype.getValuesFromItems = function(items) {
    if (this._expression.isPath()) {
        return this._expression.getPath().walkForward(items, "item", database).getSet();
    } else {
        this._buildMaps();
        
        var set = new Seek.Set();
        var itemToValue = this._itemToValue;
        items.visit(function(item) {
            if (item in itemToValue) {
                var a = itemToValue[item];
                for (var i = 0; i < a.length; i++) {
                    set.add(a[i]);
                }
            }
        });
        
        return set;
    }
}

Seek.FacetCache.prototype.countItemsMissingValue = function(items) {
    this._buildMaps();
    
    var count = 0;
    for (var item in this._missingItems) {
        if (items.contains(item)) {
            count++;
        }
    }
    return count;
}

Seek.FacetCache.prototype._buildMaps = function() {
    if (!("_itemToValue" in this)) {
        var itemToValue = {};
        var valueToItem = {};
        var missingItems = {};
        var valueType = "text";
        
        var insert = function(x, y, map) {
            if (x in map) {
                map[x].push(y);
            } else {
                map[x] = [ y ];
            }
        };
        
        var expression = this._expression;
        var database = this._database;
        
        this._collection.getAllItems().visit(function(item) {
            var results = expression.evaluateOnItem(item, database);
            if (results.values.size() > 0) {
                valueType = results.valueType;
                results.values.visit(function(value) {
                    insert(item, value, itemToValue);
                    insert(value, item, valueToItem);
                });
            } else {
                missingItems[item] = true;
            }
        });
        
        this._itemToValue = itemToValue;
        this._valueToItem = valueToItem;
        this._missingItems = missingItems;
        this._valueType = valueType;
    }
};


/*======================================================================
 *  Static list tree view
 *======================================================================
 */
Seek.StaticListTreeView = function() {
    this.wrappedJSObject = this;
};

Seek.StaticListTreeView.prototype = {
    setTree: function(treebox) {
        this.treebox = treebox;
    },
    setSelection: function(selection) {
        this.selection = selection;
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