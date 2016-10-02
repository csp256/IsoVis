### IsoVis
Create higher dimensional shapes in a web browser.

![GitHub Logo](/image2.png)

Download, unzip, and open IsoVis.html in Google Chrome. (ctrl + o) [Or you could just click here.](https://rawgit.com/csp256/IsoVis/master/IsoVis.html)

You can edit every parameter defining the shape in real time. Write your own JavaScript function & adjust "iso" to see different parts of the function. Scale, rotate, & translate through any dimension.

Runs on up to 9 cores. At maximum resolution (65) memory usage is ~1.2 GB. Press 'Abort' to reclaim.

Please report any bugs, and feel free to make feature requests.

## How to use IsoVis

# What IsoVis does

This section contains technical jargon. You can skip ahead to the next section if you want.

IsoVis allows you to define any single-valued function (f: R^n → R, for any fixed n) and visualize where that function crosses some boundary value (the "isolevel"). Specifically, it allows you to apply an arbitrary linear projection A to your space, and see the portion of it that is projected into our familiar 3 dimensional space. 

This is implemented by taking a regular lattice around the origin and applying the *inverse* projection, then sampling the function. Thus, y = f(Bx) where AB=I and x is an n dimensional vector. Marching cubes is run on 8 background processes (one per octant), using the lattice of y values and the given isolevel.

Intermediate stages of the computation are cached to speed up performance, but memory use can be significant. Doubling the resolution increases memory use by a factor of 8.

# The Transformation Stack

The transformation stack is manipulated with the GUI windows on the upper right of the screen. Click on "Transforms" to expand it. Each transformation you apply is added one after another, from the bottom of the stack to the top. You can build any linear transform from these primitives.

* __Invert Order__ Linear transformations are not commutative. (yaw left 90 degrees, then pitch up 90 degrees. Compare with doing that in reverse order) Click this to invert the stack of transformations. 
* __Push Transform__ Adds a new transform to the top of the stack which you can manipulate.
* __Pop Transform__ Remove the transform at the top of the stack.
* __Apply Transform__ The entire combined linear transformation is computed, and your basis is changed such that this is the new Identity transform. This effect can be applied many times. In general use, you don't need to use this - it can make things confusing.
* __Pop All On Apply__ Empties the stack when the above option is clicked. 
* __Reset Orientation__ Removes the effect from "Apply Transform"
* __Pop All Transforms__ Empties the stack. 

There are many types of primitive linear transformations. Because Javascript is 0 indexed, the first 3 dimensions are numbered 0, 1, and 2. Note that for technical reasons above the INVERSE of each linear transformation is what is actually applied.

* __Euler Rotation__ Rotation on a plane defined by two basis axes. (Note, rotations happen on a plane, NOT around a direction; it only seems that way in 3 dimensions.) Because you can combine multiple rotations, you can generate any rotation by first projecting the desired rotation plane to be coplanar with two basis axes. 
* __Rodrigues Rotation__ Not yet implemented. 
* __Clifford Rotation__ Not yet implemented.
* __Lie Rotation__ Not yet implemented. 
* __Scale__ Values larger than 1 stretch the space, smaller values contract it. Negative values invert it. 
* __Translation__ Positive move the scalar field "up" along that axis.
* __Shear__ Applies the Identity transformation, but with a single user-specified off diagonal element non-zero. Note zero indexing and inversion of the shear amount.

# Customizing Function



## FAQ (aka, WTF's)

# WTF? Why is the main HTML file so huge? 

Security policy for web browsers makes this the easiest, safest way to use "Web Workers" (parallel processes) while hosting the code on your local computer. I wish I had an easy fix, sorry!

# WTF? Why are there global variables? 

This started off as a quick, one-off side project. I started off unfamiliar with how Javascript's "var" worked, and ended up making large portions of the core logic use global variables. Whoops! This can be fixed (nothing is reliant upon them being global, per se), but it would be time consuming / slightly annoying so I haven't done it. 

## Bugs and upcoming features

* Gif-making does not work properly (highest priority)
* Can not share
* Zoom sensitivity is not constant (easy fix, high priority)
* Aspect ratio of rendering is dependent upon physical window size (?? fix, medium priority)
* Changing the number of constants is handled in a stupid way (medium fix, low priority)
* Only a limited selection of linear transforms (hard fix, medium priority)
* No non-linear transformations (harder fix, low priority)
* Code is poorly commented (time intensive, low priority)
* Remove all global variables (time intensnive, mediums priority) 
* Interpolation is always on (do not intend to fix)
* Non-wireframe mode is broken (do not intend to fix)
* Several other graphical issues (do not intend to fix)
* Interface is bad on mobile phones (do not intend to fix)

## Pull requests, suggestions, and use-cases welcome.

I would love to see what you made!
