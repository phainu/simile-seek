KeeperFinder._draggingFacet = {
    dragging: false
};

KeeperFinder.startDraggingFacet = function(event, facet, box) {
    KeeperFinder._calculateFacetOffsets(box);
    
    KeeperFinder._draggingFacet.facet = facet;
    KeeperFinder._draggingFacet.box = box;
    KeeperFinder._draggingFacet.mouseDownX = event.screenX - box.boxObject.screenX;
    KeeperFinder._draggingFacet.mouseDownY = event.screenY - box.boxObject.screenY;
    
    var facetWidth = box.boxObject.width;
    var facetHeight = box.boxObject.height;
    KeeperFinder._draggingFacet.facetWidth = facetWidth;
    
    var facetContainer = KeeperFinder._getFacetContainer();
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
    KeeperFinder._draggingFacet.outerBox = outerBox;
    
    document.getElementById("messengerWindow").appendChild(outerBox);
    
    facet.refresh();
    
    KeeperFinder._positionDraggedFacet(event);
    
    KeeperFinder._insertDropTarget();
    scrollBoxObject.scrollTo(x.value, y.value);
    
    KeeperFinder._draggingFacet.dragging = true;
}

KeeperFinder.onWindowMouseMove = function(event) {
    if (KeeperFinder._draggingFacet.dragging) {
        KeeperFinder._positionDraggedFacet(event);
        
        var newTargetIndex = KeeperFinder._hittestFacet(event);
        if (newTargetIndex != KeeperFinder._draggingFacet.targetIndex) {
            var facetContainer = KeeperFinder._getFacetContainer();
            var scrollBoxObject = facetContainer.boxObject.QueryInterface(Components.interfaces.nsIScrollBoxObject);
            var x = {}; var y = {};
            scrollBoxObject.getPosition(x, y);
            
            KeeperFinder._removeDropTarget();
            
            KeeperFinder._draggingFacet.targetIndex = newTargetIndex;
                
            KeeperFinder._insertDropTarget();
            
            scrollBoxObject.scrollTo(x.value, y.value);
        }
    }
}

KeeperFinder.onWindowMouseUp = function(event) {
    if (KeeperFinder._draggingFacet.dragging) {
        KeeperFinder._draggingFacet.dragging = false;
        
        var newTargetIndex = KeeperFinder._hittestFacet(event);
        
        KeeperFinder._removeDropTarget();
        
        document.getElementById("messengerWindow").removeChild(KeeperFinder._draggingFacet.outerBox);
        KeeperFinder._draggingFacet.outerBox.removeChild(KeeperFinder._draggingFacet.box);
        KeeperFinder._draggingFacet.outerBox = null;
        
        var facetContainer = KeeperFinder._getFacetContainer();
        var insertIndex = 
            (newTargetIndex > KeeperFinder._draggingFacet.sourceIndex) ?
                (newTargetIndex - 1) :
                newTargetIndex;
                
        var before = facetContainer.childNodes[insertIndex * 2];
        facetContainer.insertBefore(KeeperFinder._draggingFacet.box, before);
        facetContainer.insertBefore(KeeperFinder.FacetUtilities.createFacetSplitter(), before);
        KeeperFinder._draggingFacet.box.style.width = KeeperFinder._draggingFacet.facetWidth + "px";
        KeeperFinder._draggingFacet.box = null;
        
        if (KeeperFinder._draggingFacet.sourceIndex != newTargetIndex) {
            KeeperFinder._facets.splice(KeeperFinder._draggingFacet.sourceIndex, 1);
            KeeperFinder._facets.splice(insertIndex, 0, KeeperFinder._draggingFacet.facet);
        }
        
        KeeperFinder._draggingFacet.facet.refresh();
        KeeperFinder._draggingFacet.facet = null;
    }
}

KeeperFinder._insertDropTarget = function() {
    var facetContainer = KeeperFinder._getFacetContainer();
    var insertIndex = 
        (KeeperFinder._draggingFacet.targetIndex > KeeperFinder._draggingFacet.sourceIndex) ?
            (KeeperFinder._draggingFacet.targetIndex - 1) :
            KeeperFinder._draggingFacet.targetIndex;
            
    var before = facetContainer.childNodes[insertIndex * 2];
    
    var dropTarget = document.createElement("box");
    dropTarget.style.width = KeeperFinder._draggingFacet.box.boxObject.width + "px";
    dropTarget.style.background = "#ccc";
    facetContainer.insertBefore(dropTarget, before);
    
    facetContainer.insertBefore(KeeperFinder.FacetUtilities.createFacetSplitter(), before);
}

KeeperFinder._removeDropTarget = function() {
    var facetContainer = KeeperFinder._getFacetContainer();
    var index = 
        (KeeperFinder._draggingFacet.targetIndex > KeeperFinder._draggingFacet.sourceIndex) ?
            (KeeperFinder._draggingFacet.targetIndex - 1) :
            KeeperFinder._draggingFacet.targetIndex;
            
    var dropTarget = facetContainer.childNodes[index * 2];
    facetContainer.removeChild(dropTarget.nextSibling);
    facetContainer.removeChild(dropTarget);
}

KeeperFinder._calculateFacetOffsets = function(box) {
    var widths = [];
    var facetContainer = KeeperFinder._getFacetContainer();
    
    for (var i = 0; i < facetContainer.childNodes.length - 1; i += 2) {
        var childNode = facetContainer.childNodes[i];
        widths.push(childNode.boxObject.width);
        if (childNode == box) {
            KeeperFinder._draggingFacet.sourceIndex = 
                KeeperFinder._draggingFacet.targetIndex = 
                    (i / 2);
        }
    }
    
    KeeperFinder._draggingFacet.widths = widths;
    KeeperFinder._draggingFacet.resizerWidth = 
        (facetContainer.childNodes.length > 1) ?
        facetContainer.childNodes[1].boxObject.width :
        0;
}

KeeperFinder._positionDraggedFacet = function(event) {
    var outerBox = KeeperFinder._draggingFacet.outerBox;
    var x = event.clientX - KeeperFinder._draggingFacet.mouseDownX;
    var y = event.clientY - KeeperFinder._draggingFacet.mouseDownY;
    
    outerBox.style.left = x + "px";
    outerBox.style.top = y + "px";
}

KeeperFinder._hittestFacet = function(event) {
    var facetContainer = KeeperFinder._getFacetContainer();
    var firstChild = facetContainer.firstChild;
    var scrollLeft = firstChild.boxObject.screenX - facetContainer.boxObject.screenX;
    var offset = ((event.clientX - KeeperFinder._draggingFacet.mouseDownX) - scrollLeft) - facetContainer.boxObject.x;
    
    var index = 0;
    while (index < KeeperFinder._facets.length) {
        var width = KeeperFinder._draggingFacet.widths[index] + KeeperFinder._draggingFacet.resizerWidth;
        if (index != KeeperFinder._draggingFacet.sourceIndex) {
            if (offset < width / 2) {
                break;
            }
            offset -= width;
        }
        index++;
    }
    return index;
}
