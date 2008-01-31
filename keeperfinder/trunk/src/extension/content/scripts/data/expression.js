/*==================================================
 *  KeeperFinder.Expression
 *==================================================
 */
KeeperFinder.Expression = new Object();

KeeperFinder.Expression._Impl = function(rootNode) {
    this._rootNode = rootNode;
};

KeeperFinder.Expression._Impl.prototype.evaluate = function(
    roots, 
    rootValueTypes, 
    defaultRootName, 
    database
) {
    var collection = this._rootNode.evaluate(roots, rootValueTypes, defaultRootName, database);
    return {
        values:     collection.getSet(),
        valueType:  collection.valueType,
        size:       collection.size
    };
};

KeeperFinder.Expression._Impl.prototype.evaluateOnItem = function(itemID, database) {
    return this.evaluate(
        { "value" : itemID }, 
        { "value" : "item" }, 
        "value",
        database
    );
};

KeeperFinder.Expression._Impl.prototype.evaluateSingle = function(
    roots, 
    rootValueTypes, 
    defaultRootName, 
    database
) {
    var collection = this._rootNode.evaluate(roots, rootValueTypes, defaultRootName, database);
    var result = { value: null, valueType: collection.valueType };
    collection.forEachValue(function(v) { result.value = v; return true; });
    
    return result;
};

KeeperFinder.Expression._Impl.prototype.evaluateSingleOnItem = function(itemID, database) {
    return this.evaluateSingle(
        { "value" : itemID }, 
        { "value" : "item" }, 
        "value",
        database
    );
};

KeeperFinder.Expression._Impl.prototype.testExists = function(
    roots, 
    rootValueTypes, 
    defaultRootName, 
    database
) {
    return this.isPath() ?
        this._rootNode.testExists(roots, rootValueTypes, defaultRootName, database) :
        this.evaluate(roots, rootValueTypes, defaultRootName, database).values.size() > 0;
};

KeeperFinder.Expression._Impl.prototype.isPath = function() {
    return this._rootNode instanceof KeeperFinder.Expression.Path;
};

KeeperFinder.Expression._Impl.prototype.getPath = function() {
    return this.isPath() ? this._rootNode : null;
};

/*==================================================
 *  KeeperFinder.Expression._Collection
 *==================================================
 */
KeeperFinder.Expression._Collection = function(values, valueType) {
    this._values = values;
    this.valueType = valueType;
    
    if (values instanceof Array) {
        this.forEachValue = KeeperFinder.Expression._Collection._forEachValueInArray;
        this.getSet = KeeperFinder.Expression._Collection._getSetFromArray;
        this.contains = KeeperFinder.Expression._Collection._containsInArray;
        this.size = values.length;
    } else {
        this.forEachValue = KeeperFinder.Expression._Collection._forEachValueInSet;
        this.getSet = KeeperFinder.Expression._Collection._getSetFromSet;
        this.contains = KeeperFinder.Expression._Collection._containsInSet;
        this.size = values.size();
    }
};

KeeperFinder.Expression._Collection._forEachValueInSet = function(f) {
    this._values.visit(f);
};

KeeperFinder.Expression._Collection._forEachValueInArray = function(f) {
    var a = this._values;
    for (var i = 0; i < a.length; i++) {
        if (f(a[i])) {
            break;
        }
    }
};

KeeperFinder.Expression._Collection._getSetFromSet = function() {
    return this._values;
};

KeeperFinder.Expression._Collection._getSetFromArray = function() {
    return new KeeperFinder.Set(this._values);
};

KeeperFinder.Expression._Collection._containsInSet = function(v) {
    this._values.contains(v);
};

KeeperFinder.Expression._Collection._containsInArray = function(v) {
    var a = this._values;
    for (var i = 0; i < a.length; i++) {
        if (a[i] == v) {
            return true;
        }
    }
    return false;
};

/*==================================================
 *  KeeperFinder.Expression.Path
 *==================================================
 */
KeeperFinder.Expression.Path = function() {
    this._rootName = null;
    this._segments = [];
};

KeeperFinder.Expression.Path.create = function(property, forward) {
    var path = new KeeperFinder.Expression.Path();
    path._segments.push({ property: property, forward: forward, isArray: false });
    return path;
};

KeeperFinder.Expression.Path.prototype.setRootName = function(rootName) {
    this._rootName = rootName;
};

KeeperFinder.Expression.Path.prototype.appendSegment = function(property, hopOperator) {
    this._segments.push({
        property:   property,
        forward:    hopOperator.charAt(0) == ".",
        isArray:    hopOperator.length > 1
    });
};

KeeperFinder.Expression.Path.prototype.getSegment = function(index) {
    if (index < this._segments.length) {
        var segment = this._segments[index];
        return {
            property:   segment.property,
            forward:    segment.forward,
            isArray:    segment.isArray
        };
    } else {
        return null;
    }
};

KeeperFinder.Expression.Path.prototype.getLastSegment = function() {
    return this.getSegment(this._segments.length - 1);
};

