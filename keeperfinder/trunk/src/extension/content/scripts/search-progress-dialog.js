var KeeperFinderSearchProgressDialog = {
};

KeeperFinderSearchProgressDialog.onLoad = function() {
    var parameters = window.arguments[1];
    parameters.onDone = function() {
        window.close();
    };
    parameters.setMessage = function(s) {
        document.getElementById("keeperFinder-searchProgressDialog-message").value = s;
    };
    
    parameters.onStart();
};

KeeperFinderSearchProgressDialog.onCancel = function() {
    var parameters = window.arguments[1];
    parameters.onCancel();
};
