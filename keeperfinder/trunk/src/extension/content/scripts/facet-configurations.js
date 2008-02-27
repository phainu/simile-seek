KeeperFinder.FacetConfigurations = {};

KeeperFinder.FacetConfigurations.possibleFacets = {
    "recency" : {
        showInitially: true
    },
    "to/cc me" : {
        showInitially: true
    },
    "tag" : {
        showInitially: true
    },
    "from" : {
        showInitially: true
    },
    "from domain" : {
        showInitially: true
    },
    "to/cc" : {
        showInitially: false
    },
    "to/cc domain" : {
        showInitially: false
    }
};

KeeperFinder.FacetConfigurations["to/cc"] = function(database, collection, box) {
    return new KeeperFinder.ListFacet(
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
};

KeeperFinder.FacetConfigurations["to/cc name"] = function(database, collection, box) {
    return new KeeperFinder.ListFacet(
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
};

KeeperFinder.FacetConfigurations["to/cc domain"] = function(database, collection, box) {
    return new KeeperFinder.ListFacet(
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
};

KeeperFinder.FacetConfigurations["to/cc me"] = function(database, collection, box) {
    return new KeeperFinder.ListFacet(
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
            missingLabel:   "(No recipient)",
            fixedOrder: [
                "to me",
                "cc'ed to me",
                "to me or cc'ed to me",
                "not to me nor cc'ed to me"
            ]
        }
    );
};

KeeperFinder.FacetConfigurations["from"] = function(database, collection, box) {
    return new KeeperFinder.ListFacet(
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
};

KeeperFinder.FacetConfigurations["from name"] = function(database, collection, box) {
    return new KeeperFinder.ListFacet(
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
};

KeeperFinder.FacetConfigurations["from domain"] = function(database, collection, box) {
    return new KeeperFinder.ListFacet(
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
};

KeeperFinder.FacetConfigurations["tag"] = function(database, collection, box) {
    return new KeeperFinder.ListFacet(
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
};

KeeperFinder.FacetConfigurations["recency"] = function(database, collection, box) {
    return new KeeperFinder.RecencyFacet(
        database, 
        collection, 
        box, 
        {
            facetLabel:     "Recency",
            expression:     ".date"
        }
    );
};
