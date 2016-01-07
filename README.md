syssci.renci.org/sort is a tool for manually sorting the contents of a file generated by the
following sequence of events:

1. Build a set of ssm .json files with syssci.renci.org/ssm (https://github.com/steve9000gi/ssm) and
put them all into a directory on your local machine: for instance, let's call the directory ssm-out,
but you can call it whatever you want.

2. From the bash shell command line run R script blm.R
(https://github.com/steve9000gi/binary-link-matrix) with two arguments: the first argument is the 
path, relative or absolute, to a directory full of ssm .json files, for example ../ssm-out; the
second argument is the path to an output directory, e.g., blm-out (but it can be called whatever you
like). The output of blm.R is a set of .csv files each of which contains the binary link matrix for 
one of the ssm .json input files, and which is has the same name as its corresponding input file,
with the original extension replaced by "-BLM.csv". Also generated is  a single file for the whole
ssm input directory, called NodeClasses.csv by default (rename it as you like), that organizes
all the node names from all the ssm input files into lists, by node type. So the names for all the
ROLE nodes will be listed under the heading ROLES, the names for all the Responsibility nodes will 
be listed under the heading RESPONSIBILITIES, etc. Other than that, the ordering of node names is
arbitrary.

3. Open syssci.renci.sort in Chrome or Firefox. Drag and drop the NodeClasses.csv file generated in
step 2 above into the sort window. The list of node names will appear on the left, numbered and
arranged by node type. Create as many boxes as you need by clicking on the New Box Button and 
set the title of each box by clicking on "Title" at the top left of the box, typing in the title
desired, and clicking elsewhere in the window. Drag items from the left-hand column of items into
the box where you want them. When you drag a text item it turns cyan. When it's droppable into a 
box the text turns bright green. Save your sorting process by clicking on the Save Boxes button,
which brings up a standard file save dialog. The text output file that results is named 
sortedItems.txt by default, but call it what you wish.
