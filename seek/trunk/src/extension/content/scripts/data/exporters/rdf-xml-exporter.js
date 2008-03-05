/*==================================================
 *  Seek.RdfXmlExporter
 *==================================================
 */
 
Seek.RdfXmlExporter = {
    exportPeopleSeparately: false
};

Seek.RdfXmlExporter.getFileLabel = function() {
    return Seek.strings.getString("seek.exporters.rdfXml.fileLabel");
};

Seek.RdfXmlExporter.getFileFilter = function() {
    return Seek.strings.getString("seek.exporters.rdfXml.fileFilter");
};


Seek.RdfXmlExporter.exportOne = function(itemID, database, writer) {
    var propertyIDToQualifiedName = {};
    var prefixToBase = {};
    database.getNamespaces(propertyIDToQualifiedName, prefixToBase);
    
    
    Seek.RdfXmlExporter._startWrap(database, prefixToBase, writer);
    Seek.RdfXmlExporter._exportOne(
        itemID, 
        database,
        propertyIDToQualifiedName, 
        prefixToBase,
        writer
    );
    Seek.RdfXmlExporter._endWrap(database, prefixToBase, writer);
};

Seek.RdfXmlExporter.exportMany = function(set, database, writer) {
    var s = "";
    
    var propertyIDToQualifiedName = {};
    var prefixToBase = {};
    database.getNamespaces(propertyIDToQualifiedName, prefixToBase);
    
    Seek.RdfXmlExporter._startWrap(database, prefixToBase, writer);
    set.visit(function(itemID) {
        Seek.RdfXmlExporter._exportOne(
            itemID, 
            database,
            propertyIDToQualifiedName, 
            prefixToBase,
            writer
        );
        writer.write("\n");
    });
    Seek.RdfXmlExporter._endWrap(database, prefixToBase, writer);
};

Seek.RdfXmlExporter._exportOne = function(itemID, database, propertyIDToQualifiedName, prefixToBase, writer) {
    var uri = database.getObject(itemID, "uri");
    writer.write("<rdf:Description rdf:about='" + uri + "'>\n");
    
    var allProperties = database.getAllProperties();
    for (var i = 0; i < allProperties.length; i++) {
        var propertyID = allProperties[i];
        var property = database.getProperty(propertyID);
        var values = database.getObjects(itemID, propertyID);
        var valueType = property.getValueType();
        
        var propertyString;
        if (propertyID in propertyIDToQualifiedName) {
            var qname = propertyIDToQualifiedName[propertyID];
            propertyString = qname.prefix + ":" + qname.localName;
        } else {
            propertyString = property.getURI();
        }
        
        if (valueType == "item") {
            values.visit(function(value) {
                writer.write("\t<" + propertyString + " rdf:resource='" + database.getObject(value, "uri") + "' />\n");
            });
        } else if (propertyID == "date") {
            values.visit(function(value) {
                writer.write("\t<" + propertyString + ">" + Date.toISO8601(new Date(parseInt(value))) + "</" + propertyString + ">\n");
            });
        } else if (propertyID != "uri") {
            values.visit(function(value) {
                writer.write("\t<" + propertyString + ">" + value + "</" + propertyString + ">\n");
            });
        }
    }
    writer.write("</rdf:Description>");
};

Seek.RdfXmlExporter._startWrap = function(database, prefixToBase, writer) {
    writer.write(
        "<?xml version='1.0'?>\n" +
        "<rdf:RDF xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'\n" +
        "\txmlns:Seek='http://simile.mit.edu/2006/11/Seek#'");
        
    for (prefix in prefixToBase) {
        writer.write("\n\txmlns:" + prefix + "='" + prefixToBase[prefix] + "'");
    }
    
    writer.write(">\n");
};

Seek.RdfXmlExporter._endWrap = function(database, prefixToBase, writer) {
    writer.write("\n</rdf:RDF>");
};
