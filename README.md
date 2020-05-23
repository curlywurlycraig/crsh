dsh (_Deno Shell_) is a modern command line shell that allows seamless
interoperability between unix commands and Javascript.

dsh takes the composability and utility of unix commands and combines it with
the expressiveness of modern Javascript.

Regular command execution will be familiar to those who have used the command line:

```
$ ls | grep .js
builtins.js
dsh.js
functions.js
```

And inline anonymous functions will be familiar to those who have used Javascript:

```
$ () => "Hello world!"
Hello world!
```

Returning a list from a JS function will be outputted as separate lines:


```
$ () => new Array(5).fill().map((line, index) => `Line ${index}`)
Line 0
Line 1
Line 2
Line 3
Line 4
```

Combining these concepts can yield a very expressive shell:

```
$ ls | ({ lines }) => lines.map((line, index) => `line ${index}: ${line}`) | grep line 3
line 3: functions.js
```

JSON output piped into a JS function is automatically parsed and made available as a `json` parameter:

```
$ curl https://ghibliapi.herokuapp.com/films/58611129-2dbc-4a81-a72f-77ddfc1b1b49 | ({ json }) => json.title
My Neighbor Totoro
$
```

# Installation
TODO

# Running
`deno run --allow-run --allow-read --allow-write --allow-net --allow-env --unstable dsh.js`

# Example command
`curl https://ghibliapi.herokuapp.com/films/58611129-2dbc-4a81-a72f-77ddfc1b1b49 | ({ json }) => json.locations`
