// sort.js:
// Drag and drop into the browser window a file containing a list of text items,
// which are displayed by ring title, one to a line, in a column on the left.
//
// Create, title and retitle boxes. Drag the boxes around as desired. Drag text
// items from the list on the left into various boxes. Deleting text items from
// boxes reinserts them into the list. Save the box titles and contents as JSON
// and as text..
//
// JSON output files may be reloaded by drag and drop to continue work on a 
// previously partally sorted file.

"use strict";

var jsonListObj = null;
var jsonBoxesObj = null;
    

// See http://jsfiddle.net/Y8y7V/1/ for avoiding object jump to cursor.
var dragText = d3.drag()
  .subject(function(d, i) {
    var t = d3.select(this);
    return {x: t.attr("x"), y: t.attr("y")};
  })
  .on("drag", function(d) {
    if((!d.isRingTitle) && // false for ring titles
       (this.parentElement.firstElementChild.tagName == "text")) {
      textDragging = this;
      d3.select("body").style("cursor", "move");
      d3.select(this)
        .attr("x", d3.event.x)
        .attr("y", d3.event.y);
    }
  })
  .on("end", function(d) {
    if (inBox) {
      dropTextIntoBox(d);
    } else {
      cleanUpList();
    }
    d3.select("body").style("cursor", "default");
  });


// http://stackoverflow.com/questions/38224875/replacing-d3-transform-in-d3-v4
function getTransformation(transform) {
  // Create a dummy g for calculation purposes only. This will never
  // be appended to the DOM and will be discarded once this function 
  // returns.
  var g = document.createElementNS("http://www.w3.org/2000/svg", "g");

  // Set the transform attribute to the provided string value.
  g.setAttributeNS(null, "transform", transform);

  // consolidate the SVGTransformList containing all transformations
  // to a single SVGTransform of type SVG_TRANSFORM_MATRIX and get
  // its SVGMatrix. 
  var matrix = g.transform.baseVal.consolidate().matrix;

  // Following calculations are taken and adapted from the private function
  // transform/decompose.js of D3's module d3-interpolate.
  var {a, b, c, d, e, f} = matrix; // ES6, if this doesn't work, use as follows:
  // var a=matrix.a, b=matrix.b, c=matrix.c, d=matrix.d, e=matrix.e, f=matrix.f;
  // ES5
  var scaleX, scaleY, skewX;
  if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
  if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
  if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
  if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
  return {
    translateX: e,
    translateY: f,
    rotate: Math.atan2(b, a) * Math.PI/180,
    skewX: Math.atan(skewX) * Math.PI/180,
    scaleX: scaleX,
    scaleY: scaleY
  };
}


// https://stackoverflow.com/questions/38224875/replacing-d3-transform-in-d3-v4
function getTranslation(transform) {
  // Create a dummy g for calculation purposes only. This will never
  // be appended to the DOM and will be discarded once this function
  // returns.
  var g = document.createElementNS("http://www.w3.org/2000/svg", "g");

  // Set the transform attribute to the provided string value.
  g.setAttributeNS(null, "transform", transform);

  // consolidate the SVGTransformList containing all transformations
  // to a single SVGTransform of type SVG_TRANSFORM_MATRIX and get
  // its SVGMatrix. 
  var matrix = g.transform.baseVal.consolidate().matrix;
 
  // As per definition values e and f are the ones for the translation.
  return [matrix.e, matrix.f];
};


// See http://jsfiddle.net/Y8y7V/1/ for avoiding object jump to cursor.
var dragBox = d3.drag()
  .subject(function(d, i) {
    var t = d3.select(this);
    var xform = getTransformation(t.attr("transform"));
    return {x: t.attr("x") + xform.translateX,
            y: t.attr("y") + xform.translateY};
  })
  .on("drag", function(d) {
    d3.select(this)
      .attr("transform", "translate(" + d3.event.x + "," + d3.event.y + ")");
  });


document.ondragover = function(event) {
    event.preventDefault();
}


// Magenta text when hovering over non-ring-title text items (or dragging when
// not over a box).
var textMouseover = function(d) {
  if (!d.isRingTitle) {
    d3.select(this) .style("fill", "#aa00aa"); 
  }
};


var textMouseleave = function() {
  d3.select(this).style("fill", "#000000");
};


