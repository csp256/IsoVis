# IsoVis
Create higher dimensional shapes in a web browser.

![GitHub Logo](/image2.png)

Download, unzip, and open IsoVis.html in Google Chrome. (ctrl + o) [Or you could just click here.](https://rawgit.com/csp256/IsoVis/master/IsoVis.html)

You can edit every parameter defining the shape in real time. Write your own JavaScript function & adjust "iso" to see different parts of the function. Scale, rotate, & translate through any dimension.

Runs on up to 9 cores. At maximum resolution (65) memory usage is ~1.2 GB. Press 'Abort' to reclaim.

Please report any bugs, and feel free to make feature requests.

## How to use IsoVis

### What IsoVis does

This section contains technical jargon. You can skip ahead to the next section if you want.

IsoVis allows you to define any single-valued function (f: R^n → R, for any fixed n) and visualize where that function crosses some boundary value (the "isolevel"). Specifically, it allows you to apply an arbitrary linear projection A to your space, and see the portion of it that is projected into our familiar 3 dimensional space. 

This is implemented by taking a regular lattice around the origin and applying the *inverse* projection, then sampling the function. Thus, y = f(Bx) where AB=I and x is an n dimensional vector. Marching cubes is run on 8 background processes (one per octant), using the lattice of y values and the given isolevel.

Intermediate stages of the computation are cached to speed up performance, but memory use can be significant. Doubling the resolution increases memory use by a factor of 8.

### The Transformation Stack

The transformation stack is manipulated with the GUI windows on the upper right of the screen. Click on "Transforms" to expand it. Each transformation you apply is added one after another, from the bottom of the stack to the top. You can build any linear transform from these primitives.

* _Invert Order_ - Linear transformations are not commutative. (yaw left 90 degrees, then pitch up 90 degrees. Compare with doing that in reverse order) Click this to invert the stack of transformations. 
* _Push Transform_ - Adds a new transform to the top of the stack which you can manipulate.
* _Pop Transform_ - Remove the transform at the top of the stack.
* _Apply Transform_ - The entire combined linear transformation is computed, and your basis is changed such that this is the new Identity transform. - This effect can be applied many times. In general use, you don't need to use this - it can make things confusing.
* _Pop All On Apply_ - Empties the stack when the above option is clicked. 
* _Reset Orientation_ - Removes the effect from "Apply Transform"
* _Pop All Transforms_ - Empties the stack. 

There are many types of primitive linear transformations. Because Javascript is 0 indexed, the first 3 dimensions are numbered 0, 1, and 2. Note that for technical reasons above the INVERSE of each linear transformation is what is actually applied. (read: contravariance and covariance)

* _Euler Rotation_ - Rotation on a plane defined by two basis axes. (Note, rotations happen on a plane, NOT around a direction; it only seems that way in 3 dimensions.) Because you can combine multiple rotations, you can generate any rotation by first projecting the desired rotation plane to be coplanar with two basis axes. 

* _Rodrigues Rotation_ - Not yet implemented. 

* _Clifford Rotation_ - Not yet implemented.

* _Lie Rotation_ - Not yet implemented. 

* _Scale_ - Values larger than 1 stretch the space, smaller values contract it. Negative values invert it. 

* _Translation_ - Positive move the scalar field "up" along that axis.

* _Shear_ - Applies the Identity transformation, but with a single user-specified off diagonal element non-zero. Note zero indexing and inversion of the shear amount.

In contrast, the "zoom" field in the upper right applies a scaling that is defined to occur after all other transformations. It is provided solely for convenience.

### The Function Editor

The pane on the left allows you to write code to define the scalar field you want to visualize. Change the width in the "Shape" GUI window using "editorWidth". Set the number of dimensions you will be working in the same window with "dimensions". The "isolevel" field changes what value you are looking at. 

* *Update* - Click to submit your changes to the Web Workers. *If you make an error, there will be no error message.* It will simply compile the default function instead.
* *Reset* - Resets the text editor. 

The other buttons in the same panel do not interact with your text editor (even import & export). 

Writing functions in the function editor is done by Javascript. The position of each point is stored consecutively in the x[] array, with an offset of j. Thus, to access dimension number k (again, dimensions are numbered starting at 0), you must access x[j+k]. Just remember to always add j to the index of x[]. This is done because x[] is a flat array, and IsoVis will use the for-loop to compute your function at each lattice point.

IsoVis expects that results are stored contiguously in values[]. Index into values[] with i, offset x[] by j, leave the for-loop alone, and IsoVis will take care of the rest.

    function field(x, c, size3, n) { // You can not edit this line.
      // Define any variables you might want.
      for (var i=0,j=0; i<size3; i++,j+=n) { // Do not edit this line.
        // Anything you want.
        values[i] = whatever_variable_holds_your_final_result; // Write output to the format IsoVis expects.
      } // Do not edit this line
    } // You can not edit this line.
    
If you wanted to look at a cylinder, you could accomplish that by:

    function field(x, c, size3, n) { 
      for (var i=0,j=0; i<size3; i++,j+=n) { 
        values[i] = Math.sqrt(x[j+0] * x[j+0] + x[j+1] * x[j+1]);
      } 
    } 

Note, when using the square root function, make sure you never pass it a negative value. The result will not be what you want. There is no support for complex numbers. Similar caveats apply to functions like logarithm, dividing by 0, etc. 

Maybe you wanted the cylinder to have a varying, periodic radius:

    function field(x, c, size3, n) { 
      var wiggle;
      for (var i=0,j=0; i<size3; i++,j+=n) { 
        wiggle = 1 + Math.sin( x[j+2] );        
        values[i] = Math.sqrt(x[j+0] * x[j+0] + x[j+1] * x[j+1] + wiggle);
      } 
    } 

Maybe you wanted to be able to control how the radius changed without applying transforms, so you add three constant coefficients (also 0 indexed):

    function field(x, c, size3, n) { 
      var wiggle;
      for (var i=0,j=0; i<size3; i++,j+=n) { 
        wiggle = 1 + c[0]*Math.sin( c[1]*x[j+2] + c[2] );        
        values[i] = Math.sqrt(x[j+0] * x[j+0] + x[j+1] * x[j+1] + wiggle);
      } 
    } 

These coefficients can be conveneintly edited under the "Coefficients" subwindow in the "Shape" window. You can change the number of coefficients by changing "coeffCount" right next to it. Having coeffCount set too high will not hurt things, but it might be confusing for the user. 

If you wanted to use a coordinate system other than Cartiesian, such as spherical, you have to manually apply this conversion yourself. 

Everything we have done so far has been in three dimensions. We can easily define any function we want in any number of dimensions by just settings the "dimensions" field to the appropriate value, accessing x[j+3] or higher when computing values[], and applying 

### Other Features

The amount and speed of the camera bob can be changed in the "Camera" window in the GUI on the left side, under "radius" and "speed". The two fields just above this allow you to switch from projective to orthographic camera, and change the field of view.

The "Screenshot" button on the upper left takes a screenshot. Duh.

"Import" and "Export" next to it allow you to save or share all of your current settings in the JSON format. The exception is the function defined in the text editor! You must save that manually!

Under "Shape" the "memoryOveruse" setting amortizes memory allocation for smoother operation. Decrease it for minimal memory use, but worse performance in the typical case.

The "Abort" button will kill all processes and decrease the resolution. Spamming this button will crash IsoVis. Refresh with F5 if this happens.

Several of the settings under "Material" are broken or half broken, but the "Opacity" setting can be useful.

## FAQ (aka, WTF's)

### WTF? Why is the main HTML file so huge? 

Security policy for web browsers makes this the easiest, safest way to use "Web Workers" (parallel processes) while hosting the code on your local computer. I wish I had an easy fix, sorry!

### WTF? Why are there global variables? 

This started off as a quick, one-off side project. I started off unfamiliar with how Javascript's "var" worked, and ended up making large portions of the core logic use global variables. Whoops! This can be fixed (nothing is reliant upon them being global, per se), but it would be time consuming / slightly annoying so I haven't done it. 

## Bugs and upcoming features

* Gif-making does not work properly (highest priority)
* Editor is not included in import/export feature
* No set of default functions
* No volumetric visualization
* Zoom sensitivity is not constant (easy fix, high priority)
* Aspect ratio of rendering is dependent upon physical window size (?? fix, medium priority)
* Changing the number of constants is handled in a stupid way (medium fix, low priority)
* Only a limited selection of linear transforms (hard fix, medium priority)
* No non-linear transformations (harder fix, low priority)
* Code is poorly commented (time intensive, low priority)
* Remove all global variables (time intensnive, mediums priority) 
* Interpolation is always on (do not intend to fix)
* Non-wireframe mode is broken (do not intend to fix)
* Several other graphical issues; most under "Materials" (do not intend to fix)
* Interface is bad on mobile phones (do not intend to fix)

## Pull requests, suggestions, and use-cases welcome.

I would love to see what you made!
