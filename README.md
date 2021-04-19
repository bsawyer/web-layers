# Web Layers

## Custom Element

## Proxy Server

## CLI

## Development
1. install deps
```
  npm i
```

2. get HTTPS working for localhost see
[HTTPS for localhost](###-HTTPS-for-Localhost)

### Custom Element

1. run static server
```
node static.js
```

2. view an example e.g. https://localhost:8080/examples/nested.html

### Proxy Server
1. run proxy server
```
  node index.mjs
```
2. view an example e.g. https://localhost:9000/layer/https%3A%2F%2Flocalhost%3A8080%2Fexamples%2Fperformance.html


### HTTPS for Localhost
Steps taken from https://www.freecodecamp.org/news/how-to-get-https-working-on-your-local-development-environment-in-5-minutes-7af615770eec/

1. make a directory somewhere
```
  mkdir ~/Desktop/localhost-certs && cd ~/Desktop/localhost-certs
```

2. generate a key
```
  openssl genrsa -des3 -out rootCA.key 2048
```

3. create root cert
```
  openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 1024 -out rootCA.pem
```

4. open system key chain, select system and category certificates
5. go to file then import items and choose rootCA.pem
6. toggle "When using this certificate:" to Always trust
7. make server.csr.cnf file and edit contents to be
```
  [req]
  default_bits = 2048
  prompt = no
  default_md = sha256
  distinguished_name = dn

  [dn]
  C=US
  ST=RandomState
  L=RandomCity
  O=RandomOrganization
  OU=RandomOrganizationUnit
  emailAddress=hello@example.com
  CN = localhost
```

8. make v3.ext and edit contents to be
```
  authorityKeyIdentifier=keyid,issuer
  basicConstraints=CA:FALSE
  keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
  subjectAltName = @alt_names

  [alt_names]
  DNS.1 = localhost
```

9. create a key for localhost
```
  openssl req -new -sha256 -nodes -out server.csr -newkey rsa:2048 -keyout server.key -config <( cat server.csr.cnf )
```

10. and a cert
```
  openssl x509 -req -in server.csr -CA rootCA.pem -CAkey rootCA.key -CAcreateserial -out server.crt -days 500 -sha256 -extfile v3.ext
```

11. mkdir inside project dir and copy the key and cert there
```
  cd ~/web-layers && mkdir certs && mv ~/Desktop/localhost-certs/server.key ~/Desktop/localhost-certs/server.crt ~/web-layers
```