// Create a JSON object, comprised of a sequence of key-value pairs, from the
// current items in the list: keys are node types (e.g., "ROLES", "NEEDS"), and
// values are arrays of text item objects that belong to each node type.
var buildJSONFromList = function() {
  var json = {};
  var currKey = null;
  d3.selectAll(".nodeText").each(function(d) {
    var dataIndex = this.getAttribute("data-index");
    if (d && d.text && d.text.length > 0) {
      if (d.isRingTitle) { // then we have a new key
        currKey = d.text;
        json[currKey] = {};
        json[currKey]["textItems"] =  new Array();
        json[currKey]["id"] = this.id;
        if (dataIndex) {
          json[currKey]["dataIndex"] = dataIndex;
        }
      } else { // add (object) element to (array) value for current key
        if (currKey) {
          if (!d.displayedText) {
            d.displayedText = this.innerHTML;
          }
          if (!d.id) {
            d.id = this.id;
          }
          if (!d.dataIndex && dataIndex) {
            d.dataIndex = dataIndex;
          }
          json[currKey]["textItems"].push(d);
        }
      }
    }
  });
  return json;
};


// Create a JSON object, comprised of an array of key-value pairs, from the
// current boxes. Each element of this top-level array is an object with three
// component elements, each a key-value pair:
// 1) "title": <string>,
// 2) "xform": <string>, and
// 3) "textItems": <array>.
//
// Each element of the "textItems" array is an object comprised of these key-
// value pairs:
// 1) "id": <string>,
// 2) "displayedText": <string>,
// 3) "text": <string>, and
// 4) "dataIndex": <string>.
var buildJSONFromBoxes = function() {
  var json = Array();
  d3.selectAll(".boxG").each(function(d) {
    var box = d3.select(this);
    var boxTitle = box.select(".boxTitle").nodes()[0].textContent;
    var boxObj = {};
    boxObj["title"] = boxTitle;
    var xform = box.nodes()[0].getAttribute("transform");
    boxObj["xform"] = xform;
    boxObj["textItems"] =  new Array();
    box.selectAll(".boxText").each(function(d) {
      var textItem = {};
      textItem["text"] = d.text;
      textItem["id"] = this.id;
      textItem["displayedText"] = d.displayedText;
      textItem["dataIndex"] = this.getAttribute("data-index")
      boxObj["textItems"].push(textItem);
    });
    json.push(boxObj);
  });
  return json;
};


// Argument "strings" is expected to be an array of strings in which headers, 
// i.e. ring titles, are preceded by blank lines (other than the
// first, which is the first string in the "strings" array.) Those headers become
// keys, the associated value for each is a flat array of the following elements
// in parameter "strings" up until the next blank line. The string that
// immediately follows that blank line is expected to be the key for the next
// key/value pair.
var buildJSONFromStrings = function(strings) {
  var json = {};
  var isNextLineTitle = true;
  var currKey = null;
  strings.forEach(function(d) {
    if (d.length > 0) {
      if (!isNextLineTitle) {     // new value for current key
        if (currKey) {
          var currObj = {"text" : d};
          json[currKey]["textItems"].push(currObj);
        }
      } else { // new key
        currKey = d;
        json[currKey] = {};
        json[currKey]["textItems"] =  new Array();
        isNextLineTitle = !isNextLineTitle;
      }
    } else {
      isNextLineTitle = true;
    }
  });
  return json;
};


var buildListArray = function(json) {
  var list = Array(); // objects representing text items to be inserted into DOM
  var keys = Object.keys(json);
  var ix = 1;         // numbers for text items in list excluding ring titles
  for (var i = 0; i < keys.length; i++) {
    // First push object representing ring title:
    list.push({ "id": json[keys[i]].id,
                "dataIndex": json[keys[i]].dataIndex,
                "text": keys[i],
                "displayedText": keys[i],
                "isRingTitle": true
              });
    var nTextItems = json[keys[i]].textItems.length;
    // Then for each ring title push object for each associated text item:
    for (var j = 0; j < nTextItems; j++) {
      if (!json[keys[i]].textItems[j].displayedText) {
        json[keys[i]].textItems[j].displayedText = ix++ + ". "
          + json[keys[i]].textItems[j].text;
      }
      list.push(json[keys[i]].textItems[j]);
    }
    //list.push(null); // blank line precedes all ring titles but the first
  }
  return list;
};


