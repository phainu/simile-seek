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
    matchKeyword: function(keyword) { KeeperFinder.log("keyword"); return false; },

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

KeeperFinder.FacetAdapters["to/cc"] = function(database, collection, box) {
    var facet = new KeeperFinder.ListFacet(
        database, 
        collection, 
        box, 
        {
            facetLabel:     "To/CC",
            expression:     ".recipient",
            sortMode:       "value",
            sortDirection:  "forward",
            showMissing:    true,
            missingLabel:   "(No recipient)"
        }
    );
        
    facet.getSearchTerm = KeeperFinder.FacetAdapters._createEmailOrDomainGetSearchTerm(
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
            sortMode:       "value",
            sortDirection:  "forward",
            showMissing:    true,
            missingLabel:   "(No domain)"
        }
    );
        
    facet.getSearchTerm = KeeperFinder.FacetAdapters._createEmailOrDomainGetSearchTerm(
        Components.interfaces.nsMsgSearchAttrib.ToOrCC, 
        Components.interfaces.nsMsgSearchOp.Contains
    );
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
            sortMode:       "value",
            sortDirection:  "forward",
            showMissing:    true,
            missingLabel:   "(No sender)"
        }
    );
        
    facet.getSearchTerm = KeeperFinder.FacetAdapters._createEmailOrDomainGetSearchTerm(
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
            sortMode:       "value",
            sortDirection:  "forward",
            showMissing:    true,
            missingLabel:   "(No domain)"
        }
    );
        
    facet.getSearchTerm = KeeperFinder.FacetAdapters._createEmailOrDomainGetSearchTerm(
        Components.interfaces.nsMsgSearchAttrib.Sender, 
        Components.interfaces.nsMsgSearchOp.Contains
    );
    return facet;
};
