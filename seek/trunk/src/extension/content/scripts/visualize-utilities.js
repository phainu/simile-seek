function createExhibit() {
    createDatabase();   
    window.exhibit = Exhibit.create(window.database);
    window.exhibit.configureFromDOM();
}

function createDatabase() {
    var database1 = window.parent.parameters.database;
    window.database = Exhibit.Database.create();
    
    var properties = database1.getAllProperties();
    var items = [];
    
    database1.getAllItems().visit(function(itemID) {
        var item = { id: itemID };
        for (var i = 0; i < properties.length; i++) {
            var p = properties[i];
            var values = database1.getObjects(itemID, p);
            if (values != null) {
                var c = values.size();
                if (c == 1) {
                    values.visit(function(v) {
                        item[p] = v;
                    });
                } else if (c > 1) {
                    item[p] = values.toArray();
                }
            }
        }
        
        if ("date" in item) {
            try {
                item.date2 = toISO8601(new Date(database1.getObject(itemID, "date")));
            } catch (e) {}
        }
        
        items.push(item);
    });
    
    window.database.loadData({
        items: items,
        properties: {
            "recipient": { valueType: "item" },
            "to": { valueType: "item" },
            "cc": { valueType: "item" },
            "author": { valueType: "item" }
        },
        types: {
            "Message" : { pluralLabel: "Messages" }
        }
    }, "");
}
function toISO8601(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + 
        "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + "Z";
}
function pad(n) {
    return n < 10 ? ("0" + n) : n;
}