// Returns the number of elements created, i.e., the number of lines of text.
var createTextListElementsFromJSON = function(json) {
  var dataIndex = 0; // For every text item including ring titles
  var lineNum = 1;   // Running count of # of lines including ring titles
  var ix = 1;        // Numbers for text items in list excluding ring titles
  var list = buildListArray(json);
  d3.select("svg").append("g")
    .attr("id", "textListG");
  d3.select("#textListG").selectAll(".nodeText")
    .data(list)
    .enter()
    .append("text")
      .classed("nodeText", true)
      .attr("id", function(d) {
        if (d && d.id) {
          return d.id;
        } else {
          return "id" + nextId++;
        }
      })
      .attr("data-index", function(d) { // List re-insertion text item location
        if (d.dataIndex) {
          return d.dataIndex;
        } else {
          return dataIndex++;
        }
      })
      .attr("x", padding)
      .attr("y", function(d) {
        return textHeight * lineNum++;
      })
      .style("fill", "#000000")
      .text(function(d) {
        if (d && d.displayedText) {
          return d.displayedText;
        } else {
          return ix++ + ". " + d.text; // Number lines that aren't titles
        }
      })
      .on("mouseover", textMouseover)
      .on("mouseleave", textMouseleave);
  return lineNum;
};


var createBoxesFromJSON = function(boxObjs) {
  var nBoxObjs = boxObjs ? boxObjs.length : 0; 
  var maxBoxY = 0; // 2do: make this some reasonable min, even when [near] empty
  var thisMaxBoxY = 0;
  for (var i = 0; i < nBoxObjs; i++) {
    var boxG = newBox({"title": boxObjs[i].title, "xform": boxObjs[i].xform});
    var nTextItems = boxObjs[i].textItems.length;  
    for (var j = 0; j < nTextItems; j++) {
      thisMaxBoxY = addTextToBox(boxG, boxObjs[i].textItems[j]);
      if (thisMaxBoxY > maxBoxY) {
        maxBoxY = thisMaxBoxY;
      }
    }
  }
  return maxBoxY;
}


// Assumes that the value in each key/value pair is a flat array. Results from
// attempting to concatenate two json objects with different keys are 
// unpredictable.
var catJSONs = function(oldJsonListObj, newJsonListObj) {
  var catJsonListObj = Array();
  var newKeys = Object.keys(newJsonListObj);
  for (var i = 0; i < newKeys.length; i++) {
    var key = newKeys[i];
    catJsonListObj[key] = Array();
    var numOldKeys = oldJsonListObj[key] ? oldJsonListObj[key].length : 0;
    for (var j = 0; j < numOldKeys; j++) {
      catJsonListObj[key].push(oldJsonListObj[key][j]);
    }
    var numNewKeys = newJsonListObj[key] ? newJsonListObj[key].length : 0;
    for (var k = 0; k < numNewKeys; k++) {
      catJsonListObj[key].push(newJsonListObj[key][k]);
    }
  }
  return catJsonListObj;
};


// https://stackoverflow.com/questions/9804777/how-to-test-if-a-string-is-json-or-not
function isJson(str) {
    try {
        var json = JSON.parse(str);
    } catch (e) {
        return false;
    }
    return json;
}


var addNewFileToExisting = function() {
  console.log("addNewFileToExisting; jsonListObj = " + jsonListObj);
}


var loadSingleFile = function() {
  console.log("loadSingleFile; jsonListObj = " + jsonListObj);
  d3.select("svg").selectAll("*").remove();
  createTextListElementsFromJSON(jsonListObj);
  createBoxesFromJSON(jsonBoxesObj);
  resizeViewBox();
  d3.selectAll(".nodeText").call(dragText);
};


var showDropInDialog = function(e) {
  $("<div id='multi-drop'>Select from the following options:</div>")
    .appendTo("#topDiv").dialog({
      title: "You're already working on a list.",
      resizable: false,
      height: "auto",
      modal: true,
      dialogClass: "no-close",
      buttons: {
        "Close it and open this new list instead": function() {
          $(this).dialog("close");
          loadSingleFile();
        },
        "Add the new list to the one you're working on": function() {
          $(this).dialog("close");
          addNewFileToExisting();
        },
        Cancel: function() {
          console.log("Cancel loading new file");
          $(this).dialog("close");
        }
      },
      close: function (event, ui) {
        $(this).dialog("destroy").remove();
      }
  });
};


