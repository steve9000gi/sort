// Drag and drop a file containing a list of text items onto the page, where
// they're displayed, one to a line, as a column on the left.
//
// Create and title boxes. Drag the boxes around as desired. Drag text items
// from the column on the left into various boxes.

"use strict";

var textDragged = null;
var textHeight = 16;
var padding = 16;
var titleEditGroup = null;


var dragText = d3.behavior.drag()
  // See http://jsfiddle.net/Y8y7V/1/ for avoiding object jump to cursor.
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


var dragBox = d3.behavior.drag()
  // See http://jsfiddle.net/Y8y7V/1/ for avoiding object jump to cursor.
  .origin(function(d, i) {
    var t = d3.select(this);
    return {x: t.attr("x") + d3.transform(t.attr("transform")).translate[0],
            y: t.attr("y") + d3.transform(t.attr("transform")).translate[1]};
  })
  .on("drag", function(d) {
    d3.select(this)
      .attr("transform", "translate(" + d3.event.x + "," + d3.event.y + ")");
  });


document.ondragover = function(event){
    event.preventDefault();
}


document.ondrop = function(e) {
    e.preventDefault();  // Prevent browser from trying to run/display the file
    d3.selectAll(".nodeText").remove();
    var reader = new FileReader();
    var text;
    reader.onload = function(e) {
      text = e.target.result;
      var length = text.length;
      var split = text.split("\n"); 
      var n = 0, i = 1;
      var isNextLineTitle = true;
      d3.select("svg").append("g")
        .attr("id", "textListG");

      d3.select("#textListG").selectAll(".nodeText")
        .data(split)
        .enter()
        .append("text")
          .classed("nodeText", true)
          .attr("x", "10")
          .attr("y", function(d) {
            return padding + textHeight * n++;
          })
          .attr("dx", 0)
          .attr("dy", 0)
          .style("fill", "#000000")
          .text(function(d) {
            if ((d.length > 0) && (!isNextLineTitle)) {
              return i++ + ". " + d;
            } else {
              isNextLineTitle = !isNextLineTitle;
              i = 1;
              return d;
            }
          })
          .on("mouseover", function(d) {
            //d3.select("body").style("cursor", "crosshair");
            d3.select(this)
              .style("fill", "#aa00aa");
          })
          .on("mouseleave", function(d) {
            d3.select(this)
              .style("fill", "#000000");
          });
      d3.select("svg")
        .attr("viewBox", function() {
          return "0, 0, " + window.innerWidth + ", " + (n * padding);
        })
        .attr("height", n * textHeight);

      
      d3.selectAll(".nodeText").call(dragText);
    };
    reader.readAsText(e.dataTransfer.files[0]);
}


var resizeBox = function(boxG) {
  var g = d3.select(boxG);
  var txts = g.selectAll(".boxText");
  var masterBbox;
  var width = 0;
  var height = 0;
  for (var i = 0; i < txts[0].length; i++) {
    var bbox = txts[0][i].getBBox();
    width = Math.max(bbox.width, width);
    height = bbox.y + bbox.height;
  }
  g.select("rect")
   .attr("width", width + 10)
   .attr("height", height +10);
};

var closeListRanks = function() {
  var listTexts = d3.selectAll(".nodeText");
  for (var i = 0; i < listTexts[0].length; i++) {
    d3.select(listTexts[0][i])
      .attr("x", "10")
      .attr("y", function(d) {
        return padding + textHeight * i;
      })
  }
};

    
var boxMouseup = function(d) {
  if (textDragged) {
    d3.select(this).append("text")
      .classed("boxText", true)
      .text(d3.select(textDragged)[0][0].innerHTML)
      .style("fill", "#000000")
      .attr("dx", 3)
      .attr("dy", function(d) {
        return (this.parentNode.childElementCount - 2) * textHeight; 
      });
    d3.select(textDragged).remove();
    textDragged = null; 

    resizeBox(this);
    closeListRanks();
  }
}; 


// Select all text in element: see http://stackoverflow.com/questions/6139107/
// programatically-select-text-in-a-contenteditable-html-element
var selectText = function(el) {
  var range = document.createRange();
  range.selectNodeContents(el);
  var sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
};



// Place editable text in place of svg text
var changeElementText = function(d3element, text) {
  titleEditGroup = d3.select(d3element).node().parentElement;
  var xform = d3.select(titleEditGroup).attr("transform");
  var x = d3.transform(xform).translate[0];
  var y = d3.transform(xform).translate[1];
  d3.select(d3element).remove();
  var d3txt = d3.select("svg").selectAll("foreignObject")
    .data([text])
    .enter().append("foreignObject")
      .attr("x", x)
      .attr("y", y - textHeight)
      .attr("height", 15)
      .attr("width", 100)
    .append("xhtml:p")
      .attr("id", "xxx")
      .attr("contentEditable", true)
      .text(text)
    .on("mousedown", function() {
      d3.event.stopPropagation();
    })
    .on("keydown", function() {
      d3.event.stopPropagation();
    })
    .on("blur", function(d) {
      text = this.parentElement.textContent.trim(); // Remove outer whitespace
      d3.select(titleEditGroup).append("text")
        .classed("boxTitle", true)
        .text(text);
      d3.select(this.parentElement).remove();
    });
  return d3txt;
};


var newBox = function(d) {
  var newBoxG = d3.select("svg").append("g")
    .classed("boxG", true)
    .attr("transform", "translate(" + (width / 2) + "," + (height / 4) + ")")
    .on("mouseover", function(d) {
      if (textDragged) {
        d3.select(textDragged).style("fill", "#00ff00");
      }
    })
    .on("mouseleave", function(d) {
      if (textDragged) {
        d3.select(textDragged).style("fill", "#00aaaa");
      }
    })
    .on("mouseup", boxMouseup);
   
  newBoxG.append("rect")
    .classed("box", true)
    .attr("x", 0)
    .attr("y",0) 
    .attr("width", 200)
    .attr("height", 50)
    .style("stroke", "#000055")
    .style("fill", "#eeeeff");

  newBoxG.append("text")
    .attr("contentEditable", true)
    .text("Title")
        .classed("boxTitle", true)
    .on("click", function(text) {
      var d3txt = changeElementText(this, "title");
      var txtNode = d3txt.node();
      selectText(txtNode);
      txtNode.focus();
    });
  d3.selectAll(".boxG").call(dragBox);
};


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
  window.saveAs(blob, "sortedItems.txt");
};


var docEl = document.documentElement,
bodyEl = document.getElementsByTagName("body")[0];

var width = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth,
height =  window.innerHeight|| docEl.clientHeight|| bodyEl.clientHeight;

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

topDiv.append("svg:svg")
  .attr("width", width)
  .attr("height", height)
  .attr({"xmlns": "http://www.w3.org/2000/svg",
        "xmlns:xmlns:xlink": "http://www.w3.org/1999/xlink", 
        version: "1.1"
       });
