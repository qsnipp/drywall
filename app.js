'use strict';

//dependencies
var config = require('./config'),
    express = require('express'),
    mongoStore = require('connect-mongo')(express),
    http = require('http'),
    path = require('path'),
    passport = require('passport'),
    mongoose = require('mongoose'),
    helmet = require('helmet');

//create express app
var app = express();

//keep reference to config
app.config = config;

//setup the web server
app.server = http.createServer(app);

//setup mongoose
app.db = mongoose.createConnection(config.mongodb.uri);
app.db.on('error', console.error.bind(console, 'mongoose connection error: '));
app.db.once('open', function () {
  //and... we have a data store
});

//config data models
require('./models')(app, mongoose);

//setup the session store
app.sessionStore = new mongoStore({ url: config.mongodb.uri });

//config express in all environments
app.configure(function(){
  //settings
  app.disable('x-powered-by');
  app.set('port', config.port);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('strict routing', true);

  //middleware
  app.use(express.logger('dev'));
  app.use(express.compress());
  app.use(express.favicon(__dirname + '/public/favicon.ico'));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.urlencoded());
  app.use(express.json());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({
    secret: config.cryptoKey,
    store: app.sessionStore
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  helmet.defaults(app);

  //response locals
  app.use(function(req, res, next) {
    res.locals.user = {};
    res.locals.user.defaultReturnUrl = req.user && req.user.defaultReturnUrl();
    res.locals.user.username = req.user && req.user.username;
    next();
  });

  //mount the routes
  app.use(app.router);

  //error handler
  app.use(require('./views/http/index').http500);

  //global locals
  app.locals.projectName = app.config.projectName;
  app.locals.copyrightYear = new Date().getFullYear();
  app.locals.copyrightName = app.config.companyName;
  app.locals.cacheBreaker = 'br34k-01';
});

//config express in dev environment
app.configure('development', function(){
  app.use(express.errorHandler());
});

//setup passport
require('./passport')(app, passport);

//route requests
require('./routes')(app, passport);

//setup utilities
app.utility = {};
app.utility.sendmail = require('drywall-sendmail');
app.utility.slugify = require('drywall-slugify');
app.utility.workflow = require('drywall-workflow');

//listen up
app.server.listen(app.config.port, function(){
  //and... we're live
});
