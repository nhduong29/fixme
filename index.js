'use strict';
const EVENT_OPTION_LINE = 'options:lines';
const EVENT_HIDE_TOPBAR = 'options:hide-topbar';
const EVENT_NO_INDENT = 'options:no-indent';
const EVENT_HIGHLIGHT = 'options:highlightConfig';
const EVENT_READ_LINE = 'line';

const connect = require('connect');
const cookieParser = require('cookie');
const crypto = require('crypto');
const path = require('path');
const socketio = require('socket.io');
const tail = require('./lib/tail');
const connectBuilder = require('./lib/connect_builder');
const program = require('./lib/options_parser');
const serverBuilder = require('./lib/server_builder');
const daemonize = require('./lib/daemonize');
const fs = require('fs');
const untildify = require('untildify');
const nodemailer = require("nodemailer");
const readline = require('readline');

/**
 * Parse args
 */
program.parse(process.argv);
if (program.args.length === 0) {
  console.error('Arguments needed, use --help');
  process.exit();
}

/**
 * Validate params
 */
const doAuthorization = !!(program.user && program.password);
const doSecure = !!(program.key && program.certificate);
const sessionSecret = String(+new Date()) + Math.random();
const sessionKey = 'sid';
const files = program.args.join(' ');
const filesNamespace = crypto.createHash('md5').update(files).digest('hex');

