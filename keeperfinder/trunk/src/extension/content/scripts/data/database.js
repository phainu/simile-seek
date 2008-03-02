/*======================================================================
 *  Seek.Database
 *======================================================================
 */

Seek.Database = new Object();

Seek.Database.create = function() {
    return new Seek.Database._Impl();
};

/*==================================================
 *  Seek.Database._Impl
 *==================================================
 */
Seek.Database._Impl = function() {
    this._types = {};
    this._properties = {};
    this._propertyArray = {};
    
    this._listeners = new Seek.ListenerQueue();
    
    this._spo = {};
    this._ops = {};
    this._items = new Seek.Set();
    
    /*
     *  Predefined types and properties
     */
     
    var l10n = Seek.Database.l10n;
    
    var itemType = new Seek.Database._Type("Item");
    itemType._custom = Seek.Database.l10n.itemType;
    this._types["Item"] = itemType;

    var labelProperty = new Seek.Database._Property("label");
    labelProperty._uri                  = "http://www.w3.org/2000/01/rdf-schema#label";
    labelProperty._valueType            = "text";
    labelProperty._label                = l10n.labelProperty.label;
    labelProperty._pluralLabel          = l10n.labelProperty.pluralLabel;
    labelProperty._reverseLabel         = l10n.labelProperty.reverseLabel;
    labelProperty._reversePluralLabel   = l10n.labelProperty.reversePluralLabel;
    labelProperty._groupingLabel        = l10n.labelProperty.groupingLabel;
    labelProperty._reverseGroupingLabel = l10n.labelProperty.reverseGroupingLabel;
    this._properties["label"]           = labelProperty;
    
    var typeProperty = new Seek.Database._Property("type");
    typeProperty._uri                   = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
    typeProperty._valueType             = "text";
    typeProperty._label                 = "type";
    typeProperty._pluralLabel           = l10n.typeProperty.label;
    typeProperty._reverseLabel          = l10n.typeProperty.reverseLabel;
    typeProperty._reversePluralLabel    = l10n.typeProperty.reversePluralLabel;
    typeProperty._groupingLabel         = l10n.typeProperty.groupingLabel;
    typeProperty._reverseGroupingLabel  = l10n.typeProperty.reverseGroupingLabel;
    this._properties["type"]            = typeProperty;
    
    var uriProperty = new Seek.Database._Property("uri");
    uriProperty._uri                    = "http://simile.mit.edu/2006/11/exhibit#uri";
    uriProperty._valueType              = "url";
    uriProperty._label                  = "URI";
    uriProperty._pluralLabel            = "URIs";
    uriProperty._reverseLabel           = "URI of";
    uriProperty._reversePluralLabel     = "URIs of";
    uriProperty._groupingLabel          = "URIs";
    uriProperty._reverseGroupingLabel   = "things named by these URIs";
    this._properties["uri"]             = uriProperty;
};

Seek.Database._Impl.prototype.createDatabase = function() {
    return Seek.Database.create();
};

Seek.Database._Impl.prototype.addListener = function(listener) {
    this._listeners.add(listener);
};

Seek.Database._Impl.prototype.removeListener = function(listener) {
    this._listeners.remove(listener);
};

Seek.Database._Impl.prototype.loadDataLinks = function(fDone) {
    var links = [];
    var heads = document.documentElement.getElementsByTagName("head");
    for (var h = 0; h < heads.length; h++) {
        var linkElmts = heads[h].getElementsByTagName("link");
        for (var l = 0; l < linkElmts.length; l++) {
            var link = linkElmts[l];
            if (link.rel.match(/\bexhibit\/data\b/)) {
                links.push(link);
            }
        }
    }
    
    this._loadLinks(links, fDone);
};

Seek.Database._Impl.prototype.loadData = function(o, baseURI) {
    if (typeof baseURI == "undefined") {
        baseURI = location.href;
    }
    if ("types" in o) {
        this.loadTypes(o.types, baseURI);
    }
    if ("properties" in o) {
        this.loadProperties(o.properties, baseURI);
    }
    if ("items" in o) {
        this.loadItems(o.items, baseURI);
    }
};

