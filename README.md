# Description

Stream the log file

Check the error and send the email to receiver

## Installation

Install gitbash if you are using window ;).

```bash
npm  install
```

Run application
```bash
node index.js --port=9002 log/debug.log --ui-highlight
```

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