/*==================================================
 *  Date Utility Functions and Constants
 *==================================================
 */

(function() {
    var pad = function(n) {
        return n < 10 ? ("0" + n) : n;
    };
    
    Date.toISO8601 = function(d) {
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + 
            "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + "Z";
    };
})();