Seek.Database._Impl.prototype.loadTypes = function(typeEntries, baseURI) {
    this._listeners.fire("onBeforeLoadingTypes", []);
    try {
        var lastChar = baseURI.substr(baseURI.length - 1)
        if (lastChar == "#") {
            baseURI = baseURI.substr(0, baseURI.length - 1) + "/";
        } else if (lastChar != "/" && lastChar != ":") {
            baseURI += "/";
        }
    
        for (var typeID in typeEntries) {
            if (typeof typeID != "string") {
                continue;
            }
            
            var typeEntry = typeEntries[typeID];
            if (typeof typeEntry != "object") {
                continue;
            }
            
            var type;
            if (typeID in this._types) {
                type = this._types[typeID];
            } else {
                type = new Seek.Database._Type(typeID);
                this._types[typeID] = type;
            };
            
            for (var p in typeEntry) {
                type._custom[p] = typeEntry[p];
            }
            
            if (!("uri" in type._custom)) {
                type._custom["uri"] = baseURI + "type#" + encodeURIComponent(typeID);
            }
            if (!("label" in type._custom)) {
                type._custom["label"] = typeID;
            }
        }
        
        this._listeners.fire("onAfterLoadingTypes", []);
    } catch(e) {
        Seek.exception(e);
    }
};

Seek.Database._Impl.prototype.loadProperties = function(propertyEntries, baseURI) {
    this._listeners.fire("onBeforeLoadingProperties", []);
    try {
        var lastChar = baseURI.substr(baseURI.length - 1)
        if (lastChar == "#") {
            baseURI = baseURI.substr(0, baseURI.length - 1) + "/";
        } else if (lastChar != "/" && lastChar != ":") {
            baseURI += "/";
        }
    
        for (var propertyID in propertyEntries) {
            if (typeof propertyID != "string") {
                continue;
            }
            
            var propertyEntry = propertyEntries[propertyID];
            if (typeof propertyEntry != "object") {
                continue;
            }
            
            var property;
            if (propertyID in this._properties) {
                property = this._properties[propertyID];
            } else {
                property = new Seek.Database._Property(propertyID, this);
                this._properties[propertyID] = property;
            };
            
            property._uri = ("uri" in propertyEntry) ? propertyEntry.uri : (baseURI + "property#" + encodeURIComponent(propertyID));
            property._valueType = ("valueType" in propertyEntry) ? propertyEntry.valueType : "text";
                // text, html, number, date, boolean, item, url
            
            property._label = ("label" in propertyEntry) ? propertyEntry.label : propertyID;
            property._pluralLabel = ("pluralLabel" in propertyEntry) ? propertyEntry.pluralLabel : property._label;
            
            property._reverseLabel = ("reverseLabel" in propertyEntry) ? propertyEntry.reverseLabel : ("!" + property._label);
            property._reversePluralLabel = ("reversePluralLabel" in propertyEntry) ? propertyEntry.reversePluralLabel : ("!" + property._pluralLabel);
            
            property._groupingLabel = ("groupingLabel" in propertyEntry) ? propertyEntry.groupingLabel : property._label;
            property._reverseGroupingLabel = ("reverseGroupingLabel" in propertyEntry) ? propertyEntry.reverseGroupingLabel : property._reverseLabel;
            
            if ("origin" in propertyEntry) {
                property._origin = propertyEntry.origin;
            }
        }
        this._propertyArray = null;
        
        this._listeners.fire("onAfterLoadingProperties", []);
    } catch(e) {
        Seek.exception(e);
    }
};

