Seek.FacetConfigurations = {};

Seek.FacetConfigurations.possibleFacets = {
    "recency" : {
        showInitially: true,
        config: {
            facetLabel:     "Recency",
            expression:     ".date"
        }
    },
    "to/cc me" : {
        showInitially: true,
        config: {
            facetLabel:     "To/CC me",
            expression:     ".toOrCCToMe",
            filterable:     false,
            selectMultiple: false,
            sortable:       false,
            sortMode:       "value",
            sortDirection:  "forward",
            showMissing:    false,
            missingLabel:   "(No recipient)",
            fixedOrder: [
                "to me",
                "cc'ed to me",
                "to me or cc'ed to me",
                "not to me nor cc'ed to me"
            ]
        }
    },
    "tag" : {
        showInitially: true,
        config: {
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
    },
    "from" : {
        showInitially: true,
        config: {
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
    },
    "from domain" : {
        showInitially: true,
        config: {
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
    },
    "to/cc" : {
        showInitially: false,
        config: {
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
    },
    "to/cc domain" : {
        showInitially: false,
        config: {
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
    }
};

Seek.FacetConfigurations._constructListFacet = function(database, collection, box, name) {
    return new Seek.ListFacet(
        name,
        database, 
        collection, 
        box, 
        Seek.FacetConfigurations.possibleFacets[name].config
    );
};

Seek.FacetConfigurations["to/cc"] = function(database, collection, box) {
    return Seek.FacetConfigurations._constructListFacet(database, collection, box, "to/cc");
};

Seek.FacetConfigurations["to/cc domain"] = function(database, collection, box) {
    return Seek.FacetConfigurations._constructListFacet(database, collection, box, "to/cc domain");
};

Seek.FacetConfigurations["to/cc me"] = function(database, collection, box) {
    return Seek.FacetConfigurations._constructListFacet(database, collection, box, "to/cc me");
};

Seek.FacetConfigurations["from"] = function(database, collection, box) {
    return Seek.FacetConfigurations._constructListFacet(database, collection, box, "from");
};

Seek.FacetConfigurations["from domain"] = function(database, collection, box) {
    return Seek.FacetConfigurations._constructListFacet(database, collection, box, "from domain");
};

Seek.FacetConfigurations["tag"] = function(database, collection, box) {
    return Seek.FacetConfigurations._constructListFacet(database, collection, box, "tag");
};

Seek.FacetConfigurations["recency"] = function(database, collection, box) {
    return new Seek.RecencyFacet(
        "recency",
        database, 
        collection, 
        box, 
        Seek.FacetConfigurations.possibleFacets["recency"].config
    );
};
