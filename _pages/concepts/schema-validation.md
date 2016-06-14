---
title: Schema validation
---
[JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON)
is a ubiquitous and human-readable data exchange format that has greatly aided
the advance of modern web development. It is far more compact than previously
popular formats such as XML, and requires no special tools to produce.

However, this lack of tooling also puts the burden on application developers
to ensure that the data their applications send and receive are well-formed.

## Structural validation

Structural validation is the process of ensuring that the individual data
members of a JSON object are of the correct type. For example, a property that
contains a number type when a nested JSON object was expected would produce a
structural validation error.

Structural validation is only a necessary first step toward deeper types of
validation, specifically [semantic](#semantic-validation),
[environmental](#environmental-validation), and [style](#style-validation)
validation.

### JSON Schema

The emerging [JSON Schema](http://json-schema.org/) standard aims to provide a
robust set of tools that integrate easily into applications in different
languages. It can define the required and optional components of a JSON
structure, including data types, valid data ranges, and data formats. JSON
Schema specifications can also define the types of individual data members,
which allows for structural validation of arbitrarily complex data types.

This application doesn't use JSON Schema due to a focus on
[minimizing dependencies]({{ site.baseurl }}/concepts/minimizing-dependencies/).
Were this application larger in scope, it would almost certainly use a JSON
Schema implementation such as
[json-schema](https://www.npmjs.com/package/json-schema) or
[JSV](https://www.npmjs.com/package/JSV) to perform structural validation.

## <a name="semantic-validation"></a>Semantic validation

Values within a data structure may have to adhere to semantic constraints that
cannot be captured by a structural constraint. Even though a data object may
be structurally valid and the program may function without error, the object
may produce surprising results without semantic validation. Semantic
validation is therefore an application of [the principle of least
astonishment](https://en.wikipedia.org/wiki/Principle_of_least_astonishment).

For example, in the [full implementation of
`hubot-slack-github-issues`](https://github.com/18F/hubot-slack-github-issues/),
the rules specified by the configuration object must be unique in terms of
`reactionName`, `githubRepository`, and `channelNames`. There may be at most
one rule for each `reactionName` that does not specify `channelNames`,
indicating that the `reactionName` will match that reaction from any channel.
It must be listed last so that more specific rules will be matched first.
(Though this last constraint is currently an artifact of the implementation,
it also has positive implications in terms of [style](#style-validation).)

## <a name="environmental-validation"></a>Environmental validation

A program may need to validate that its runtime environment satisfies certain
conditions based upon its configuration—for example, that a file specified by
a JSON configuration object maps to an existing file upon startup. This is
similar (though not perfectly analogous) to checking for the existence of the
file specified by `HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH`.

## <a name="style-validation"></a>Style validation

Though it's not purely necessary, it may prove helpful to enforce a specific style
upon an object's data. This is especially true for configuration data that may
be maintained by several people. The enforced style should be as easy to
understand as possible, and should help prevent semantically valid mistakes
that may result in surprising application behavior. In this way, style
validation is also an application of [the principle of least
astonishment](https://en.wikipedia.org/wiki/Principle_of_least_astonishment).

Again, in [full implementation of
`hubot-slack-github-issues`](https://github.com/18F/hubot-slack-github-issues/),
`Config` validation enforces that each rule is sorted by `reactionName`,
then by the presence of `channelNames`, and then by `githubRepository`. In
each individual rule, each `channelNames` member must also be sorted. This
predictable ordering produces a sensible, human-scannable context for the
overall set of rules, reducing the chances of misunderstanding and
misconfiguration.
