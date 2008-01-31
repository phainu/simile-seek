/*==================================================
 *  KeeperFinder.Database English localization
 *==================================================
 */

if (!("l10n" in KeeperFinder.Database)) {
    KeeperFinder.Database.l10n = {};
}

KeeperFinder.Database.l10n.itemType = {
    label:          "Item",
    pluralLabel:    "Items",
    uri:            "http://simile.mit.edu/2006/11/exhibit#Item"
};
KeeperFinder.Database.l10n.labelProperty = {
    label:                  "label",
    pluralLabel:            "labels",
    reverseLabel:           "label of",
    reversePluralLabel:     "labels of"
};
KeeperFinder.Database.l10n.typeProperty = {
    label:                  "type",
    pluralLabel:            "types",
    reverseLabel:           "type of",
    reversePluralLabel:     "types of"
};
KeeperFinder.Database.l10n.uriProperty = {
    label:                  "URI",
    pluralLabel:            "URIs",
    reverseLabel:           "URI of",
    reversePluralLabel:     "URIs of"
};
KeeperFinder.Database.l10n.sortLabels = {
    "text": {
        ascending:  "a - z",
        descending: "z - a"
    },
    "number": {
        ascending:  "smallest first",
        descending: "largest first"
    },
    "date": {
        ascending:  "earliest first",
        descending: "latest first"
    },
    "boolean": {
        ascending:  "false first",
        descending: "true first"
    },
    "item": {
        ascending:  "a - z",
        descending: "z - a"
    }
};

KeeperFinder.Database.l10n.labelItemsOfType = function(count, typeID, database, countStyleClass) {
    var label = count == 1 ? KeeperFinder.Database.l10n.itemType.label :
        KeeperFinder.Database.l10n.itemType.pluralLabel
        
    var type = database.getType(typeID);
    if (type) {
        label = type.getLabel();
        if (count != 1) {
            var pluralLabel = type.getProperty("pluralLabel");
            if (pluralLabel) {
                label = pluralLabel;
            }
        }
    }
    
    var span = document.createElement("span");
    span.innerHTML = "<span class='" + countStyleClass + "'>" + count + "</span> " + label;
    
    return span;
};
