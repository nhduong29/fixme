# Description

Stream the log file

Check the error and send the email to receiver

## Require
1. NodeJS

2. GITBASH on Windown || Linux

## Installation

Install gitbash if you are using window ;).

```bash
npm  install
```

Run application
```bash
node index.js --port=9002 log/debug.log --ui-highlight --mail 1
```
`log/debug.log` is the log file you want to stream.

`--mail` is the param to enable or disable email feature. Set `0` to diable email feature, set the number > 1 to eable.

Open browser: localhost:9002

## Email config
Edit the file `preset/mailConfig.json`
### `userName` : a gmail account `aavn.fixme@gmail.com`
### `password` : "emailPassW" 
### `to`: a list of receiver eg: "receiver1@gmail.com, receiver2@gmail.com, receiver3@gmail.com"
### `subject` : Email subject,
### `content` : email content,
### `rows` : `Number` the number of rows you want to get from log file
### `blackLists` : `Array` the key words you want to cath on log file eg: ["error","NullPointerException"]

## License
[MIT](https://choosealicense.com/licenses/mit/)