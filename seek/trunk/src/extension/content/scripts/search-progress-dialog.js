var SeekSearchProgressDialog = {
};

SeekSearchProgressDialog.onLoad = function() {
    var parameters = window.arguments[1];
    parameters.onDone = function() {
        window.close();
    };
    parameters.setMessage = function(s) {
        document.getElementById("seek-searchProgressDialog-message").value = s;
    };
    
    parameters.onStart();
};

SeekSearchProgressDialog.onCancel = function() {
    var parameters = window.arguments[1];
    parameters.onCancel();
};
