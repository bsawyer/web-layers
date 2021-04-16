import path from 'path';
import fs from 'fs';

import {createProxyMiddleware} from 'http-proxy-middleware';
import express from 'express';
import https from 'https';
import bodyParser from 'body-parser';
import validUrl from 'valid-url';

const urlencodedParser = bodyParser.urlencoded({extended: false});
const jsonParser = bodyParser.json();

const app = express();
const router = express.Router();
const registry = express.Router();

const PORT = process.argv[2]|| 9000;

const key = fs.readFileSync('./certs/server.key');
const cert = fs.readFileSync('./certs/server.crt');

router.use(urlencodedParser, jsonParser);
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-access-token');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

const urlProxy = createProxyMiddleware(
  (pathname, req)=>{
    if(req.layerUrl){
      return true;
    }
  }, {
    target: 'localhost',
    changeOrigin: true,
    secure: false,
    router: function (req) {
      console.log(`returning router url "${req.layerUrl.toString()}"`);
      return req.layerUrl.toString();
    },
    pathRewrite: async function (path, req) {
      let pathRewrite = path.indexOf('/layer') !== -1 ? path.slice(0, path.indexOf('/layer')) : path;
      console.log('rewriting path...', {
        path,
        pathRewrite
      });
      return pathRewrite;
    },
    onProxyReq: function(proxyReq, req){
      console.log(`proxying "${req.protocol + '://' + req.get('host') + req.originalUrl}" -> "${proxyReq.protocol + '//' + proxyReq.host + proxyReq.path}"`);
    }
});

const checkRefererAndPath = (req, res, next)=>{
  if(req.path.indexOf('/layer/') !== -1){
    const reqUrl = decodeURIComponent(req.path.slice(req.path.indexOf('/layer/') + 7));
    if(validUrl.isUri(reqUrl)){
      req.layerUrl = new URL(reqUrl);
    }
  }
  next();
};

router.use(checkRefererAndPath, urlProxy);

router.use((request, response, next)=>{
  response.status(404).send({error: `beep boop`});
});

app.use(router);

const server = https.createServer({
  key,
  cert
}, app);

// app.listen(PORT);
server.listen(PORT);

console.log(`server listening on port ${PORT}`);

export default server;