Seek.Database._Impl.prototype.loadItems = function(itemEntries, baseURI) {
    this._listeners.fire("onBeforeLoadingItems", []);
    try {
        var lastChar = baseURI.substr(baseURI.length - 1);
        if (lastChar == "#") {
            baseURI = baseURI.substr(0, baseURI.length - 1) + "/";
        } else if (lastChar != "/" && lastChar != ":") {
            baseURI += "/";
        }
        
        var spo = this._spo;
        var ops = this._ops;
        var indexPut = Seek.Database._indexPut;
        var indexPut2 = Seek.Database._indexPut2; // subject will always be unique; so this is an optimization
        var indexTriple = function(s, p, o) {
            indexPut(spo, s, p, o);
            indexPut2(ops, o, p, s);
        };
        
        for (var i = 0; i < itemEntries.length; i++) {
            var entry = itemEntries[i];
            if (typeof entry == "object") {
                this._loadItem(entry, indexTriple, baseURI);
            }
        }
        
        this._propertyArray = null;
        
        this._listeners.fire("onAfterLoadingItems", []);
    } catch(e) {
        Seek.exception(e);
    }
};

Seek.Database._Impl.prototype.getType = function(typeID) {
    return this._types[typeID];
};

Seek.Database._Impl.prototype.getProperty = function(propertyID) {
    return propertyID in this._properties ? this._properties[propertyID] : null;
};

/**
 * Get an array of all property names known to this database.
 */
Seek.Database._Impl.prototype.getAllProperties = function() {
    if (this._propertyArray == null) {
        this._propertyArray = [];
        for (var propertyID in this._properties) {
            this._propertyArray.push(propertyID);
        }
    }
    
    return [].concat(this._propertyArray);
};

Seek.Database._Impl.prototype.getAllItems = function() {
    var items = new Seek.Set();
    items.addSet(this._items);
    
    return items;
};

Seek.Database._Impl.prototype.getAllItemsCount = function() {
    return this._items.size();
};

Seek.Database._Impl.prototype.containsItem = function(itemID) {
    return this._items.contains(itemID);
};

Seek.Database._Impl.prototype.getNamespaces = function(idToQualifiedName, prefixToBase) {
    var bases = {};
    for (var propertyID in this._properties) {
        var property = this._properties[propertyID];
        var uri = property.getURI();
        
        var hash = uri.indexOf("#");
        if (hash > 0) {
            var base = uri.substr(0, hash + 1);
            bases[base] = true;
            
            idToQualifiedName[propertyID] = {
                base:       base,
                localName:  uri.substr(hash + 1)
            };
            continue;
        }
        
        var slash = uri.lastIndexOf("/");
        if (slash > 0) {
            var base = uri.substr(0, slash + 1);
            bases[base] = true;
            
            idToQualifiedName[propertyID] = {
                base:       base,
                localName:  uri.substr(slash + 1)
            };
            continue;
        }
    }
    
    var baseToPrefix = {};
    var letters = "abcdefghijklmnopqrstuvwxyz";
    var i = 0;
    
    for (var base in bases) {
        var prefix = letters.substr(i++,1);
        prefixToBase[prefix] = base;
        baseToPrefix[base] = prefix;
    }
    
    for (var propertyID in idToQualifiedName) {
        var qname = idToQualifiedName[propertyID];
        qname.prefix = baseToPrefix[qname.base];
    }
};