if (program.daemonize) {
  daemonize(__filename, program, {
    doAuthorization,
    doSecure,
  });
} else {
  /**
   * HTTP(s) server setup
   */
  const appBuilder = connectBuilder();
  if (doAuthorization) {
    appBuilder.session(sessionSecret, sessionKey);
    appBuilder.authorize(program.user, program.password);
  }

  appBuilder.static(path.join(__dirname, 'web/assets'))
            .index(path.join(__dirname, 'web/index.html'), files, filesNamespace, program.theme);

  const builder = serverBuilder();
  if (doSecure) {
    builder.secure(program.key, program.certificate);
  }
  const server = builder
    .use(appBuilder.build())
    .port(program.port)
    .host(program.host)
    .build();

  /**
   * socket.io setup
   */
  const io = socketio.listen(server, {
    log: false,
  });

  if (doAuthorization) {
    io.use((socket, next) => {
      const handshakeData = socket.request;
      if (handshakeData.headers.cookie) {
        const cookies = cookieParser.parse(handshakeData.headers.cookie);
        const sessionIdEncoded = cookies[sessionKey];
        if (!sessionIdEncoded) {
          return next(new Error('Session cookie not provided'), false);
        }
        const sessionId = connect.utils.parseSignedCookie(sessionIdEncoded, sessionSecret);
        if (sessionId) {
          return next(null);
        }
        return next(new Error('Invalid cookie'), false);
      }

      return next(new Error('No cookie in header'), false);
    });
  }

  /**
   * Setup UI highlights
   */
  let highlightConfig;
  if (program.uiHighlight) {
    let presetPath;

    if (!program.uiHighlightPreset) {
      presetPath = path.join(__dirname, 'preset/ivy.json');
    } else {
      presetPath = path.resolve(untildify(program.uiHighlightPreset));
    }

    if (fs.existsSync(presetPath)) {
      highlightConfig = JSON.parse(fs.readFileSync(presetPath));
    } else {
      throw new Error(`Preset file ${presetPath} doesn't exists`);
    }
  }

  
  let linesNumberOfLogFileAtFirstTime = fs.readFileSync(program.args.toString()).toString().split('\n').length;
  function fromTo(start,end, callback) {
    var path = program.args.toString();
    var i = 0;
    var content="";
    var rs = fs.createReadStream(path, {
      encoding: 'utf8',
      autoClose: false
    }).on('error', function(err) {
      rs.destroy();
      callback(err, content)
    });
    path = null;
    try {
      readline.createInterface({
        input: rs,
        terminal: false
      }).on('line', function(line) {
        i++;
        if (i >= start && i<= end) {
          try {
              content = content + "\n" + line;
          } catch (e) {
            console.error(e);
          }
          if (i == end) this.close();
        }
      }).on('close', function() {
        rs.destroy();
        callback(null, content)
      }).on('error', function(err) {
        rs.destroy();
        callback(err, content)
      });
    } catch (err) {
      console.error(err);
      callback(err, content)
    }
  }


  /**
   * When connected send starting data
   */
  const tailer = tail(program.args, {
    buffer: program.number,
  });

  let eableEmailFeature = program.mail > 0;
  let postErrorLogToSlack = program.slack > 0;

  let lineNumber = linesNumberOfLogFileAtFirstTime - program.number;
  lineNumber =  lineNumber > 0 ? lineNumber : 1 ;
  
  const filesSocket = io.of(`/${filesNamespace}`).on('connection', (socket) => {
    socket.emit(EVENT_OPTION_LINE, program.lines);
    if (program.uiHideTopbar) {
      socket.emit(EVENT_HIDE_TOPBAR);
    }

    if (!program.uiIndent) {
      socket.emit(EVENT_NO_INDENT);
    }

    if (program.uiHighlight) {
      socket.emit(EVENT_HIGHLIGHT, highlightConfig);
    }

    tailer.getBuffer().forEach((line) => {
      socket.emit('line', line);
    });

  });

  let configuration = JSON.parse(fs.readFileSync(path.join(__dirname, 'preset/configuration.json')));

  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
           user: configuration.userName,
           pass: configuration.password
       }
   });

  async function mailMe(content){
    var htmlEmailContent = configuration.content;
    htmlEmailContent =  htmlEmailContent + '<pre>' +content+ '</pre>';
    var mailOptions = {
      from: configuration.from, // sender address
      to: configuration.to, // list of receivers
      subject: configuration.subject, // Subject line
      html: htmlEmailContent // plain text body
    };
    transporter.sendMail(mailOptions, function (err, info) {
      if(err)
        console.log(err)
      else
        console.log(info);
    });
  }

  var request = require('request');
  
  function createFile(content, lineNumber){
	var stream = fs.createWriteStream("bug"+lineNumber+".log");
	stream.once('open', function(fd) {
		stream.write(content);
		stream.end();
	});
	stream.on('finish', function(){
		request.post({
			url: 'https://slack.com/api/files.upload',
			formData: {
				file: fs.createReadStream("bug"+lineNumber+".log"),
				token: configuration.slackAccessToken,
				filetype: 'log',
				filename: "bug"+lineNumber+".log",
				channels: configuration.slackChannel,
				title: new Date().toUTCString(),
			},
		}, function(error, response, body) {
			fs.unlink("bug"+lineNumber+".log", function(error) {
				console.log(error);
			});			
		});		
	});
    
  }

  function cathMe(lineNumber, data){
    if (configuration && configuration.blackLists) {
      for (var i in configuration.blackLists) {
          if (data.search(configuration.blackLists[i]) >=0){
            fromTo(lineNumber,lineNumber+configuration.rows,function(err, res) {			  
              if (err) console.error(err)	//handling error
              mailMe(res).catch(console.error);			  
            })
          }
      }
    }
  }
  
  function postToSlack(lineNumber, data){
    if (configuration && configuration.blackLists) {
      for (var i in configuration.blackLists) {
          if (data.search(configuration.blackLists[i]) >= 0){
            fromTo(lineNumber,lineNumber+configuration.rows,function(err, res) {
              if (err) console.error(err)	//handling error
              createFile(res, lineNumber);
            })
          }
      }
    }
  }
  
  
  

  /**
   * Send incoming data
   */
  tailer.on(EVENT_READ_LINE, (line) => {
    filesSocket.emit(EVENT_READ_LINE, line);
    if(eableEmailFeature){
      cathMe(lineNumber,line);
    }	
	if(postErrorLogToSlack) {
		postToSlack(lineNumber,line);
	}	
	lineNumber ++;
  });

  /**
   * Handle signals
   */
  const cleanExit = () => {
    process.exit();
  };
  process.on('SIGINT', cleanExit);
  process.on('SIGTERM', cleanExit);
  
	
}
