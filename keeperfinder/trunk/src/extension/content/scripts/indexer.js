KeeperFinder.Indexer = {
    _indexingTimerID:   null,
    _indexingJob:       null,
    accountAddresses:   {}
};


KeeperFinder.Indexer.startIndexingJob = function(database, msgFolder, onProgress, onDone) {
    var msgDatabase = msgFolder.getMsgDatabase(msgWindow);
    
    KeeperFinder.Indexer._retrieveAccounts();
    KeeperFinder.Indexer._indexingJob = {
        database:       database,
        msgDatabase:    msgDatabase,
        totalCount:     msgFolder.getTotalMessages(false /* not deep */),
        processedCount: 0,
        enumerator:     msgDatabase.EnumerateMessages(),
        entityMap:      {},
        onProgress:     onProgress,
        onDone:         onDone
    };
    KeeperFinder.Indexer._startIndexingJob();
};

KeeperFinder.Indexer.cancelIndexingJob = function() {
    if (KeeperFinder.Indexer._indexingTimerID != null) {
        window.clearTimeout(KeeperFinder.Indexer._indexingTimerID);
        KeeperFinder.Indexer._indexingTimerID = null;
    }
    KeeperFinder.Indexer._indexingJob = null;
};

KeeperFinder.Indexer._retrieveAccounts = function() {
    KeeperFinder.Indexer.accountAddresses = {};

    var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
    var accounts = accountManager.accounts;
    var count = accounts.Count();
    for (var i = 0; i < count; i++) {
        var account = accounts.GetElementAt(i).QueryInterface(Components.interfaces.nsIMsgAccount);
        
        var identities = account.identities;
        var identityCount = identities.Count();
        for (var j = 0; j < identityCount; j++) {
            var identity = identities.GetElementAt(j).QueryInterface(Components.interfaces.nsIMsgIdentity);
            KeeperFinder.Indexer.accountAddresses[identity.email] = true;
        }
    }
};

KeeperFinder.Indexer._startIndexingJob = function() {
    KeeperFinder.Indexer._indexingTimerID = window.setTimeout(function() {
        KeeperFinder.Indexer._indexingTimerID = null;
        KeeperFinder.Indexer._performIndexingJob();
    }, 100);
};

KeeperFinder.Indexer._performIndexingJob = function() {
    var count = 0;
    var job = KeeperFinder.Indexer._indexingJob;
    var database = job.database;
    var entityMap = job.entityMap;
    var items = [];
    
    var e = job.enumerator;
    while (e.hasMoreElements() && count < 25) {
        var o = e.getNext();
        var msgHdr = o.QueryInterface(Components.interfaces.nsIMsgDBHdr);
        KeeperFinder.Indexer._indexMsg(msgHdr, database, entityMap, items);
        
        count++;
    }
    database.loadItems(items, "");
    
    job.processedCount += count;
    job.onProgress(Math.floor(100 * job.processedCount / job.totalCount));
    
    if (e.hasMoreElements() /*&& job.processedCount < 500*/) {
        KeeperFinder.Indexer._startIndexingJob();
    } else {
        KeeperFinder.Indexer._onFinishIndexingJob();
    }
};

KeeperFinder.Indexer._indexMsg = function(msgHdr, database, entityMap, items) {
    var messageID = "urn:message:" + msgHdr.messageKey;
    var item = {
        type:       "Message",
        label:      msgHdr.subject || "",
        id:         messageID,
        uri:        messageID,
        date:       msgHdr.dateInSeconds * 1000
    };
    if (!msgHdr.isRead) {
        item.isNew = true;
    }
    KeeperFinder.Indexer._addEntityList(item, "author", msgHdr.author, entityMap);
    KeeperFinder.Indexer._addEntityList(item, "to", msgHdr.recipients, entityMap);
    KeeperFinder.Indexer._addEntityList(item, "cc", msgHdr.ccList, entityMap);
    
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
            if (item.to[i] in KeeperFinder.Indexer.accountAddresses) {
                toMe = true;
                break;
            }
        }
    }
    
    var ccMe = false;
    if ("cc" in item) {
        for (var i = 0; i < item.cc.length; i++) {
            if (item.cc[i] in KeeperFinder.Indexer.accountAddresses) {
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
    
    var tags = msgHdr.getStringProperty("keywords");
    if (tags.length > 0 && tags != "nonjunk") {
        tags.replace(/nonjunk/g, "");
        item.tag = tags.split(" ");
    }
    
    items.push(item);
};

KeeperFinder.Indexer._addIfNotEmpty = function(item, name, value) {
    if (value != null && value.length > 0) {
        item[name] = value;
    }
};

KeeperFinder.Indexer._addEntityList = function(item, name, value, map) {
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
            KeeperFinder.Indexer._appendValue(entity, "label", label);
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

KeeperFinder.Indexer._appendValue = function(item, name, value) {
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

KeeperFinder.Indexer._onFinishIndexingJob = function() {
    var job = KeeperFinder.Indexer._indexingJob;
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
                if (secondDot > 0) {
                    entity.stld = entity.domain.substr(secondDot + 1);
                }
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
    
    KeeperFinder.Indexer._indexingJob = null;
    
    job.onDone();
};