Seek.Database._Impl.prototype._loadItem = function(itemEntry, indexFunction, baseURI) {
    if (!("label" in itemEntry) && !("id" in itemEntry)) {
        Seek.warn("Item entry has no label and no id: " +
                              SimileAjax.JSON.toJSONString( itemEntry ));
        return;
    }
    
    var id;
    if (!("label" in itemEntry)) {
        id = itemEntry.id;
        if (!this._items.contains(id)) {
            Seek.warn("Cannot add new item containing no label: " +
                                  SimileAjax.JSON.toJSONString( itemEntry ));
        }
    } else {
        var label = itemEntry.label;
        var id = ("id" in itemEntry) ? itemEntry.id : label;
        var uri = ("uri" in itemEntry) ? itemEntry.uri : (baseURI + "item#" + encodeURIComponent(id));
        var type = ("type" in itemEntry) ? itemEntry.type : "Item";
        
        var isArray = function(obj) {
           if (obj.constructor.toString().indexOf("Array") == -1)
              return false;
           else
              return true;
        }
        if(isArray(label))
            label = label[0];
        if(isArray(id))
            id = id[0];
        if(isArray(uri))
            uri = uri[0];
        if(isArray(type))
            type = type[0];
        
        this._items.add(id);
        
        indexFunction(id, "uri", uri);
        indexFunction(id, "label", label);
        indexFunction(id, "type", type);
        
        this._ensureTypeExists(type, baseURI);
    }
    
    for (var p in itemEntry) {
        if (typeof p != "string") {
            continue;
        }
        
        if (p != "uri" && p != "label" && p != "id" && p != "type") {
            this._ensurePropertyExists(p, baseURI)._onNewData();
            
            var v = itemEntry[p];
            if (v != undefined && v != null) {
                if (typeof v == "array" || (typeof v == "object" && "concat" in v)) {
                    for (var j = 0; j < v.length; j++) {
                        indexFunction(id, p, v[j]);
                    }
                } else {
                    indexFunction(id, p, v);
                }
            }
        }
    }
};

Seek.Database._Impl.prototype._ensureTypeExists = function(typeID, baseURI) {
    if (!(typeID in this._types)) {
        var type = new Seek.Database._Type(typeID);
        
        type._custom["uri"] = baseURI + "type#" + encodeURIComponent(typeID);
        type._custom["label"] = typeID;
        
        this._types[typeID] = type;
    }
};

Seek.Database._Impl.prototype._ensurePropertyExists = function(propertyID, baseURI) {
    if (!(propertyID in this._properties)) {
        var property = new Seek.Database._Property(propertyID);
        
        property._uri = baseURI + "property#" + encodeURIComponent(propertyID);
        property._valueType = "text";
        
        property._label = propertyID;
        property._pluralLabel = property._label;
        
        property._reverseLabel = "reverse of " + property._label;
        property._reversePluralLabel = "reverse of " + property._pluralLabel;
        
        property._groupingLabel = property._label;
        property._reverseGroupingLabel = property._reverseLabel;
        
        this._properties[propertyID] = property;
        
        return property;
    } else {
        return this._properties[propertyID];
    }
};

Seek.Database._indexPut = function(index, x, y, z) {
    var hash = index[x];
    if (!hash) {
        hash = {};
        index[x] = hash;
    }
    
    var array = hash[y];
    if (!array) {
        array = new Array();
        hash[y] = array;
    } else {
        for (var i = 0; i < array.length; i++) {
            if (z == array[i]) {
                return;
            }
        }
    }
    array.push(z);
};

Seek.Database._indexPut2 = function(index, x, y, z) {
    var hash = index[x];
    if (!hash) {
        hash = {};
        index[x] = hash;
    }
    
    var array = hash[y];
    if (!array) {
        hash[y] = [z];
    } else {
        array.push(z);
    }
};

Seek.Database._indexPutList = function(index, x, y, list) {
    var hash = index[x];
    if (!hash) {
        hash = {};
        index[x] = hash;
    }
    
    var array = hash[y];
    if (!array) {
        hash[y] = list;
    } else {
        hash[y] = hash[y].concat(list);
    }
};

Seek.Database._indexRemove = function(index, x, y, z) {
    var hash = index[x];
    if (!hash) {
        return false;
    }
    
    var array = hash[y];
    if (!array) {
        return false;
    }
    
    for (var i = 0; i < array.length; i++) {
        if (z == array[i]) {
            array.splice(i, 1);
            if (array.length == 0) {
                delete hash[y];
            }
            return true;
        }
    }
};

Seek.Database._indexRemoveList = function(index, x, y) {
    var hash = index[x];
    if (!hash) {
        return null;
    }
    
    var array = hash[y];
    if (!array) {
        return null;
    }
    
    delete hash[y];
    return array;
};

