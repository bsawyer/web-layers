
const express = require('express');
const fs = require('fs');
const https = require('https');
const app = express();
const PORT = process.env.PORT || 8080;
const staticDir = __dirname + '/';

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-access-token');
    res.header('Access-Control-Allow-Credentials', 'true');
    return next();
});
app.use(function(req, res, next) {
  if (req.path.indexOf('.') === -1) {
    const file = staticDir + req.path + '.html';
    fs.exists(file, function(exists) {
      if (exists){
        req.url += '.html';
      }
      next();
    });
  }else{
    next();
  }
});
app.use(express.static(staticDir));

const key = fs.readFileSync('./certs/server.key');
const cert = fs.readFileSync('./certs/server.crt');

const server = https.createServer({
  key,
  cert
}, app);

server.listen(PORT);

console.log(`server listening on port ${PORT}`);
