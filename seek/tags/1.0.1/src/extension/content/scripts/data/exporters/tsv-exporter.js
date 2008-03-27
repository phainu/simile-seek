/*==================================================
 *  Seek.TSVExporter
 *==================================================
 */
 
Seek.TSVExporter = {
    exportPeopleSeparately: true
};

Seek.TSVExporter.getFileLabel = function() {
    return Seek.strings.getString("seek.exporters.tsv.fileLabel");
};

Seek.TSVExporter.getFileFilter = function() {
    return Seek.strings.getString("seek.exporters.tsv.fileFilter");
};

Seek.TSVExporter.exportOne = function(itemID, database, writer) {
    Seek.TSVExporter._startWrap(database, writer);
    Seek.TSVExporter._exportOne(itemID, database, writer);
    Seek.TSVExporter._endWrap(database, writer);
};

Seek.TSVExporter.exportMany = function(set, database, writer) {
    var s = "";

    Seek.TSVExporter._startWrap(database, writer);
    set.visit(function(itemID) {
        Seek.TSVExporter._exportOne(itemID, database, writer);
        writer.write("\n");
    });
    Seek.TSVExporter._endWrap(database, writer);
};

Seek.TSVExporter._exportOne = function(itemID, database, writer) {
    var allProperties = database.getAllProperties();
    var defaultValueGenerator = function(v) { return v; };
    var dateValueGenerator = function(v) { return Date.toISO8601(new Date(v)); };
    
    for (var i = 0; i < allProperties.length; i++) {
        var propertyID = allProperties[i];
        var property = database.getProperty(propertyID);
        var values = database.getObjects(itemID, propertyID);
        var valueType = property.getValueType();
        var valuesA = values.toArray();
        
        if (propertyID == "date") {
            for (var j = 0; j < valuesA.length; j++) {
                valuesA[j] = Date.toISO8601(new Date(parseInt(valuesA[j])));
            }
        }
        writer.write(valuesA.join("; ") + "\t");
    }
};

Seek.TSVExporter._startWrap = function(database, writer) {
    var allProperties = database.getAllProperties();
    for (var i = 0; i < allProperties.length; i++) {
        var propertyID = allProperties[i];
        var property = database.getProperty(propertyID);
        var valueType = property.getValueType();
        writer.write(propertyID + ":" + valueType + "\t");
    }
    
    writer.write("\n");
};

Seek.TSVExporter._endWrap = function(database, writer) {
};