Seek.Database._Impl.prototype._indexFillSet = function(index, x, y, set, filter) {
    var hash = index[x];
    if (hash) {
        var array = hash[y];
        if (array) {
            if (filter) {
                for (var i = 0; i < array.length; i++) {
                    var z = array[i];
                    if (filter.contains(z)) {
                        set.add(z);
                    }
                }
            } else {
                for (var i = 0; i < array.length; i++) {
                    set.add(array[i]);
                }
            }
        }
    }
};

Seek.Database._Impl.prototype._indexCountDistinct = function(index, x, y, filter) {
    var count = 0;
    var hash = index[x];
    if (hash) {
        var array = hash[y];
        if (array) {
            if (filter) {
                for (var i = 0; i < array.length; i++) {
                    if (filter.contains(array[i])) {
                        count++;
                    }
                }
            } else {
                count = array.length;
            }
        }
    }
    return count;
};

Seek.Database._Impl.prototype._get = function(index, x, y, set, filter) {
    if (!set) {
        set = new Seek.Set();
    }
    this._indexFillSet(index, x, y, set, filter);
    return set;
};

Seek.Database._Impl.prototype._getUnion = function(index, xSet, y, set, filter) {
    if (!set) {
        set = new Seek.Set();
    }
    
    var database = this;
    xSet.visit(function(x) {
        database._indexFillSet(index, x, y, set, filter);
    });
    return set;
};

Seek.Database._Impl.prototype._countDistinctUnion = function(index, xSet, y, filter) {
    var count = 0;
    var database = this;
    xSet.visit(function(x) {
        count += database._indexCountDistinct(index, x, y, filter);
    });
    return count;
};

Seek.Database._Impl.prototype._countDistinct = function(index, x, y, filter) {
    return this._indexCountDistinct(index, x, y, filter);
};

Seek.Database._Impl.prototype._getProperties = function(index, x) {
    var hash = index[x];
    var properties = []
    if (hash) {
        for (var p in hash) {
            properties.push(p);
        }
    }
    return properties;
};

Seek.Database._Impl.prototype.getObjects = function(s, p, set, filter) {
    return this._get(this._spo, s, p, set, filter);
};

Seek.Database._Impl.prototype.countDistinctObjects = function(s, p, filter) {
    return this._countDistinct(this._spo, s, p, filter);
};

Seek.Database._Impl.prototype.getObjectsUnion = function(subjects, p, set, filter) {
    return this._getUnion(this._spo, subjects, p, set, filter);
};

Seek.Database._Impl.prototype.countDistinctObjectsUnion = function(subjects, p, filter) {
    return this._countDistinctUnion(this._spo, subjects, p, filter);
};

Seek.Database._Impl.prototype.getSubjects = function(o, p, set, filter) {
    return this._get(this._ops, o, p, set, filter);
};

Seek.Database._Impl.prototype.countDistinctSubjects = function(o, p, filter) {
    return this._countDistinct(this._ops, o, p, filter);
};

Seek.Database._Impl.prototype.getSubjectsUnion = function(objects, p, set, filter) {
    return this._getUnion(this._ops, objects, p, set, filter);
};

Seek.Database._Impl.prototype.countDistinctSubjectsUnion = function(objects, p, filter) {
    return this._countDistinctUnion(this._ops, objects, p, filter);
};

Seek.Database._Impl.prototype.getObject = function(s, p) {
    var hash = this._spo[s];
    if (hash) {
        var array = hash[p];
        if (array) {
            return array[0];
        }
    }
    return null;
};

Seek.Database._Impl.prototype.getSubject = function(o, p) {
    var hash = this._ops[o];
    if (hash) {
        var array = hash[p];
        if (array) {
            return array[0];
        }
    }
    return null;
};

Seek.Database._Impl.prototype.getForwardProperties = function(s) {
    return this._getProperties(this._spo, s);
};

Seek.Database._Impl.prototype.getBackwardProperties = function(o) {
    return this._getProperties(this._ops, o);
};