// Display the dropped-in text file as a list along the left side of the window.
// Each line is a text object of class ".nodeText".
document.ondrop = function(e) {
    e.preventDefault();  // Prevent browser from trying to run/display the file.
    var reader = new FileReader();
    reader.onload = function(e) {
      var text = e.target.result;
      var json = isJson(text);
      if (json) {
        console.log("dropped file is JSON.");
        jsonListObj = json.unsorted;
        jsonBoxesObj = json.sorted;
      } else {
        console.log("dropped file is not JSON.");
        var split = text.split("\n"); 
        jsonListObj = buildJSONFromStrings(split);
      }
      if ((d3.selectAll(".nodeText").nodes().length > 0) ||
	  (d3.selectAll(".boxG").nodes().length > 0)) {
	showDropInDialog(e);
      } else { // Virgin territory
	loadSingleFile();
      }
    };
    reader.readAsText(e.dataTransfer.files[0]);
}


var setViewBoxHeight = function(height) {
  var svg = d3.select("svg");
// if (parseInt(svg.attr("height")) >= height) return; // Never shorten viewBox?
  svg.attr("viewBox", function() {
       return "0, 0, " + (window.innerWidth * 2) + ", " + height;
     })
     .attr("height", height);
};


// Make sure SVG viewbox is tall enough to permit access to full text list and
// all boxes.
var resizeViewBox = function() {
  var heightPad = 80;
  var listHeight  = d3.selectAll(".nodeText").size() * textHeight + 1;
  var boxGs = d3.selectAll(".boxG");
  var maxBoxY = 0;
  boxGs.each(function(d) {
    var t = d3.select(this);
    var xform = getTransformation(t.attr("transform"));
    var boxHeight =
      parseInt(d3.select(this).select(".box").nodes()[0].getAttribute("height"));
    var thisBoxMaxY = xform.translateY + boxHeight;
    if (thisBoxMaxY > maxBoxY) {
      maxBoxY = thisBoxMaxY;
    }
  })
  setViewBoxHeight(Math.max(maxBoxY, listHeight + heightPad));
};



// Adjust box size to hold its contents. Returns max y-value for this box from
// the top of the window.
var resizeBox = function(boxG) {
  var txts = boxG.selectAll(".boxText");
  var nItems = txts.nodes() ? txts.nodes().length : 0;
  var width = nItems ? 0 : boxDefaultW;
  var height = nItems ? (textHeight * nItems) : boxDefaultH;
  for (var i = 0; i < nItems; i++) {
    var currentItem = txts.nodes()[i];
    d3.select(currentItem).attr("dy", (1 + i) * textHeight);
    var bbox = currentItem.getBBox();
    width = Math.max(bbox.width, width);
  }
  var boxHeight = height + padding;
  boxG.select("rect")
    .attr("width", width + padding)
    .attr("height", boxHeight);
  var transform = getTranslation(boxG.nodes()[0].getAttribute("transform"));
  var y = transform[1];
  return y + boxHeight;
};


// Put all text items not in boxes in DOM order along the left side of the
// window and remove unwanted blank lines.
var cleanUpList = function() {
  var listTexts = d3.selectAll(".nodeText");
  for (var i = 0; i < listTexts.nodes().length; i++) {
    d3.select(listTexts.nodes()[i])
      .attr("x", padding)
      .attr("y", function(d) {
        return textHeight * (i + 1);
      })
  }
};

    
// Return the id of the text element that should be next after arg "elt".
var getFollowingListElementId = function(elt) {
  var textArray = d3.select("#textListG").nodes()[0].childNodes;
  var arrayLength = textArray.length;
  var index = parseInt(elt.getAttribute("data-index"));
  var i = 0;
  while ((i < arrayLength)
      && parseInt(textArray[i].getAttribute("data-index")) < index) {
    i++;
  }
  return (i == arrayLength) ? null : textArray[i].getAttribute("id");
};


// If the user is dragging a text element, drop a copy into the box and remove
// the original text element from the list.
//
// Returns max y-value for this box from
// the top of the window.

