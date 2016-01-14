// Drag and drop a file containing a list of text items onto the page, where
// they're displayed under their corresponding categories, one to a line, as
// a column on the left.
//
// Create and title boxes. Drag the boxes around as desired. Drag text items
// from the column on the left into various boxes. Save the box titles and
// contents as titled lists to a text file.

"use strict";


// See http://jsfiddle.net/Y8y7V/1/ for avoiding object jump to cursor.
var dragText = d3.behavior.drag()
  .origin(function(d, i) {
    var t = d3.select(this);
    return {x: t.attr("x"), y: t.attr("y")};
  })
  .on("drag", function(d) {
    textDragged = this;
    d3.select("body").style("cursor", "move");
    d3.select(this)
      .attr("x", d3.event.x)
      .attr("y", d3.event.y);
  })
  .on("dragend", function(d) {
    d3.select("body").style("cursor", "default");
  });


// Return the SVG text element the user has selected.
var getSelectedBoxText = function(box) {
  var i = Math.floor(d3.mouse(box)[1] / textHeight);
  var boxTexts = d3.select(box).selectAll(".boxText");
  return boxTexts[0][i];
};


// See http://jsfiddle.net/Y8y7V/1/ for avoiding object jump to cursor.
var dragBox = d3.behavior.drag()
  .origin(function(d, i) {
    var t = d3.select(this);
    return {x: t.attr("x") + d3.transform(t.attr("transform")).translate[0],
            y: t.attr("y") + d3.transform(t.attr("transform")).translate[1]};
  })
  .on("drag", function(d) {
    d3.select(this)
      .attr("transform", "translate(" + d3.event.x + "," + d3.event.y + ")");
  });


document.ondragover = function(event) {
    event.preventDefault();
}


// Magenta text -> hovering or dragging but not over a box
var textMouseover = function() {
  d3.select(this) .style("fill", "#aa00aa"); 
};


var textMouseleave = function() {
       d3.select(this).style("fill", "#000000");
};


// Returns the number of elements created, i.e., the number of lines of text.
var createTextListElements = function(strings) {
  var id = 0;        // .nodeText id attribute (includes category titles)
  var dataIndex = 0; // For every text item including category titles
  var lineNum = 1;   // Running count of # of lines including category titles
  var i = 1;         // Numbers for text items in list excluding category titles
  var isNextLineTitle = true;
  d3.select("svg").append("g")
    .attr("id", "textListG");
  d3.select("#textListG").selectAll(".nodeText")
    .data(strings)
    .enter()
    .append("text")
      .classed("nodeText", true)
      .attr("id", function(d) {
	return "id" + id++;
      })
      .attr("data-index", function(d) { // For computing where to re-insert text item into list.
	return dataIndex++;
      })
      .attr("x", padding)
      .attr("y", function(d) {
	return textHeight * lineNum++;
      })
      .style("fill", "#000000")
      .text(function(d) {
	if ((d.length > 0) && (!isNextLineTitle)) {
	  return i++ + ". " + d;
	} else {
	  isNextLineTitle = !isNextLineTitle;
	  return d;
	}
      })
      .on("mouseover", textMouseover)
      .on("mouseleave", textMouseleave);
  return lineNum;
};


