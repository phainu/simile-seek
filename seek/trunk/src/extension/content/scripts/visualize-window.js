var SeekVisualizeWindow = {
};

SeekVisualizeWindow.log = function(msg) {
    Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService)
            .logStringMessage(msg);
};

SeekVisualizeWindow.onLoad = function() {
    window.parameters = {
        database: window.arguments[1].database
    };
};

SeekVisualizeWindow.browse = function() {
    var browser = SeekVisualizeWindow._getBrowser();
    var url = document.getElementById("seek-visualizeWindow-url").value;
    browser.loadURI(url);
}

SeekVisualizeWindow._getBrowser = function() {
    return document.getElementById("seek-visualizeWindow-browser");
};
