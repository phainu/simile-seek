Seek.Indexer = {
    _indexingTimerID:   null,
    _indexingJob:       null,
    accountAddresses:   {}
};

Seek.Indexer._priorityLabels = [
    "", //"notset",
    "", //"none",
    "Lowest",
    "Low",
    "Normal",
    "High",
    "Highest"
];

Seek.Indexer.startIndexingJob = function(database, msgFolder, onProgress, onDone) {
    var msgDatabase = msgFolder.getMsgDatabase(msgWindow);
    
    Seek.Indexer._retrieveAccounts();
    Seek.Indexer._retrieveTags();
    
    Seek.Indexer._indexingJob = {
        database:       database,
        msgFolder:      msgFolder,
        msgDatabase:    msgDatabase,
        totalCount:     msgFolder.getTotalMessages(false /* not deep */),
        processedCount: 0,
        enumerator:     msgDatabase.EnumerateMessages(),
        entityMap:      {},
        onProgress:     onProgress,
        onDone:         onDone
    };
    Seek.Indexer._startIndexingJob();
};

Seek.Indexer.cancelIndexingJob = function() {
    if (Seek.Indexer._indexingTimerID != null) {
        window.clearTimeout(Seek.Indexer._indexingTimerID);
        Seek.Indexer._indexingTimerID = null;
    }
    Seek.Indexer._indexingJob = null;
};


Seek.Indexer.getTags = function(msgHdr) {
    var keys = msgHdr.getStringProperty("keywords").split(" ");
    var label = msgHdr.label;
    if (label >= 0) {
        var labelKey = "$label" + label;
        if (keys.indexOf(labelKey) < 0) {
            keys.unshift(labelKey);
        }
    }
    
    for (var i = keys.length - 1; i >= 0; i--) {
        if (!(keys[i] in this._tagKeys)) {
            keys.splice(i, 1);
        }
    }
    
    return keys;
};

Seek.Indexer.getTagLabels = function(msgHdr) {
    var r = Seek.Indexer.getTags(msgHdr);
    for (var i = 0; i < r.length; i++) {
        r[i] = this._tagKeys[r[i]];
    }
    return r;
};

Seek.Indexer.getPriority = function(msgHdr) {
    return Seek.Indexer._priorityLabels[msgHdr.priority];
};

Seek.Indexer._retrieveAccounts = function() {
    Seek.Indexer.accountAddresses = {};

    var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
    var accounts = accountManager.accounts;
    var count = accounts.Count();
    for (var i = 0; i < count; i++) {
        var account = accounts.GetElementAt(i).QueryInterface(Components.interfaces.nsIMsgAccount);
        
        var identities = account.identities;
        var identityCount = identities.Count();
        for (var j = 0; j < identityCount; j++) {
            var identity = identities.GetElementAt(j).QueryInterface(Components.interfaces.nsIMsgIdentity);
            Seek.Indexer.accountAddresses[identity.email] = true;
        }
    }
};

Seek.Indexer._retrieveTags = function() {
    var tagService = Components.classes["@mozilla.org/messenger/tagservice;1"].
        getService(Components.interfaces.nsIMsgTagService);
        
    var tagArray = tagService.getAllTags({});
    var tagKeys = {};
    for each (var tagInfo in tagArray) {
        if (tagInfo.tag) {
            tagKeys[tagInfo.key] = tagInfo.tag;
        }
    }
    
    this._tagKeys = tagKeys;
};

Seek.Indexer._startIndexingJob = function() {
    Seek.Indexer._indexingTimerID = window.setTimeout(function() {
        Seek.Indexer._indexingTimerID = null;
        Seek.Indexer._performIndexingJob();
    }, 100);
};

Seek.Indexer._performIndexingJob = function() {
    var count = 0;
    var job = Seek.Indexer._indexingJob;
    var msgFolder = job.msgFolder;
    var database = job.database;
    var entityMap = job.entityMap;
    var items = [];
    
    var e = job.enumerator;
    while (e.hasMoreElements() && count < 25) {
        var o = e.getNext();
        var msgHdr = o.QueryInterface(Components.interfaces.nsIMsgDBHdr);
        Seek.Indexer.indexMsg(msgFolder, msgHdr, database, entityMap, items);
        
        count++;
    }
    database.loadItems(items, "");
    
    job.processedCount += count;
    job.onProgress(Math.floor(100 * job.processedCount / job.totalCount));
    
    if (e.hasMoreElements() /*&& job.processedCount < 500*/) {
        Seek.Indexer._startIndexingJob();
    } else {
        Seek.Indexer._onFinishIndexingJob();
    }
};

Seek.Indexer.makeMessageID = function(msgKey) {
    return "urn:message:" + msgKey;
};