Seek.Database._Impl.prototype.getSubjectsInRange = function(p, min, max, inclusive, set, filter) {
    var property = this.getProperty(p);
    if (property != null) {
        var rangeIndex = property.getRangeIndex();
        if (rangeIndex != null) {
            return rangeIndex.getSubjectsInRange(min, max, inclusive, set, filter);
        }
    }
    return (!set) ? new Seek.Set() : set;
};

Seek.Database._Impl.prototype.getTypeIDs = function(set) {
    return this.getObjectsUnion(set, "type", null, null);
};

Seek.Database._Impl.prototype.addStatement = function(s, p, o) {
    var indexPut = Seek.Database._indexPut;
    indexPut(this._spo, s, p, o);
    indexPut(this._ops, o, p, s);
};

Seek.Database._Impl.prototype.removeStatement = function(s, p, o) {
    var indexRemove = Seek.Database._indexRemove;
    var removedObject = indexRemove(this._spo, s, p, o);
    var removedSubject = indexRemove(this._ops, o, p, s);
    return removedObject || removedSubject;
};

Seek.Database._Impl.prototype.removeObjects = function(s, p) {
    var indexRemove = Seek.Database._indexRemove;
    var indexRemoveList = Seek.Database._indexRemoveList;
    var objects = indexRemoveList(this._spo, s, p);
    if (objects == null) {
        return false;
    } else {
        for (var i = 0; i < objects.length; i++) {
            indexRemove(this._ops, objects[i], p, s);
        }
        return true;
    }
};

Seek.Database._Impl.prototype.removeItem = function(itemID) {
    var properties = this._spo[itemID];
    if (properties) {
        for (var p in properties) {
            this.removeObjects(itemID, p);
        }
    }
};

Seek.Database._Impl.prototype.removeSubjects = function(o, p) {
    var indexRemove = Seek.Database._indexRemove;
    var indexRemoveList = Seek.Database._indexRemoveList;
    var subjects = indexRemoveList(this._ops, o, p);
    if (subjects == null) {
        return false;
    } else {
        for (var i = 0; i < subjects.length; i++) {
            indexRemove(this._spo, subjects[i], p, o);
        }
        return true;
    }
};

Seek.Database._Impl.prototype.removeAllStatements = function() {
    this._listeners.fire("onBeforeRemovingAllStatements", []);
    try {
        this._spo = {};
        this._ops = {};
        this._items = new Seek.Set();
    
        for (var propertyID in this._properties) {
            this._properties[propertyID]._onNewData();
        }
        this._propertyArray = null;
        
        this._listeners.fire("onAfterRemovingAllStatements", []);
    } catch(e) {
        Seek.exception(e);
    }
};

/*==================================================
 *  Seek.Database._Type
 *==================================================
 */
Seek.Database._Type = function(id) {
    this._id = id;
    this._custom = {};
};

Seek.Database._Type.prototype = {
    getID:          function()  { return this._id; },
    getURI:         function()  { return this._custom["uri"]; },
    getLabel:       function()  { return this._custom["label"]; },
    getOrigin:      function()  { return this._custom["origin"]; },
    getProperty:    function(p) { return this._custom[p]; }
};

/*==================================================
 *  Seek.Database._Property
 *==================================================
 */
Seek.Database._Property = function(id, database) {
    this._id = id;
    this._database = database;
    this._rangeIndex = null;
};

Seek.Database._Property.prototype = {
    getID:          function() { return this._id; },
    getURI:         function() { return this._uri; },
    getValueType:   function() { return this._valueType; },
    
    getLabel:               function() { return this._label; },
    getPluralLabel:         function() { return this._pluralLabel; },
    getReverseLabel:        function() { return this._reverseLabel; },
    getReversePluralLabel:  function() { return this._reversePluralLabel; },
    getGroupingLabel:       function() { return this._groupingLabel; },
    getGroupingPluralLabel: function() { return this._groupingPluralLabel; },
    getOrigin:              function() { return this._origin; }
};