KeeperFinder.Expression.Path.prototype.getSegmentCount = function() {
    return this._segments.length;
};

KeeperFinder.Expression.Path.prototype.evaluate = function(
    roots, 
    rootValueTypes, 
    defaultRootName, 
    database
) {
    var rootName = this._rootName != null ? this._rootName : defaultRootName;
    var valueType = rootName in rootValueTypes ? rootValueTypes[rootName] : "text";
    
    var collection = null;
    if (rootName in roots) {
        var root = roots[rootName];
        if (root instanceof KeeperFinder.Set || root instanceof Array) {
            collection = new KeeperFinder.Expression._Collection(root, valueType);
        } else {
            collection = new KeeperFinder.Expression._Collection([ root ], valueType);
        }
        
        return this._walkForward(collection, database);
    } else {
        throw new Error("No such variable called " + rootName);
    }
};

KeeperFinder.Expression.Path.prototype.evaluateBackward = function(
    value,
    valueType,
    filter,
    database
) {
    var collection = new KeeperFinder.Expression._Collection([ value ], valueType);
    
    return this._walkBackward(collection, filter, database);
}

KeeperFinder.Expression.Path.prototype.walkForward = function(
    values,
    valueType,
    database
) {
    return this._walkForward(new KeeperFinder.Expression._Collection(values, valueType), database);
};

KeeperFinder.Expression.Path.prototype.walkBackward = function(
    values,
    valueType,
    filter,
    database
) {
    return this._walkBackward(new KeeperFinder.Expression._Collection(values, valueType), filter, database);
};

KeeperFinder.Expression.Path.prototype._walkForward = function(collection, database) {
    for (var i = 0; i < this._segments.length; i++) {
        var segment = this._segments[i];
        if (segment.isArray) {
            var a = [];
            var valueType;
            if (segment.forward) {
                collection.forEachValue(function(v) {
                    database.getObjects(v, segment.property).visit(function(v2) { a.push(v2); });
                });
                
                var property = database.getProperty(segment.property);
                valueType = property != null ? property.getValueType() : "text";
            } else {
                collection.forEachValue(function(v) {
                    database.getSubjects(v, segment.property).visit(function(v2) { a.push(v2); });
                });
                valueType = "item";
            }
            collection = new KeeperFinder.Expression._Collection(a, valueType);
        } else {
            if (segment.forward) {
                var values = database.getObjectsUnion(collection.getSet(), segment.property);
                var property = database.getProperty(segment.property);
                var valueType = property != null ? property.getValueType() : "text";
                collection = new KeeperFinder.Expression._Collection(values, valueType);
            } else {
                var values = database.getSubjectsUnion(collection.getSet(), segment.property);
                collection = new KeeperFinder.Expression._Collection(values, "item");
            }
        }
    }
    
    return collection;
};

KeeperFinder.Expression.Path.prototype._walkBackward = function(collection, filter, database) {
    for (var i = this._segments.length - 1; i >= 0; i--) {
        var segment = this._segments[i];
        if (segment.isArray) {
            var a = [];
            var valueType;
            if (segment.forward) {
                collection.forEachValue(function(v) {
                    database.getSubjects(v, segment.property).visit(function(v2) { 
                        if (i > 0 || filter == null || filter.contains(v2)) {
                            a.push(v2); 
                        }
                    });
                });
                
                var property = database.getProperty(segment.property);
                valueType = property != null ? property.getValueType() : "text";
            } else {
                collection.forEachValue(function(v) {
                    database.getObjects(v, segment.property).visit(function(v2) { 
                        if (i > 0 || filter == null || filter.contains(v2)) {
                            a.push(v2); 
                        }
                    });
                });
                valueType = "item";
            }
            collection = new KeeperFinder.Expression._Collection(a, valueType);
        } else {
            if (segment.forward) {
                var values = database.getSubjectsUnion(collection.getSet(), segment.property, null, i == 0 ? filter : null);
                collection = new KeeperFinder.Expression._Collection(values, "item");
            } else {
                var values = database.getObjectsUnion(collection.getSet(), segment.property, null, i == 0 ? filter : null);
                var property = database.getProperty(segment.property);
                var valueType = property != null ? property.getValueType() : "text";
                collection = new KeeperFinder.Expression._Collection(values, valueType);
            }
        }
    }
    
    return collection;
};

KeeperFinder.Expression.Path.prototype.rangeBackward = function(
    from,
    to,
    filter,
    database
) {
    var set = new KeeperFinder.Set();
    var valueType = "item";
    if (this._segments.length > 0) {
        var segment = this._segments[this._segments.length - 1];
        if (segment.forward) {
            database.getSubjectsInRange(segment.property, from, to, false, set, this._segments.length == 1 ? filter : null);
        } else {
            throw new Error("Last path of segment must be forward");
        }
                
        for (var i = this._segments.length - 2; i >= 0; i--) {
            segment = this._segments[i];
            if (segment.forward) {
                set = database.getSubjectsUnion(set, segment.property, null, i == 0 ? filter : null);
                valueType = "item";
            } else {
                set = database.getObjectsUnion(set, segment.property, null, i == 0 ? filter : null);
                
                var property = database.getProperty(segment.property);
                valueType = property != null ? property.getValueType() : "text";
            }
        }
    }
    return {
        valueType:  valueType,
        values:     set,
        count:      set.size()
    };
};

