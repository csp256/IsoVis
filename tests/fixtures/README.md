These are frozen external-format examples captured from the pre-rename app
(`775e09351b75d7233bb33c7af0c56d4d7918b19f`). They intentionally retain
camelCase JSON schema keys and a camelCase variable inside the user's opaque
field source. The compatibility test imports both envelope-v1 and older array
formats, checks stable exports, and executes that user body without rewriting it.
