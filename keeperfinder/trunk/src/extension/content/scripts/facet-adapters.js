KeeperFinder.SearchTerm = function(attrib, op) {
    this.attrib = attrib;
    this.op = op;
    this.wrappedJSObject = this;
};
KeeperFinder.SearchTerm.prototype = {
    QueryInterface: function(iid) {
        if (iid.equals(Components.interfaces.nsIMsgSearchTerm) ||
            iid.equals(Components.interfaces.nsISupports)) {
            return this;
        }
        throw Components.interfaces.NS_ERROR_NOINTERFACE;
    },
    
    value:  "",
    booleanAnd: true,
    arbitraryHeader: "",

    beginsGrouping: false,
    endsGrouping: false,

    matchAll: false,
    matchAllBeforeDeciding: false,
    
    matchRfc822String: function(aString, charset, charsetOverride) { return false; },
    matchRfc2047String: function(aString, charset, charsetOverride) { return false; },
    matchDate: function(aTime) { return false; },
    matchStatus: function(aStatus) { return false; },
    matchPriority: function(priority) { return false; },
    matchAge: function(days) { return false; },
    matchSize: function(size) { return false; },
    matchLabel: function(aLabelValue) { return false; },
    matchJunkStatus: function(aJunkScore) { return false; },
    matchBody: function(scopeTerm, offset, length, charset, msgHdr, db) { return false },
    matchKeyword: function(keyword) { return false; },

    // marking noscript because headers is a null-separated list of strings,
    // which is not scriptable
    matchArbitraryHeader: function(scopeTerm, offset, length, charset, charsetOverride, msgHdr, db, headers, headerLength, forFilters) { 
        return false;
    },
    termAsString:   "KeeperFinder"
};


KeeperFinder.FacetAdapters = {};

KeeperFinder.FacetAdapters._createEmailOrDomainGetSearchTerm = function(attrib, op) {
    return function() {
        var values = this._valueSet;
        var searchTerm = new KeeperFinder.SearchTerm(attrib, op);
        if (values.size() == 0) {
            searchTerm.matchRfc822String = function(aString, charset, charsetOverride) { return true; };
        } else {
            var f = function(aString, charset, charsetOverride) {
                var r = false;
                aString = aString.toLowerCase();
                values.visit(function(v) {
                    if (aString.indexOf(v) >= 0) {
                        r = true;
                        return true;
                    }
                });
                return r;
            };
            searchTerm.matchRfc822String = f;
            searchTerm.matchRfc2047String = f;
        }
        return searchTerm;
    }
};

KeeperFinder.FacetAdapters._createEntityNameGetSearchTerm = function(attrib, op) {
    return function() {
        var labels = this._valueSet;
        var searchTerm = new KeeperFinder.SearchTerm(attrib, op);
        if (labels.size() == 0) {
            searchTerm.matchRfc822String = function(aString, charset, charsetOverride) { return true; };
        } else {
            var values = this._database.getSubjects(labels, "label");
            var f = function(aString, charset, charsetOverride) {
                var r = false;
                aString = aString.toLowerCase();
                values.visit(function(v) {
                    if (aString.indexOf(v) >= 0) {
                        r = true;
                        return true;
                    }
                });
                return r;
            };
            searchTerm.matchRfc822String = f;
            searchTerm.matchRfc2047String = f;
        }
        return searchTerm;
    }
};

KeeperFinder.FacetAdapters["to/cc"] = function(database, collection, box) {
    var facet = new KeeperFinder.ListFacet(
        database, 
        collection, 
        box, 
        {
            facetLabel:     "To/CC",
            expression:     ".recipient",
            filterable:     true,
            selectMultiple: true,
            sortable:       true,
            sortMode:       "value",
            sortDirection:  "forward",
            showMissing:    false,
            missingLabel:   "(No recipient)"
        }
    );
        
    facet.getSearchTerm = KeeperFinder.FacetAdapters._createEmailOrDomainGetSearchTerm(
        Components.interfaces.nsMsgSearchAttrib.ToOrCC, 
        Components.interfaces.nsMsgSearchOp.Contains
    );
    return facet;
};