Seek.Database._Property.prototype._onNewData = function() {
    this._rangeIndex = null;
};

Seek.Database._Property.prototype.getRangeIndex = function() {
    if (this._rangeIndex == null) {
        this._buildRangeIndex();
    }
    return this._rangeIndex;
};

Seek.Database._Property.prototype._buildRangeIndex = function() {
    var getter;
    var database = this._database;
    var p = this._id;
    
    switch (this.getValueType()) {
    case "number":
        getter = function(item, f) {
            database.getObjects(item, p, null, null).visit(function(value) {
                if (typeof value != "number") {
                    value = parseFloat(value);
                }
                if (!isNaN(value)) {
                    f(value);
                }
            });
        };
        break;
    case "date":
        getter = function(item, f) {
            database.getObjects(item, p, null, null).visit(function(value) {
                if (value != null && !(value instanceof Date)) {
                    value = SimileAjax.DateTime.parseIso8601DateTime(value);
                }
                if (value instanceof Date) {
                    f(value.getTime());
                }
            });
        };
        break;
    default:
        getter = function(item, f) {};
    }
    
    this._rangeIndex = new Seek.Database._RangeIndex(
        this._database.getAllItems(),
        getter
    );
};

/*==================================================
 *  Seek.Database._RangeIndex
 *==================================================
 */
Seek.Database._RangeIndex = function(items, getter) {
    pairs = [];
    items.visit(function(item) {
        getter(item, function(value) {
            pairs.push({ item: item, value: value });
        });
    });
    
    pairs.sort(function(p1, p2) {
        var c = p1.value - p2.value;
        return c != 0 ? c : p1.item.localeCompare(p2.item);
    });
    
    this._pairs = pairs;
};

Seek.Database._RangeIndex.prototype.getCount = function() {
    return this._pairs.count();
};

Seek.Database._RangeIndex.prototype.getMin = function() {
    return this._pairs.length > 0 ? 
        this._pairs[0].value : 
        Number.POSITIVE_INFINITY;
};

Seek.Database._RangeIndex.prototype.getMax = function() {
    return this._pairs.length > 0 ? 
        this._pairs[this._pairs.length - 1].value : 
        Number.NEGATIVE_INFINITY;
};

Seek.Database._RangeIndex.prototype.getRange = function(visitor, min, max, inclusive) {
    var startIndex = this._indexOf(min);
    var pairs = this._pairs;
    var l = pairs.length;
    
    inclusive = (inclusive);
    while (startIndex < l) {
        var pair = pairs[startIndex++];
        var value = pair.value;
        if (value < max || (value == max && inclusive)) {
            visitor(pair.item);
        } else {
            break;
        }
    }
};

Seek.Database._RangeIndex.prototype.getSubjectsInRange = function(min, max, inclusive, set, filter) {
    if (!set) {
        set = new Seek.Set();
    }
    
    var f = (filter != null) ?
        function(item) {
            if (filter.contains(item)) {
                set.add(item);
            }
        } :
        function(item) {
            set.add(item);
        };
        
    this.getRange(f, min, max, inclusive);
    
    return set;
};

Seek.Database._RangeIndex.prototype.countRange = function(min, max, inclusive) {
    var startIndex = this._indexOf(min);
    var endIndex = this._indexOf(max);
    
    if (inclusive) {
        var pairs = this._pairs;
        var l = pairs.length;
        while (endIndex < l) {
            if (pairs[endIndex].value == max) {
                endIndex++;
            } else {
                break;
            }
        }
    }
    return endIndex - startIndex;
};

Seek.Database._RangeIndex.prototype._indexOf = function(v) {
    var pairs = this._pairs;
    if (pairs.length == 0 || pairs[0].value >= v) {
        return 0;
    }
    
    var from = 0;
    var to = pairs.length;
    while (from + 1 < to) {
        var middle = (from + to) >> 1;
        var v2 = pairs[middle].value;
        if (v2 >= v) {
            to = middle;
        } else {
            from = middle;
        }
    }
    
    return to;
};
