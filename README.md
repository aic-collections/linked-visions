Linked Visions
===================

The source for
[linkedvisions.artic.edu](http://linkedvisions.artic.edu), an application that
allows the user to visually explore the social and personal
connections between individuals in Whistler and Roussel’s networks.

[Whistler and Roussel: Linked Visions](http://www.artic.edu/exhibition/whistler-and-roussel-linked-visions), an exhibition on view at the
Art Institute of Chicago in Fall 2015, featured prints and drawings by James
McNeill Whistler and Theodore Roussel. The exhibition showed that the
work Whistler and Roussel produced during the late 19th century was
not created in isolation, but was only possible in the context of
their dynamic, thriving community. This community of artists,
technicians, writers, publishers and models as well as their family
and friends encouraged experimentation and created space for insiders
and outsiders to explore a new world of artistic expression. In order
to bring this idea to life, a team at the Art Institute
created the Linked Visions interactive.

This is a d3.js network visualization powered by linked data. The data directory contains the triple files that populate the graph via RDF plugin for jquery. No database is required.



---

Analytics
====

To set analytics, replace the analytics.php file in the root of the project. This file should contain your analytics embed (with default pageviews disabled) and a JavaScript block which listens for 'vpv' events and manually triggers pageviews for your analytics system.


```
<?php // analytics.php ?>

<script>
  $('body').on('vpv', function() {
    // manually fire a pageview
  });
</script>
```



---

License
====
The MIT License (MIT)

Copyright (c) 2015 Art Institute of Chicago

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

---
* This project utilizes libraries which may or may not have additional individual licenses
