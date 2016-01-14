Instructions for using the Sort web page

I. Generating Input for Sort

1. Build a set of ssm .json files with syssci.renci.org/ssm (https://github.com/steve9000gi/ssm)
and put them all into a directory on your local machine.

2. From the bash shell command line run R script blm.R (https://github.com/steve9000gi/binary-link-matrix)
with two arguments: the first argument is the path, relative or absolute, to a directory full of
ssm .json files; the second argument is the path to an output directory. The output of blm.R is a
set of .csv files each of which contains the binary link matrix for one of the ssm .json input
files, and which is has the same name as its corresponding input file, with the original extension
replaced by "-BLM.csv". Also generated is  a single file for the whole ssm input directory, called
NodeClasses.csv by default (rename it as you like), that organizes all the node names from all the
ssm input files into lists, by node type. So the names for all the Role nodes will be listed under
the heading ROLES, the names for all the Responsibility nodes will be listed under the heading
RESPONSIBILITIES, etc. Other than that, the ordering of node names is arbitrary.</p>

II. Sort

Open syssci.renci.org/sort in Chrome or Firefox. Drag and drop the NodeClasses.csv file generated
in step 2 above into the sort window. A numbered list of node names, organized by category, will
appear on the left-hand side of the browser window.

Create as many boxes as you need by repeatedly clicking on the "New Box" button.

To set the title of a box, click on "Title" at the top left of the box, type in the title
desired, and hit the <Escape> key or click elsewhere in the window to keep the title. Do this to
change the title at any time.

Drag items from the left-hand column of items into the box where you want them. When you hover
over or drag a text item it turns magenta. When it's droppable into a box the text turns bright
green. Release the mouse button at that time and in it goes.

If more space in the window is needed for boxes, shift-drag to scroll the window to the right.

Shift-click on a text item inside a box to remove it from that box and restore it to its former
location in the list on the left.

Save your work by clicking on the "Save Boxes" button, which brings up a standard file save
dialog. The text output file that results is named SortedItems.txt by default, but call it what
you wish.

These instructions can be displayed by clicking on the "Help" button.