KeeperFinder.FacetAdapters["to/cc name"] = function(database, collection, box) {
    var facet = new KeeperFinder.ListFacet(
        database, 
        collection, 
        box, 
        {
            facetLabel:     "To/CC name",
            expression:     ".recipient.label",
            filterable:     true,
            selectMultiple: true,
            sortable:       true,
            sortMode:       "value",
            sortDirection:  "forward",
            showMissing:    false,
            missingLabel:   "(No recipient)"
        }
    );
        
    facet.getSearchTerm = KeeperFinder.FacetAdapters._createEntityNameGetSearchTerm(
        Components.interfaces.nsMsgSearchAttrib.ToOrCC, 
        Components.interfaces.nsMsgSearchOp.Contains
    );
    return facet;
};

KeeperFinder.FacetAdapters["to/cc domain"] = function(database, collection, box) {
    var facet = new KeeperFinder.ListFacet(
        database, 
        collection, 
        box, 
        {
            facetLabel:     "To/CC domain",
            expression:     ".recipient.domain",
            filterable:     true,
            selectMultiple: true,
            sortable:       true,
            sortMode:       "value",
            sortDirection:  "forward",
            showMissing:    false,
            missingLabel:   "(No domain)"
        }
    );
        
    facet.getSearchTerm = KeeperFinder.FacetAdapters._createEmailOrDomainGetSearchTerm(
        Components.interfaces.nsMsgSearchAttrib.ToOrCC, 
        Components.interfaces.nsMsgSearchOp.Contains
    );
    return facet;
};

KeeperFinder.FacetAdapters["to/cc me"] = function(database, collection, box) {
    var facet = new KeeperFinder.ListFacet(
        database, 
        collection, 
        box, 
        {
            facetLabel:     "To/CC me",
            expression:     ".toOrCCToMe",
            filterable:     false,
            selectMultiple: false,
            sortable:       false,
            sortMode:       "value",
            sortDirection:  "forward",
            showMissing:    false,
            missingLabel:   "(No recipient)"
        }
    );
        
    facet.getSearchTerm = function() {
        var values = this._valueSet;
        
        var searchTerm = new KeeperFinder.SearchTerm(
            Components.interfaces.nsMsgSearchAttrib.To, 
            Components.interfaces.nsMsgSearchOp.Contains
        );
        if (values.size() == 0) {
            searchTerm.matchRfc822String = function(aString, charset, charsetOverride) { return true; };
        } else {
            var addresses = KeeperFinder.Indexer.accountAddresses;
            var mode = values.toArray()[0];
            
            var f;
            if (mode != "not to me nor cc'ed to me") {
                if (mode == "to me") {
                    searchTerm.attrib = Components.interfaces.nsMsgSearchAttrib.To;
                } else if (mode == "cc'ed to me") {
                    searchTerm.attrib = Components.interfaces.nsMsgSearchAttrib.CC;
                } else {
                    searchTerm.attrib = Components.interfaces.nsMsgSearchAttrib.ToOrCC;
                }
                
                f = function(aString, charset, charsetOverride) {
                    var r = false;
                    aString = aString.toLowerCase();
                    for (var a in addresses) {
                        if (aString.indexOf(a) >= 0) {
                            r = true;
                            break;
                        }
                    };
                    return r;
                };
            } else {
                searchTerm.attrib = Components.interfaces.nsMsgSearchAttrib.ToOrCC;
                
                f = function(aString, charset, charsetOverride) {
                    var r = false;
                    aString = aString.toLowerCase();
                    for (var a in addresses) {
                        if (aString.indexOf(a) >= 0) {
                            r = true;
                            break;
                        }
                    };
                    return !r;
                };
            }
            
            searchTerm.matchRfc822String = f;
            searchTerm.matchRfc2047String = f;
        }
        return searchTerm;
    };
    
    return facet;
};

