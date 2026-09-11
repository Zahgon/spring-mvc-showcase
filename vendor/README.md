# vendor

Third-party browser libraries, committed rather than fetched — as the original
committed them, byte for byte:

| Directory | Library | Version |
|---|---|---|
| `jquery/1.6/` | jQuery | 1.6 |
| `jqueryui/1.8/` | jQuery UI (core, tabs, widget, and the base theme) | 1.8 |
| `jqueryform/2.8/` | jQuery Form Plugin | 2.8 |

The original kept these under `src/main/webapp/resources/`, mixed in with the
application's own `form.css`, because a war has no other place to put them.
Nothing about how they are served has changed: they still answer under
`/resources/jquery/1.6/jquery.js` and the rest, which is what every page links
to. `ServletContainer` is given `public/resources` and `vendor` as its two
resource roots and tries them in that order.
