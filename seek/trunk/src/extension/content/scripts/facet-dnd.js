Seek._draggingFacet = {
    dragging: false
};

Seek.startDraggingFacet = function(event, facet, box) {
    Seek._calculateFacetOffsets(box);
    
    Seek._draggingFacet.facet = facet;
    Seek._draggingFacet.box = box;
    Seek._draggingFacet.mouseDownX = event.screenX - box.boxObject.screenX;
    Seek._draggingFacet.mouseDownY = event.screenY - box.boxObject.screenY;
    
    var facetWidth = box.boxObject.width;
    var facetHeight = box.boxObject.height;
    Seek._draggingFacet.facetWidth = facetWidth;
    
    var facetContainer = Seek._getFacetContainer();
    var scrollBoxObject = facetContainer.boxObject.QueryInterface(Components.interfaces.nsIScrollBoxObject);
    var x = {}; var y = {};
    scrollBoxObject.getPosition(x, y);
    
    facetContainer.removeChild(box.nextSibling);
    facetContainer.removeChild(box);
    
    var outerBox = document.createElement("box");
    outerBox.style.position = "fixed";
    outerBox.style.width = (facetWidth + 4) + "px";
    outerBox.style.height = (facetHeight + 4) + "px";
    outerBox.style.zIndex = "1000";
    outerBox.style.background = "#eee";
    outerBox.style.padding = "2px";
    outerBox.appendChild(box);
    
    box.style.width = "100%";
    box.style.height = "100%";
    Seek._draggingFacet.outerBox = outerBox;
    
    document.getElementById("messengerWindow").appendChild(outerBox);
    
    facet.refresh();
    
    Seek._positionDraggedFacet(event);
    
    Seek._insertDropTarget();
    scrollBoxObject.scrollTo(x.value, y.value);
    
    Seek._draggingFacet.dragging = true;
}

Seek.onWindowMouseMove = function(event) {
    if (Seek._draggingFacet.dragging) {
        Seek._positionDraggedFacet(event);
        
        var newTargetIndex = Seek._hittestFacet(event);
        if (newTargetIndex != Seek._draggingFacet.targetIndex) {
            var facetContainer = Seek._getFacetContainer();
            var scrollBoxObject = facetContainer.boxObject.QueryInterface(Components.interfaces.nsIScrollBoxObject);
            var x = {}; var y = {};
            scrollBoxObject.getPosition(x, y);
            
            Seek._removeDropTarget();
            
            Seek._draggingFacet.targetIndex = newTargetIndex;
                
            Seek._insertDropTarget();
            
            scrollBoxObject.scrollTo(x.value, y.value);
        }
    }
}

Seek.onWindowMouseUp = function(event) {
    if (Seek._draggingFacet.dragging) {
        Seek._draggingFacet.dragging = false;
        
        var newTargetIndex = Seek._hittestFacet(event);
        
        Seek._removeDropTarget();
        
        document.getElementById("messengerWindow").removeChild(Seek._draggingFacet.outerBox);
        Seek._draggingFacet.outerBox.removeChild(Seek._draggingFacet.box);
        Seek._draggingFacet.outerBox = null;
        
        var facetContainer = Seek._getFacetContainer();
        var insertIndex = 
            (newTargetIndex > Seek._draggingFacet.sourceIndex) ?
                (newTargetIndex - 1) :
                newTargetIndex;
                
        var before = facetContainer.childNodes[insertIndex * 2];
        facetContainer.insertBefore(Seek._draggingFacet.box, before);
        facetContainer.insertBefore(Seek.FacetUtilities.createFacetSplitter(), before);
        Seek._draggingFacet.box.style.width = Seek._draggingFacet.facetWidth + "px";
        Seek._draggingFacet.box = null;
        
        if (Seek._draggingFacet.sourceIndex != newTargetIndex) {
            Seek._facets.splice(Seek._draggingFacet.sourceIndex, 1);
            Seek._facets.splice(insertIndex, 0, Seek._draggingFacet.facet);
            Seek._saveSettings();
        }
        
        Seek._draggingFacet.facet.refresh();
        Seek._draggingFacet.facet = null;
    }
}

Seek._insertDropTarget = function() {
    var facetContainer = Seek._getFacetContainer();
    var insertIndex = 
        (Seek._draggingFacet.targetIndex > Seek._draggingFacet.sourceIndex) ?
            (Seek._draggingFacet.targetIndex - 1) :
            Seek._draggingFacet.targetIndex;
            
    var before = facetContainer.childNodes[insertIndex * 2];
    
    var dropTarget = document.createElement("box");
    dropTarget.style.width = Seek._draggingFacet.box.boxObject.width + "px";
    dropTarget.style.background = "#ccc";
    facetContainer.insertBefore(dropTarget, before);
    
    facetContainer.insertBefore(Seek.FacetUtilities.createFacetSplitter(), before);
}

Seek._removeDropTarget = function() {
    var facetContainer = Seek._getFacetContainer();
    var index = 
        (Seek._draggingFacet.targetIndex > Seek._draggingFacet.sourceIndex) ?
            (Seek._draggingFacet.targetIndex - 1) :
            Seek._draggingFacet.targetIndex;
            
    var dropTarget = facetContainer.childNodes[index * 2];
    facetContainer.removeChild(dropTarget.nextSibling);
    facetContainer.removeChild(dropTarget);
}

Seek._calculateFacetOffsets = function(box) {
    var widths = [];
    var facetContainer = Seek._getFacetContainer();
    
    for (var i = 0; i < facetContainer.childNodes.length - 1; i += 2) {
        var childNode = facetContainer.childNodes[i];
        widths.push(childNode.boxObject.width);
        if (childNode == box) {
            Seek._draggingFacet.sourceIndex = 
                Seek._draggingFacet.targetIndex = 
                    (i / 2);
        }
    }
    
    Seek._draggingFacet.widths = widths;
    Seek._draggingFacet.resizerWidth = 
        (facetContainer.childNodes.length > 1) ?
        facetContainer.childNodes[1].boxObject.width :
        0;
}

Seek._positionDraggedFacet = function(event) {
    var outerBox = Seek._draggingFacet.outerBox;
    var x = event.clientX - Seek._draggingFacet.mouseDownX;
    var y = event.clientY - Seek._draggingFacet.mouseDownY;
    
    outerBox.style.left = x + "px";
    outerBox.style.top = y + "px";
}

Seek._hittestFacet = function(event) {
    var facetContainer = Seek._getFacetContainer();
    var firstChild = facetContainer.firstChild;
    var scrollLeft = firstChild.boxObject.screenX - facetContainer.boxObject.screenX;
    var offset = ((event.clientX - Seek._draggingFacet.mouseDownX) - scrollLeft) - facetContainer.boxObject.x;
    
    var index = 0;
    while (index < Seek._facets.length) {
        var width = Seek._draggingFacet.widths[index] + Seek._draggingFacet.resizerWidth;
        if (index != Seek._draggingFacet.sourceIndex) {
            if (offset < width / 2) {
                break;
            }
            offset -= width;
        }
        index++;
    }
    return index;
}