Seek.Indexer.indexMsg = function(msgFolder, msgHdr, database, entityMap, items) {
    var messageID = Seek.Indexer.makeMessageID(msgHdr.messageKey);
    var subject = msgHdr.mime2DecodedSubject;
    if (subject == null || subject.length == 0) {
        subject = msgHdr.subject;
    }
    if (subject == null) {
        subject = "";
    }
    
    var item = {
        type:       "Message",
        label:      subject,
        id:         messageID,
        uri:        msgFolder.generateMessageURI(msgHdr.messageKey),
        msgKey:     msgHdr.messageKey,
        date:       msgHdr.dateInSeconds * 1000
    };
    if (!msgHdr.isRead) {
        item.isNew = true;
    }
    Seek.Indexer._addEntityList(item, "author", msgHdr.mime2DecodedAuthor /*.author*/, entityMap);
    Seek.Indexer._addEntityList(item, "to", msgHdr.mime2DecodedRecipients /*.recipients*/, entityMap);
    Seek.Indexer._addEntityList(item, "cc", msgHdr.ccList, entityMap);
    
    var priority = Seek.Indexer.getPriority(msgHdr);
    if (priority.length > 0) {
        item.priority = priority;
    }
    
    if ("to" in item) {
        if ("cc" in item) {
            item.recipient = item.to.concat(item.cc);
        } else {
            item.recipient = [].concat(item.to);
        }
        
    } else if ("cc" in item) {
        item.recipient = [].concat(item.cc);
    }
    
    var toMe = false;
    if ("to" in item) {
        for (var i = 0; i < item.to.length; i++) {
            if (item.to[i] in Seek.Indexer.accountAddresses) {
                toMe = true;
                break;
            }
        }
    }
    
    var ccMe = false;
    if ("cc" in item) {
        for (var i = 0; i < item.cc.length; i++) {
            if (item.cc[i] in Seek.Indexer.accountAddresses) {
                ccMe = true;
                break;
            }
        }
    }
    
    var me = [];
    if (toMe) {
        me.push("to me");
    }
    if (ccMe) {
        me.push("cc'ed to me");
    }
    if (toMe || ccMe) {
        me.push("to me or cc'ed to me");
    } else {
        me.push("not to me nor cc'ed to me");
    }
    item.toOrCCToMe = me;
    
    item.tag = Seek.Indexer.getTagLabels(msgHdr);
    
    items.push(item);
};

Seek.Indexer._addIfNotEmpty = function(item, name, value) {
    if (value != null && value.length > 0) {
        item[name] = value;
    }
};

Seek.Indexer._addEntityList = function(item, name, value, map) {
    if (typeof value != "string") {
        return;
    }
    
    var entities = [];
    
    var start = 0;
    var entityStrings = [];
    var inString = false;
    for (var i = 0; i < value.length; i++) {
        var c = value.charAt(i);
        if (c == '"') {
            inString = !inString;
        } else if (c == ',' && !inString) {
            entityStrings.push(value.substring(start, i));
            start = i + 1;
        }
    }
    entityStrings.push(value.substr(start));
    
    for (var i = 0; i < entityStrings.length; i++) {
        var entityString = entityStrings[i].trim();
        if (entityString.length == 0) {
            continue;
        }
        
        var lessThan = entityString.indexOf("<");
        
        var emailAddress, label;
        if (lessThan < 0) {
            emailAddress = label = entityString.toLowerCase();
        } else {
            var greaterThan = entityString.indexOf(">");
            greaterThan = (greaterThan < 0) ? entityString.length : greaterThan;
            
            label = entityString.substring(0, lessThan).trim().replace(/^["']+|["']+$/g, '');
            emailAddress = entityString.substring(lessThan + 1, greaterThan).toLowerCase();
            if (label.length == 0) {
                label = emailAddress;
            }
        }
        
        var entity;
        if (emailAddress in map) {
            entity = map[emailAddress];
            Seek.Indexer._appendValue(entity, "label", label);
        } else {
            map[emailAddress] = entity = {
                id:     emailAddress,
                label:  label,
                uri:    "mailto:" + emailAddress
            };
        }
        
        entities.push(emailAddress);
    }
    
    if (entities.length > 0) {
        item[name] = entities;
    }
};

Seek.Indexer._appendValue = function(item, name, value) {
    if (name in item) {
        var a = item[name];
        if (typeof a == "array" || (typeof a == "object" && "concat" in a)) {
            for (var i = 0; i < a.length; i++) {
                if (a[i] == value) {
                    return;
                }
            }
            a.push(value);
        } else if (a != value) {
            item[name] = [ a, value ];
        }
    } else {
        item[name] = value;
    }
};

Seek.Indexer._onFinishIndexingJob = function() {
    var job = Seek.Indexer._indexingJob;
    var database = job.database;
    var entityMap = job.entityMap;
    
    var entities = [];
    for (var emailAddress in entityMap) {
        var entity = entityMap[emailAddress];
        var at = emailAddress.indexOf("@");
        if (at > 0) {
            entity.domain = emailAddress.substr(at).toLowerCase();
            
            var dot = entity.domain.lastIndexOf(".");
            if (dot > 0) {
                entity.tld = entity.domain.substr(dot + 1);
                
                var secondDot = entity.domain.lastIndexOf(".", dot - 1);
                entity.stld = (secondDot > 0) ? entity.domain.substr(secondDot + 1) : entity.domain.substr(1);
            }
        }
        entities.push(entity);
    }
    database.loadItems(entities, "");
    database.loadData({
        properties: {
            "recipient": { valueType: "item" },
            "to": { valueType: "item" },
            "cc": { valueType: "item" },
            "author": { valueType: "item" }
        }
    }, "");
    
    Seek.Indexer._indexingJob = null;
    
    job.onDone();
};
