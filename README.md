# Web Layers

## Custom Element

### Properties

#### `WebLayer.proxy`
A writable property that is only assigned on the top host layer. The proxy is a URL string that is used to construct the layers source iframe `src` attribute value only when the current `window.location.origin` does not match the layers src origin.

#### `WebLayer.TemplateRegistry`

The `TemplateRegistry` is responsible for managing each layers source templates. It is a map of layer source URLs and their source node instances.

### Attributes

#### `src`

The src attribute is a URL string used to source a layer and its resources. This is achieved by creating a hidden `iframe`, setting the src attribute of the iframe to the value of the src attribute on the layer, proxying if needed, and listening for the [source event](#weblayer-window).

```
<web-layer src="https://github.io/my-layer"></web-layer>
```

#### `previewContent`

When present the `previewContent` attribute will slot the layers content in the `WebLayer.shadowRoot`. The `<slot>` element will either be replaced with the sourced result if `previewSource` is present or replaced with the rendered content.

```
<web-layer previewContent></web-layer>
```

#### `previewSource`

When present the `previewSource` attribute indicates that once the layer is sourced to render the contents in the `WebLayer.shadowRoot`. This content will be replaced with the rendered result.

```
<web-layer previewSource></web-layer>
```

#### `sharedContext`

The sharedContext attribute prevents the layer from creating a new context window when rendering. All javascript will be evaluated within the current windows context.

> **Note**
>
> `renderAdoptStart` and `renderAdoptComplete` events will not be dispatched on layers with the `sharedContext` attribute.

```
<web-layer sharedContext></web-layer>
```

#### `extend`

The `extend` attribute will source and merge the target layers template with the parent layer. When there are multiple extending layers, the target layers resources are appended to the parents `<head>` or `<body>` in the same order as they appear in the content.

```
<web-layer>
  <web-layer extend></web-layer>
</web-layer>
```


#### `template`

The `template` attribute indicates that the web layer will be sourced but not rendered. This is used in prerendering and also allows for presourcing a layer.

```
<web-layer template></web-layer>
```

### Events

#### WebLayer
Events dispatched on the `WebLayer` element

##### `layerSourced`
Event dispatched on the `WebLayer` element when it has finished sourcing

##### `layerRendered`
Event dispatched on the `WebLayer` element when it has finished rendering

##### `layerPrerendered`
Event dispatched on the `WebLayer` element when it has finished prerendering

#### WebLayer Window
Events dispatched on `WebLayer` iframe windows

##### `sourceAdoptStart`

`CustomEvent` dispatched before the source iframes childnodes are adopted into the host layers document and appended to the host layers template. This event is dispatched with a detail payload of:
```
const {
  element, // a reference to the host `WebLayer` node
  window // a reference to the host window
} = event;
```

**sourceAdoptComplete**

`CustomEvent` dispatched after the source iframes childnodes are adopted into the host layers document and appended to the host layers template. This event is dispatched with a detail payload of:
```
const {
  element, // a reference to the host `WebLayer` node
  window // a reference to the host window
} = event;
```

**renderAdoptStart**

`CustomEvent` dispatched before the render iframes childnodes are adopted into the host layers document and appended to the host layers shadowRoot. This event is dispatched with a detail payload of:
```
const {
  element, // a reference to the host `WebLayer` node
  window // a reference to the host window
} = event;
```

**renderAdoptComplete**

`CustomEvent` dispatched after the render iframes childnodes are adopted into the host layers document and appended to the host layers shadowRoot. This event is dispatched with a detail payload of:
```
const {
  element, // a reference to the host `WebLayer` node
  window // a reference to the host window
} = event;
```

**layerLifecycle**

`CustomEvent` dispatched as a source, render, or prerender lifecycle event with a detail payload of:
```
const {
  lifecycle, // the current lifecycle event, one of source, render or prerender
  defineCustomCompleteEvent // a function that takes a string parameter defining a custom event to listen for when the layers lifecycle is complete
} = event;
```
> **Note**
>
> Ensure the `CustomCompleteEvent` is dispatched *after* calling `defineCustomCompleteEvent()`

The default events for each lifecycle are:
- **source:**
`DOMContentLoaded`

- **render:**
`load`

- **prerender:**
`renderComplete`

#### Host Window
Events dispatched on the host window

**sourceComplete**

Dispatched when all the `WebLayer` instances have been sourced

**renderComplete**

Dispatched when all the `WebLayer` instances have been rendered

**prerenderComplete**

Dispatched when all the `WebLayer` instances have been prerendered

### Lifecycle
- construct
- connect
- attribute change
  - source
  - render
- prerender

## Proxy Server

Exports a default express server
```
import server from 'web-layers';

server.listen(9000);
```

Optionally run the dev proxy
```
npx web-layers proxy
```

## CLI

```
npx web-layers prerender https://localhost:9000/layer/https%3A%2F%2Flocalhost%3A8080%2Fexamples%2Ftest
```

Prints the prerendered html to the console

```
npx web-layers prerender https://localhost:9000/examples/test > index.html
```

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
2. view an example
```
https://localhost:9000/layer/https%3A%2F%2Flocalhost%3A8080%2Fexamples%2Fperformance.html
```


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
