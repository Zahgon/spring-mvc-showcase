# spring-mvc-showcase is no longer actively maintained by VMware, Inc.

Spring MVC Showcase
-------------------
Demonstrates the capabilities of the Spring MVC web framework through small, simple examples.
After reviewing this showcase, you should have a good understanding of what Spring MVC can do and get a feel for how easy it is to use.
Includes project code along with a supporting slideshow and screen cast.

In this showcase you'll see the following in action:

* The simplest possible @Controller
* Mapping Requests
* Obtaining Request Data
* Generating Responses
* Message Converters
* Rendering Views
* Type Conversion
* Validation
* Forms
* File Upload
* Exception Handling

To get the code:
-------------------
Clone the repository:

    $ git clone git://github.com/SpringSource/spring-mvc-showcase.git

If this is your first time using Github, review https://help.github.com to learn the basics.

To run the application:
-------------------	
From the command line with npm:

    $ cd spring-mvc-showcase
    $ npm install
    $ npm start

Access the deployed web application at: http://localhost:8080/spring-mvc-showcase/

`PORT` and `CONTEXT_PATH` override the two defaults.

To run the tests:
-------------------

    $ npm test              # the suite
    $ npm run coverage      # the suite with a coverage report
    $ npm run typecheck     # the compiler, with no emit

TypeScript port
-------------------

This is a TypeScript port of the original Java application. It keeps the
showcase's behaviour rather than its dependencies: the slice of Spring MVC the
showcase exercises — request mapping, argument resolution, data binding, type
conversion, message conversion, view resolution, async dispatch and exception
handling — is reimplemented under `src/framework`, and the showcase's own
controllers sit above it under `src/samples`. The JSP views are translated into
`src/webapp/views`, and `src/main.ts` takes the place of the servlet container.
See `truth.md` alongside the repository for what was verified and how.

Note:
-------------------

This showcase originated from a [blog post](https://spring.io/blog/2010/07/22/spring-mvc-3-showcase/) and was adapted into a SpringOne presentation called [Mastering MVC 3](https://www.infoq.com/presentations/Mastering-Spring-MVC-3).

A screen cast showing the showcase in action is [available in QuickTime format](http://s3.springsource.org/MVC/mvc-showcase-screencast.mov).
