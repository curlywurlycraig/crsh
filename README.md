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

Combining these concepts can yield a very expressive shell:

```
$ ls | ({ lines }) => lines.map((line, index) => `line ${index}: ${line}`)
line 0: README.md
line 1: builtins.js
line 2: dsh.js
line 3: functions.js
line 4: prompt.js
line 5: todo.org
line 6: tty.js
line 7: util.js
```

# Installation
TODO

# Running
`deno run --allow-run --allow-read --allow-net --allow-env dsh.js`

# Example command
`fetchBody('https://ghibliapi.herokuapp.com/films/58611129-2dbc-4a81-a72f-77ddfc1b1b49') | ({ json }) => json.locations`
