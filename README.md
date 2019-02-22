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
node index.js --port=9002 log/debug.log --ui-highlight --mail 1 --slack 1
```
`log/debug.log` is the log file you want to stream.

`--mail` is the param to enable or disable email feature. Set `0` to disable email feature, set the number > 1 to eable.

`--slack` is used to enable or disable post error to slack feature. Set `0` to disable email feature, set the number > 1 to eable.

Open browser: localhost:9002

## Email config
Edit the file `preset/configuration.json`

`userName` : a gmail account `aavn.fixme@gmail.com`

`password` : "emailPassW" 

`to`: a list of receiver eg: "receiver1@gmail.com, receiver2@gmail.com, receiver3@gmail.com"

`subject` : Email subject

`content` : email content

`rows` : `Number` the number of rows you want to get from log file, at the moment it is only possible to extract less than 50 lines at a time, we will enhance it in the future.

`blackLists` : `Array` the keyword that you want to cath on log file eg: ["error","NullPointerException"]

`slackAccessToken` : `XXX` slack bot access token of the selected slack bot on your slack workspace, you can find one active bot here https://aavn-fintech.slack.com/services/BG7QT9D44. Only one key is valid at a moment and only the creator of the bot can see the key, please contact team Infinity to get the key or create the bot yourself.

`slackChannel` : `Channel name` where the log is treamed to, please make sure that the channel is not private since bot only has access to public channels

## Log hightlight config
Edit the file `preset/ivy.json`

## Make a application run permanently
Install forever using npm like this:
```bash
sudo npm install -g forever
```
Then start your application with:
```bash
cd sandbox-tail
forever start index.js --port=9002  /opt/ivy_engine/AxonIvyEngine7.0.3_CreditHighway_T/logs/ch.ivyteam.ivy.log --ui-highlight --mail 1
```
To list all running processes:
```bash
forever list
```
Note the integer in the brackets and use it as following to stop a process:
```bash
forever stop 0
```
Restarting a running process goes:
```bash
forever restart 0
```


## License
[MIT](https://choosealicense.com/licenses/mit/)