var dropTextIntoBox = function(d) {
  if (textDragging) {
    var num = d.displayedText.split(".")[0];
    d3.select(inBox).append("text")
      .classed("boxText", true)
      .attr("id", textDragging.getAttribute("id"))
      .text(d.text)
      .datum(d)
      .style("fill", "#000000")
      .attr("data-index", textDragging.getAttribute("data-index"))
      .attr("data-itemNum", num) // Restore number for de-box/re-list
      .attr("dx", 3)
      .attr("dy", function(d) {
        return (this.parentNode.childElementCount - 2) * textHeight; 
      });
    d3.selectAll(".boxText").call(dragText);
    d3.select(textDragging).remove();
    textDragging = null; 
    resizeBox(d3.select(inBox));
    cleanUpList();
    inBox = null;
  }
}; 


// Add text to box when opening a file with sorted items in it. Returns max y
// value in window for this box.
var addTextToBox = function(box, d) {
  var num = d.displayedText.split(".")[0];
  box.append("text")
    .classed("boxText", true)
    .attr("id", d.id)
    .text(d.text)
    .datum(d)
    .style("fill", "#000000")
    .attr("data-index", d.dataIndex)
    .attr("data-itemNum", num) // Restore number for de-box/re-list
    .attr("dx", 3)
    .attr("dy", function(d) {
      return (this.parentNode.childElementCount - 2) * textHeight;
    });
  d3.selectAll(".boxText").call(dragText);
  return resizeBox(box);
};


// Select all text in element: see http://stackoverflow.com/questions/6139107/
// programatically-select-text-in-a-contenteditable-html-element
var selectText = function(elt) {
  var range = document.createRange();
  range.selectNodeContents(elt);
  var selection = window.getSelection();
  if (selection != null) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
};


// Expects "this" to be an SVG text element.
var editBoxTitle = function() {
  var d3txt = changeElementText(this);
  if (d3txt == null) {
    return;
  }
  var txtNode = d3txt.node();
  selectText(txtNode);
  txtNode.focus();
};


// Place editable text in place of svg text.
var changeElementText = function(textElement) {
  var titleEditGroup = d3.select(textElement).node().parentElement;
  var xform = getTransformation(d3.select(titleEditGroup).attr("transform"));
  var txt = textElement.textContent;
  d3.select(textElement).remove();
  var d3txt = d3.select("svg").append("foreignObject")
      .classed("fo", true)
      .attr("x", xform.translateX)
      .attr("y", xform.translateY - textHeight)
      .attr("height", textHeight)
      .attr("width", 100)
    .append("xhtml:p")
      .attr("contentEditable", true)
      .attr("id", "fop")
      .text(txt)
    .on("mousedown", function() {
      d3.event.stopPropagation();
    })
    .on("keydown", function() {
      d3.event.stopPropagation();
    })
    .on("blur", function(d) {
      d3.select(titleEditGroup).append("text")
        .classed("boxTitle", true)
        .text(this.textContent.trim()) // Remove outer whitespace
        .on("click", editBoxTitle);
      d3.selectAll("foreignObject").remove();
    });
  return d3txt;
};


// Return the SVG text element the user has selected.
var getSelectedBoxText = function(box) {
  var i = Math.floor(d3.mouse(box)[1] / textHeight);
  var boxTexts = d3.select(box).selectAll(".boxText");
  return boxTexts.nodes()[i];
};


// Take a text item out of a box and put it back in the list.
var removeTextItemFromBox = function(box) {
  var selectedBoxText = getSelectedBoxText(box);
  if (!selectedBoxText) return;
  var followingEltId = getFollowingListElementId(selectedBoxText);
  var restoredText = followingEltId
    ? d3.select("#textListG").insert("text", "#" + followingEltId) 
    : d3.select("#textListG").append("text");
  restoredText
    .classed("nodeText", true)
    .attr("id", selectedBoxText.getAttribute("id"))
    .attr("data-index", selectedBoxText.getAttribute("data-index"))
    .datum(d3.select(selectedBoxText).datum())
    .style("fill", "#000000")
    .text(function(d) {
      var num = selectedBoxText.getAttribute("data-itemNum");
      return num + ". " + selectedBoxText.textContent; 
    })
    .on("mouseover", textMouseover)
    .on("mouseleave", textMouseleave);
  d3.selectAll(".nodeText").call(dragText);
  d3.select(selectedBoxText).remove();
  resizeBox(d3.select(box));
  cleanUpList();
  resizeViewBox();
};


