// Drag and drop into the browser window a file containing a list of text items,
// which are displayed by node category, one to a line, in a column on the left.
//
// Create, title and retitle boxes. Drag the boxes around as desired. Drag text
// items from the list on the left into various boxes. Deleting text items from
// boxes reinserts them into the list. Save the box titles and contents as JSON.

"use strict";

var nextId = 0; // Global id accessed to ensure no duplicate ids in DOM.


// See http://jsfiddle.net/Y8y7V/1/ for avoiding object jump to cursor.
var dragText = d3.drag()
  .subject(function(d, i) {
    var t = d3.select(this);
    return {x: t.attr("x"), y: t.attr("y")};
  })
  .on("drag", function(d) {
    if(this.parentElement.firstElementChild.tagName == "text") {
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


// Magenta text when hovering over (or dragging when not over a box).
var textMouseover = function() {
  d3.select(this) .style("fill", "#aa00aa"); 
};


var textMouseleave = function() {
  d3.select(this).style("fill", "#000000");
};


// Create a JSON object, comprised of a sequence of key-value pairs, from the
// current items in the list: keys are node types (e.g., "ROLES", "NEEDS"), and
// values are arrays of text item objects that belong to each node type.
var buildJSONFromList = function() {
  var json = {};
  var dataIndex = 0; // For every text item including category titles
  var currKey = null;
  d3.selectAll(".nodeText").each(function(d) {
    if (d && d.text.length > 0) {
      if (!d.isCode) { // add (object) element to (array) value for current key
        if (currKey) {
          json[currKey]["textItems"].push(d);
        }
      } else { // new key
        currKey = d.text;
        json[currKey] = {};
        json[currKey]["textItems"] =  new Array();
        json[currKey]["id"] = this.id;
      }
    }
  });
  return json;
};


// Argument "strings" is expected to be an array of strings in which headers, 
// i.e. category titles or "codes," are preceded by blank lines (other than the
// first, which is the first string in the "strings" array. Those headers become
// keys, the associated value for each is a flat array of the following elements
// in parameter "strings" up until the next blank line. The string that
// immediately follows that blank line is expected to be the key for the next
// key/value pair.
var buildJSONFromStrings = function(strings) {
  var json = new Array();
  var isNextLineTitle = true;
  var dataIndex = 0; // For every text item including category titles
  var lineNum = 1;   // Running count of # of lines including category titles
  var currKey = null;

  strings.forEach(function(d) {
    if (d.length > 0) {
      if (!isNextLineTitle) {     // new value for current key
        if (currKey) {
          json[currKey].push(d);
        }
      } else { // new key
        currKey = d;
        json[currKey] = new Array();
        isNextLineTitle = !isNextLineTitle;
      }
      lineNum++;
    } else {
      isNextLineTitle = true;
    }
  });
  return json;
};


// Returns the number of elements created, i.e., the number of lines of text.
// Expects that each category title (i.e, "coder": header or SSM node type) is
// immediately preceded by a blank line (excepting the first, which is of course
// immediately preceded by nothing).
var createTextListElementsFromJSON = function(json) {
  var dataIndex = 0; // For every text item including category titles
  var lineNum = 1;   // Running count of # of lines including category titles
  var ix = 1;        // Numbers for text items in list excluding category titles
  var isNextLineTitle = true;
  var keys = Object.keys(json);
  var list = Array(); // objects representing text items to be inserted into DOM
  for (var i = 0; i < keys.length; i++) {
    // First push object representing code:
    list.push({ "id": json[keys[i]].id,
                "text": keys[i],
                "innerHTML": keys[i],
                "isCode": true
              });
    var nTextItems = json[keys[i]].textItems.length;
    // Then for each code push object for each associated text item:
    for (var j = 0; j < nTextItems; j++) {
      list.push(json[keys[i]].textItems[j]);
    }
    //list.push(null); // blank line precedes all codes but the first
  }
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
        return dataIndex++;
      })
      .attr("x", padding)
      .attr("y", function(d) {
        return textHeight * lineNum++;
      })
      .style("fill", "#000000")
      .text(function(d) {
        if (d && d.innerHTML) {
          return d.innerHTML;
        } else {
          return "";
        }
        /*
        if ((d.length > 0) && (!isNextLineTitle)) {
          return ix++ + ". " + d; // Number lines that aren't blank or titles
        } else {
          isNextLineTitle = !isNextLineTitle;
          return d;
        }
        */
      })
      .on("mouseover", textMouseover)
      .on("mouseleave", textMouseleave);
  return lineNum;
};


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


// Display the dropped-in text file as a list along the left side of the window.
// Each line is a text object of class ".nodeText".
document.ondrop = function(e) {
    e.preventDefault();  // Prevent browser from trying to run/display the file.
    if ((d3.selectAll(".nodeText").nodes().length > 0) ||
        (d3.selectAll(".boxG").nodes().length > 0)) {
      var retVal = confirm("You're already working on a list. Do you want to "
          + "close it and open this new list?");
      if (retVal == false) {
        return;
      }
    }
    var reader = new FileReader();
    var text;
    reader.onload = function(e) {
      text = e.target.result;
      var json = isJson(text);
      var jsonListObj = null;
      if (json) {
        console.log("dropped file is JSON.");
        jsonListObj = json.unsorted;
      } else {
        console.error("dropped file is not JSON.");
        var split = text.split("\n"); 
        var jsonListObj = buildJSONFromStrings(split);
      }
      d3.selectAll(".nodeText").remove();
      var n = createTextListElementsFromJSON(jsonListObj);
      d3.select("svg")
        .attr("viewBox", function() {
          return "0, 0, " + (window.innerWidth * 2) + ", " + (n * textHeight);
        })
        .attr("height", n * textHeight);
      d3.selectAll(".nodeText").call(dragText);
    };
    reader.readAsText(e.dataTransfer.files[0]);
}


// Adjust box size to hold its contents.
var resizeBox = function(boxG) {
  var g = d3.select(boxG);
  var txts = g.selectAll(".boxText");
  var nItems = txts.nodes() ? txts.nodes().length : 0;
  var width = nItems ? 0 : boxDefaultW;
  var height = nItems ? (textHeight * nItems) : boxDefaultH;
  for (var i = 0; i < nItems; i++) {
    var currentItem = txts.nodes()[i];
    d3.select(currentItem).attr("dy", (1 + i) * textHeight);
    var bbox = currentItem.getBBox();
    width = Math.max(bbox.width, width);
  }
  g.select("rect")
   .attr("width", width + padding)
   .attr("height", height + padding);
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
  var index = parseInt(elt.getAttribute("data-index"));
  var i = 0;
  while (textArray[i].getAttribute("data-index") < index) {
    i++;
  }
  return textArray[i].getAttribute("id");
};


// If the user is dragging a text element, drop a copy into the box and remove
// the original text element from the list.
var dropTextIntoBox = function(d) {
  if (textDragging) {
    // Don't use textDragging.innerHTML: it encodes '&' as "&amp;" etc.
    // Don't use textDragging.textContent: everything from '&' on disappears.
    var data = d3.select(textDragging).datum();
    var str = data.innerHTML.split(/ (.+)/)[1]; // first occurrence of " " only
    var num = textDragging.innerHTML.split(".")[0];
    d3.select(inBox).append("text")
      .classed("boxText", true)
      .attr("id", textDragging.getAttribute("id"))
      .text(str)
      .datum(data)
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
    resizeBox(inBox);
    cleanUpList();
    inBox = null;
  }
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
  var followingElementId = getFollowingListElementId(selectedBoxText);
  d3.select("#textListG").insert("text", "#" + followingElementId)
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
  resizeBox(box);
  cleanUpList();
};


var newBox = function(d) {
  var newBoxG = d3.select("svg").append("g")
    .classed("boxG", true)
    .attr("transform", "translate(" + (width / 4) + "," + (height / 4) + ")")
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
    .text("Title")
        .classed("boxTitle", true)
    .on("click", editBoxTitle);
  d3.selectAll(".boxG").call(dragBox);
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
// values.
var saveJSON = function() {
  var boxGroups = d3.selectAll(".boxG");
  var jsonBoxes = {};
  boxGroups.each(function(d, i) {
    var box = d3.select(this);
    var name = box.select(".boxTitle").nodes()[0].textContent;
    var vals = [];
    box.selectAll(".boxText").each(function(d, i) {
      vals.push(this.textContent);
    });
    jsonBoxes[name] = vals;
  });
  var topJson = {};
  topJson["sorted"] = jsonBoxes;
  topJson["unsorted"] = buildJSONFromList();
  var blob = new Blob([window.JSON.stringify(topJson)],
                      {type: "text/plain;charset=utf-8"});
  window.saveAs(blob, "coded.json");
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