KeeperFinder.FacetAdapters["from"] = function(database, collection, box) {
    var facet = new KeeperFinder.ListFacet(
        database, 
        collection, 
        box, 
        {
            facetLabel:     "From",
            expression:     ".author",
            filterable:     true,
            selectMultiple: true,
            sortable:       true,
            sortMode:       "value",
            sortDirection:  "forward",
            showMissing:    false,
            missingLabel:   "(No sender)"
        }
    );
        
    facet.getSearchTerm = KeeperFinder.FacetAdapters._createEmailOrDomainGetSearchTerm(
        Components.interfaces.nsMsgSearchAttrib.Sender, 
        Components.interfaces.nsMsgSearchOp.Contains
    );
    return facet;
};

KeeperFinder.FacetAdapters["from name"] = function(database, collection, box) {
    var facet = new KeeperFinder.ListFacet(
        database, 
        collection, 
        box, 
        {
            facetLabel:     "From name",
            expression:     ".author.label",
            filterable:     true,
            selectMultiple: true,
            sortable:       true,
            sortMode:       "value",
            sortDirection:  "forward",
            showMissing:    false,
            missingLabel:   "(No sender)"
        }
    );
        
    facet.getSearchTerm = KeeperFinder.FacetAdapters._createEntityNameGetSearchTerm(
        Components.interfaces.nsMsgSearchAttrib.Sender, 
        Components.interfaces.nsMsgSearchOp.Contains
    );
    return facet;
};

KeeperFinder.FacetAdapters["from domain"] = function(database, collection, box) {
    var facet = new KeeperFinder.ListFacet(
        database, 
        collection, 
        box, 
        {
            facetLabel:     "From domain",
            expression:     ".author.domain",
            filterable:     true,
            selectMultiple: true,
            sortable:       true,
            sortMode:       "value",
            sortDirection:  "forward",
            showMissing:    false,
            missingLabel:   "(No domain)"
        }
    );
        
    facet.getSearchTerm = KeeperFinder.FacetAdapters._createEmailOrDomainGetSearchTerm(
        Components.interfaces.nsMsgSearchAttrib.Sender, 
        Components.interfaces.nsMsgSearchOp.Contains
    );
    return facet;
};

KeeperFinder.FacetAdapters["tag"] = function(database, collection, box) {
    var facet = new KeeperFinder.ListFacet(
        database, 
        collection, 
        box, 
        {
            facetLabel:     "Tag",
            expression:     ".tag",
            filterable:     true,
            selectMultiple: true,
            sortable:       true,
            sortMode:       "value",
            sortDirection:  "forward",
            showMissing:    false,
            missingLabel:   "(No tag)"
        }
    );
        
    facet.getSearchTerm = function() {
        var values = this._valueSet;
        var searchTerm = new KeeperFinder.SearchTerm(
            Components.interfaces.nsMsgSearchAttrib.Keywords, 
            Components.interfaces.nsMsgSearchOp.Contains);
        if (values.size() == 0) {
            searchTerm.matchKeyword = function(keywords) { return true; };
        } else {
            searchTerm.matchKeyword = function(keywords) { 
                var r = false;
                values.visit(function(v) {
                    if (keywords.indexOf(v) >= 0) {
                        r = true;
                        return true;
                    }
                });
                return r;
            };
        }
        return searchTerm;
    };
    return facet;
};

KeeperFinder.FacetAdapters["recency"] = function(database, collection, box) {
    var facet = new KeeperFinder.RecencyFacet(
        database, 
        collection, 
        box, 
        {
            facetLabel:     "Recency",
            expression:     ".date"
        }
    );
    
    facet.getSearchTerm = function() {
        var selection = this._selection;
        
        var searchTerm = new KeeperFinder.SearchTerm(
            Components.interfaces.nsMsgSearchAttrib.Date, 
            Components.interfaces.nsMsgSearchOp.IsGreaterThan);
            
        if (selection == null) {
            searchTerm.matchDate = function(aTime) { return true; };
        } else {
            var from = KeeperFinder.RecencyFacet.computeRecency()[selection];
            
            searchTerm.matchDate = function(aTime) { 
                aTime = aTime / 1000;
                return aTime >= from;
            };
        }
        return searchTerm;
    };
    return facet;
};