var newBox = function(d) {
  var xform = null;
  var title = "Title";
  if (d) {
    if (d.title && (d.title.length > 0)) {
      title = d.title;
    }
    if (d.xform) {
      xform = d.xform;
    }
  } else {
    if (boxXlateX) {
      boxXlateX += 4;
      boxXlateY += 4;
    } else {
      boxXlateX += (width / 8);
      boxXlateY += (height / 12);
    }
    xform = "translate(" + boxXlateX + "," + boxXlateY + ")";
  } 
  var newBoxG = d3.select("svg").append("g")
    .classed("boxG", true)
    .attr("transform", xform)
    .on("mouseover", function(d) {
      if (textDragging) {
        inBox = this;
        d3.select(textDragging).style("fill", "#00ff00"); // Green -> droppable
      }
    })
    .on("mouseout", function(d) {
      inBox = null;
    })
    .on("click", function(d) {
      if (d3.event.shiftKey && !textDragging) {
        removeTextItemFromBox(this);
      } 
    });
  newBoxG.append("rect")
    .classed("box", true)
    .attr("x", 0)
    .attr("y",0) 
    .attr("width", boxDefaultW)
    .attr("height", boxDefaultH)
    .style("stroke", "#000055")
    .style("fill", "#eeeeff");
  newBoxG.append("text")
    .attr("contentEditable", true)
    .text(title)
        .classed("boxTitle", true)
    .on("click", editBoxTitle);
  d3.selectAll(".boxG").call(dragBox);
  return newBoxG;
};


// Print the title and then the contents of each box to a text file, in DOM
// order.
var saveText = function() {
  var text = "";
  var boxGroups = d3.selectAll(".boxG");
  boxGroups.each(function(d, i) {
    var box = d3.select(this);
    text += box.select(".boxTitle").nodes()[0].textContent + ":\n";;
    box.selectAll(".boxText").each(function(d, i) {
      text += this.textContent + "\n";;
    }); 
    text += "\n";
  });
  var blob = new Blob([text], {type: "text/plain;charset=utf-8"});
  window.saveAs(blob, "SortedItems.txt");
};


// Output a JSON file where the box titles are names, and the contents of each
// box appear as an array of string values.
var saveJSON = function() {
  var topJson = {};
  topJson["sorted"] = buildJSONFromBoxes();
  topJson["unsorted"] = buildJSONFromList();
  var blob = new Blob([window.JSON.stringify(topJson)],
                      {type: "text/plain;charset=utf-8"});
  window.saveAs(blob, "sortedItems.json");
};


// Main:
var textDragging = null;
var inBox = null;
var textHeight = 16;
var padding = 10;
var boxDefaultW = 200;
var boxDefaultH = 50;
var docElt = document.documentElement;
var bodyElt = document.getElementsByTagName("body")[0];
var width = window.innerWidth * 2 || docElt.clientWidth * 2
    || bodyElt.clientWidth * 2; // Double width means more room for boxes.
var height =  window.innerHeight|| docElt.clientHeight|| bodyElt.clientHeight;
var nextId = 0; // Global id accessed to ensure no duplicate ids in DOM.
var boxXlateX = null;
var boxXlateY = null;

var topDiv = d3.select("#topDiv")
  .attr("width", width)
  .attr("height", height);

d3.select("#topDiv").append("div")
  .attr("id", "headerDiv")

d3.select("#topDiv").append("span")
  .classed("heading", true)
  .style("text-decoration", "underline")
  .style("color", "#cc8800")
  .style("margin-left", "10px")
  .attr("x", "10")
  .attr("y", "10")
  .attr("dx", 10)
  .attr("dy", -10)
  .text("Items to sort:")

d3.select("#headerDiv").append("button")
  .attr("id", "newBoxBtn")
  .text("New Box")
  .on("click", newBox);

d3.select("#headerDiv").append("button")
  .text("Save JSON")
  .on("click", saveJSON);

d3.select("#headerDiv").append("button")
  .text("Save Text")
  .on("click", saveText);

d3.select("#headerDiv").append("button")
  .attr("id", "helpBtn")
  .text("Help")
  .on("click", function() {
    window.open("instructions.html","_blank");
  });

topDiv.append("svg:svg")
  .attr("width", width)
  .attr("height", height)
  .attr({"xmlns": "http://www.w3.org/2000/svg",
        "xmlns:xmlns:xlink": "http://www.w3.org/1999/xlink", 
        version: "1.1"
       });

window.onbeforeunload = function() {
  return "Make sure to save before leaving.";
};
