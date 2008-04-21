/*==================================================
 *  Seek.ExhibitJsonExporter
 *==================================================
 */
 
Seek.ExhibitJsonExporter = {
    exportPeopleSeparately: false
};

Seek.ExhibitJsonExporter.getFileLabel = function() {
    return Seek.strings.getString("seek.exporters.exhibitJson.fileLabel");
};

Seek.ExhibitJsonExporter.getFileFilter = function() {
    return Seek.strings.getString("seek.exporters.exhibitJson.fileFilter");
};

Seek.ExhibitJsonExporter.exportOne = function(itemID, database, writer) {
    Seek.ExhibitJsonExporter._startWrap(database, writer);
    Seek.ExhibitJsonExporter._exportOne(itemID, database, writer);
    Seek.ExhibitJsonExporter._endWrap(database, writer);
};

Seek.ExhibitJsonExporter.exportMany = function(set, database, writer) {
    var size = set.size();
    var count = 0;

    Seek.ExhibitJsonExporter._startWrap(database, writer);
    set.visit(function(itemID) {
        Seek.ExhibitJsonExporter._exportOne(itemID, database, writer);
        writer.write((count++ < size - 1) ? ",\n" : "\n");
    });
    Seek.ExhibitJsonExporter._endWrap(database, writer);
};

Seek.ExhibitJsonExporter._exportOne = function(itemID, database, writer) {
    function quote(s) {
        if (/[\\\x00-\x1F\x22]/.test(s)) {
            return '"' + s.replace(/([\\\x00-\x1f\x22])/g, function(a, b) {
                var c = { '\b':'\\b', '\t':'\\t', '\n':'\\n', '\f':'\\f',
                          '\r':'\\r',  '"':'\\"', '\\':'\\\\' }[b];
                if (c) {
                    return c;
                }
                c = b.charCodeAt();
                return '\\x' +
                    Math.floor(c / 16).toString(16) +
                    (c % 16).toString(16);
            }) + '"';
        }
        return '"' + s + '"';
    }
    var s = "";
    var uri = database.getObject(itemID, "uri");
    
    s += "  {\"id\":" + quote(itemID) + ",\n";
    
    var allProperties = database.getAllProperties();
    var defaultValueGenerator = function(v) { return v; };
    var dateValueGenerator = function(v) { return Date.toISO8601(new Date(parseInt(v))); };
    
    for (var i = 0; i < allProperties.length; i++) {
        var propertyID = allProperties[i];
        var property = database.getProperty(propertyID);
        var values = database.getObjects(itemID, propertyID);
        var valueType = property.getValueType();
        var valueGenerator = (propertyID == "date") ? dateValueGenerator : defaultValueGenerator;
        
        if (values.size() > 0) {
            var array = values.toArray();
            
            s += "   " + quote(propertyID) + ":";
            if (array.length == 1) {
                s += quote(valueGenerator(array[0]));
            } else {
                s += "[";
                for (var j = 0; j < array.length; j++) {
                    s += (j > 0 ? "," : "") + quote(valueGenerator(array[j]));
                }
                s += "]";
            }
            s += ",\n";
        }
    }
    s += "  }";
    
    writer.write(s);
};

Seek.ExhibitJsonExporter._startWrap = function(database, writer) {
    writer.write("{\n \"items\":[\n");
};

Seek.ExhibitJsonExporter._endWrap = function(database, writer) {
    writer.write(" ]\n}");
};
