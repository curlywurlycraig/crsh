Note. This is very immature and breaks in a lot of cases. Use at your own peril!
[Associated blog post](https://crwi.uk/2020/07/12/crsh.html)

crsh is a modern command line shell that allows seamless
interoperability between unix commands and Javascript.

crsh takes the composability and utility of unix commands and combines it with
the expressiveness of modern Javascript.

Regular command execution will be familiar to those who have used the command line:

```
$ ls | grep .js
builtins.js
crsh.js
functions.js
```

And inline anonymous functions will be familiar to those who have used Javascript:

```
$ () => "Hello world!"
Hello world!
```

Returning a list from an inline function will be outputted as separate lines:


```js
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

Note in the above that `lines` is made available to piped inline functions.

JSON output piped into an inline function is automatically parsed and made available as a `json` parameter:

```
$ curl https://ghibliapi.herokuapp.com/films/58611129-2dbc-4a81-a72f-77ddfc1b1b49 | ({ json }) => json.title
My Neighbor Totoro
```

Raw output is also available:

```
$ ls | ({ raw }) => raw
README.md
builtins.js
crsh.js
prompt.js
todo.org
tty.js
util.js
```

File output redirection works as usual:

```
$ curl https://ghibliapi.herokuapp.com/films/58611129-2dbc-4a81-a72f-77ddfc1b1b49 | ({ json }) => json.title > ghibli_titles.txt
$ cat ghibli_titles.txt
My Neighbor Totoro
```

Javascript can be directly evalated by terminating a command with a semi-colon:

```js
$ a = 10 * 5;
50
$ console.log(a);
50
```

Note that we don't use `let` or `const`: lines are evaluated in their own scope, so declarations are global. This means they can be read inside inline functions:

```js
$ a = 10 * 5;
50
$ () => `a is: ${a}`
a is: 50
```

Variables can also be interpolated in commands:

```js
$ touch file_${a}.js
$ ls
file_50.js
$ echo ${a}
50
```

Similarly, env vars can be accessed in a familiar way:

```
$ export TEST=value
$ echo $TEST
value
```

# Installation
This process is still quite manual. At some point I would like to create a setup script to do this.

[Install Deno](https://deno.land/#installation)

Clone this repo into the `~/.crsh` directory: `git clone git@github.com:curlywurlycraig/crsh.git ~/.crsh`

CD into repo: `cd ~/.crsh`.

Copy defaults: `cp userDefaults/* .`

# Running
`~/.crsh/bin/crsh`
You may need to make the above file executable:
`chmod +x ~/.crsh/bin/crsh`

# Configuration
Edit `~/.crsh/completionRules/rules.js` to include your own completion rules.
Edit `~/.crsh/prompt.sh` to make your own prompt.

# Contributing

There are a lot of bugs. If you see one, please open an issue and consider a pull request if you feel so inclined.

I may close issues that I deem to be out of the scope of this shell, since I don't intend to bend over backwards to support older shell use cases.

You can also create completion rules in your own repo to be imported, creating a kind of plugin system.

# Special Thanks

Blake Hawkins for his indispensible input!