// Display a dropped-in text file as a list along the left side of the window.
// Each line is a text object of class ".nodeText".
document.ondrop = function(e) {
    e.preventDefault();  // Prevent browser from trying to run/display the file
    d3.selectAll(".nodeText").remove();
    var reader = new FileReader();
    var text;
    reader.onload = function(e) {
      text = e.target.result;
      var length = text.length;
      var split = text.split("\n"); 
      var n = createTextListElements(split);
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
  var nItems = txts[0].length;
  var width = nItems ? 0 : boxDefaultW;
  var height = nItems ? (textHeight * nItems) : boxDefaultH;
  for (var i = 0; i < nItems; i++) {
    var currentItem = txts[0][i];
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
  for (var i = 0; i < listTexts[0].length; i++) {
    d3.select(listTexts[0][i])
      .attr("x", padding)
      .attr("y", function(d) {
        return textHeight * (i + 1);
      })
  }
};

    
// Return the id of the text element that should be next after arg "elt".
var getFollowingListElementId = function(elt) {
  var textArray = d3.select("#textListG")[0][0].childNodes;
  var index = parseInt(elt.getAttribute("data-index"));
  var i = 0;
  while (textArray[i].getAttribute("data-index") < index) {
    i++;
  }
  return textArray[i].getAttribute("id");
};


// If the user is dragging a text element, drop a copy into the box and remove
// the original text element from the list.
var boxMouseup = function(d) {
  if (textDragged) {
    var textObject = d3.select(textDragged);
    d3.select(this).append("text")
      .classed("boxText", true)
      .attr("id", textDragged.getAttribute("id"))
      .text(textObject[0][0].innerHTML)
      .style("fill", "#000000")
      .attr("data-index", textDragged.getAttribute("data-index"))
      .attr("dx", 3)
      .attr("dy", function(d) {
        return (this.parentNode.childElementCount - 2) * textHeight; 
      });
    d3.selectAll(".boxText").call(dragText);
    textObject.remove();
    textDragged = null; 
    resizeBox(this);
    cleanUpList();
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
  var xform = d3.select(titleEditGroup).attr("transform");
  var x = d3.transform(xform).translate[0];
  var y = d3.transform(xform).translate[1];
  var txt = textElement.textContent;
  d3.select(textElement).remove();
  var d3txt = d3.select("svg").append("foreignObject")
      .attr("id", "fo")
      .attr("x", x - padding)
      .attr("y", y - (2 * textHeight))
      .attr("height", textHeight)
      .attr("width", 100)
    .append("xhtml:body").append("xhtml:p")
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
      //d3.select(this.parentElement).remove();
      d3.selectAll("foreignObject").remove();
    });
  return d3txt;
};


var removeTextItemFromBox = function() {
  if (d3.event.shiftKey && !textDragged) {
    var selectedBoxText = getSelectedBoxText(this);
    if (!selectedBoxText) return;
    var followingElementId = getFollowingListElementId(selectedBoxText);
    d3.select("#textListG").insert("text", "#" + followingElementId)
	.classed("nodeText", true)
	.attr("id", selectedBoxText.getAttribute("id"))
	.attr("data-index", selectedBoxText.getAttribute("data-index"))
	.style("fill", "#000000")
	.text(selectedBoxText.textContent)
	.on("mouseover", textMouseover)
	.on("mouseleave", textMouseleave);
    d3.selectAll(".nodeText").call(dragText);
    d3.select(selectedBoxText).remove();
    resizeBox(this);
    cleanUpList();
  }
};


var newBox = function(d) {
  var newBoxG = d3.select("svg").append("g")
    .classed("boxG", true)
    .attr("transform", "translate(" + (width / 4) + "," + (height / 4) + ")")
    .on("mouseover", function(d) {
      if (textDragged) {
        d3.select(textDragged).style("fill", "#00ff00"); // Green -> droppable
      }
    })
    .on("mouseup", boxMouseup)
    .on("click", removeTextItemFromBox);
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


// Print the title, then the content, of each box to a text file, in DOM order.
var saveBoxes = function() {
  var text = "";
  var boxGroups = d3.selectAll(".boxG");
  boxGroups.each(function(d, i) {
    var box = d3.select(this);
    text += box.select(".boxTitle")[0][0].textContent + ":\n";;
    box.selectAll(".boxText").each(function(d, i) {
      text += this.textContent + "\n";;
    }); 
    text += "\n";
  });
  var blob = new Blob([text], {type: "text/plain;charset=utf-8"});
  window.saveAs(blob, "SortedItems.txt");
};


// Main:

var textDragged = null;
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
  .attr("id", "saveBtn")
  .text("Save Boxes")
  .on("click", saveBoxes);

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