KeeperFinder.Expression.Path.prototype.testExists = function(
    roots, 
    rootValueTypes, 
    defaultRootName, 
    database
) {
    return this.evaluate(roots, rootValueTypes, defaultRootName, database).size > 0;
};

/*==================================================
 *  KeeperFinder.Expression._Constant
 *==================================================
 */
KeeperFinder.Expression._Constant = function(value, valueType) {
    this._value = value;
    this._valueType = valueType;
};

KeeperFinder.Expression._Constant.prototype.evaluate = function(
    roots, 
    rootValueTypes, 
    defaultRootName, 
    database
) {
    return new KeeperFinder.Expression._Collection([ this._value ], this._valueType);
};

/*==================================================
 *  KeeperFinder.Expression._Operator
 *==================================================
 */
KeeperFinder.Expression._Operator = function(operator, args) {
    this._operator = operator;
    this._args = args;
};

KeeperFinder.Expression._Operator.prototype.evaluate = function(
    roots, 
    rootValueTypes, 
    defaultRootName, 
    database
) {
    var values = [];
    
    var args = [];
    for (var i = 0; i < this._args.length; i++) {
        args.push(this._args[i].evaluate(roots, rootValueTypes, defaultRootName, database));
    }
    
    var operator = KeeperFinder.Expression._operators[this._operator];
    var f = operator.f;
    if (operator.argumentType == "number") {
        args[0].forEachValue(function(v1) {
            if (!(typeof v1 == "number")) {
                v1 = parseFloat(v1);
            }
        
            args[1].forEachValue(function(v2) {
                if (!(typeof v2 == "number")) {
                    v2 = parseFloat(v2);
                }
                
                values.push(f(v1, v2));
            });
        });
    } else {
        args[0].forEachValue(function(v1) {
            args[1].forEachValue(function(v2) {
                values.push(f(v1, v2));
            });
        });
    }
    
    return new KeeperFinder.Expression._Collection(values, operator.valueType);
};

KeeperFinder.Expression._operators = {
    "+" : {
        argumentType: "number",
        valueType: "number",
        f: function(a, b) { return a + b; }
    },
    "-" : {
        argumentType: "number",
        valueType: "number",
        f: function(a, b) { return a - b; }
    },
    "*" : {
        argumentType: "number",
        valueType: "number",
        f: function(a, b) { return a * b; }
    },
    "/" : {
        argumentType: "number",
        valueType: "number",
        f: function(a, b) { return a / b; }
    },
    "=" : {
        valueType: "boolean",
        f: function(a, b) { return a == b; }
    },
    "<>" : {
        valueType: "boolean",
        f: function(a, b) { return a != b; }
    },
    "><" : {
        valueType: "boolean",
        f: function(a, b) { return a != b; }
    },
    "<" : {
        argumentType: "number",
        valueType: "boolean",
        f: function(a, b) { return a < b; }
    },
    ">" : {
        argumentType: "number",
        valueType: "boolean",
        f: function(a, b) { return a > b; }
    },
    "<=" : {
        argumentType: "number",
        valueType: "boolean",
        f: function(a, b) { return a <= b; }
    },
    ">=" : {
        argumentType: "number",
        valueType: "boolean",
        f: function(a, b) { return a >= b; }
    }
}

/*==================================================
 *  KeeperFinder.Expression._FunctionCall
 *==================================================
 */
KeeperFinder.Expression._FunctionCall = function(name, args) {
    this._name = name;
    this._args = args;
};

KeeperFinder.Expression._FunctionCall.prototype.evaluate = function(
    roots, 
    rootValueTypes, 
    defaultRootName, 
    database
) {
    var args = [];
    for (var i = 0; i < this._args.length; i++) {
        args.push(this._args[i].evaluate(roots, rootValueTypes, defaultRootName, database));
    }
    
    if (this._name in KeeperFinder.Functions) {
        return KeeperFinder.Functions[this._name].f(args);
    } else {
        throw new Error("No such function named " + this._name);
    }
};

/*==================================================
 *  KeeperFinder.Expression._ControlCall
 *==================================================
 */
KeeperFinder.Expression._ControlCall = function(name, args) {
    this._name = name;
    this._args = args;
};

KeeperFinder.Expression._ControlCall.prototype.evaluate = function(
    roots, 
    rootValueTypes, 
    defaultRootName, 
    database
) {
    return KeeperFinder.Controls[this._name].f(this._args, roots, rootValueTypes, defaultRootName, database);
};
