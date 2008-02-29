var KeeperFinderVisualizeWindow = {
};

KeeperFinderVisualizeWindow.log = function(msg) {
    Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService)
            .logStringMessage(msg);
};

KeeperFinderVisualizeWindow.onLoad = function() {
    window.parameters = {
        database: window.arguments[1].database
    };
};

KeeperFinderVisualizeWindow.browse = function() {
    var browser = KeeperFinderVisualizeWindow._getBrowser();
    var url = document.getElementById("keeperFinder-visualizeWindow-url").value;
    browser.loadURI(url);
}

KeeperFinderVisualizeWindow._getBrowser = function() {
    return document.getElementById("keeperFinder-visualizeWindow-browser");
};
