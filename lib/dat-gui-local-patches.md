# Bundled dat.GUI lifecycle patch

This project retains the bundled dat.GUI version/API. Local changes to
`dat.gui.min.js` give each GUI/folder a removable resize handler, make `destroy()`
recursive/idempotent, remove destroyed roots from the hide-toggle registry,
clear listening lists/unload handlers, and cancel active numeric, color and
panel-resize drags. Color selector mouseup handlers now unbind themselves.
Coefficient-folder replacement calls `destroy()` before removing its row.

Do not replace this with an unrelated dependency upgrade as part of cleanup.
