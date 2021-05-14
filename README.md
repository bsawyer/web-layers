# Web Layers

Web Layers is an extension of the Web Components suite enabling complete component encapsulation including JavaScript, declarative definition, and a no build environment for the prototyping and development of web apps.

## Use Cases

**Encapsulation**

The ability to compose your application with different frontend frameworks and build requirements.

An online store with

- A navigation element written with React and built with Webpack.
- A static details page written with Web Components.
- A shopping cart application written with Svelte and built with Snowpack.

**Declarative**

something about not having a package.json file and a bunch of imports

**No Build**

Reduce the overhead of build system and configuration requirements by prototyping and developing applications without the need for complex development dependency installation or setup.

Start developing a new application with
- Online sandbox
- Local static server and network tunnel service like [ngrok](https://ngrok.com/)

## Usage

 - **Custom Element**: A web layer is a custom element and can be declaratively defined in HTML or constructed with JavaScript.
 - **Proxy Server**: The proxy server allows cross origin resources to be fetched and managed by one window context, custom resource resolving, and same origin resource caching with service workers.
 - **Prerendering**:

## Custom Element

### Properties

#### `WebLayer.customEvents`

### Attributes

#### `src`

The src attribute is a URL string used to source a layer and its resources. This is achieved by creating a hidden `iframe`, setting the src attribute of the iframe to the value of the src attribute on the layer, proxying if needed, and listening for the [source event](#weblayer-window).

```html
<web-layer src="https://github.io/my-layer/"></web-layer>
```

#### `previewContent`

When present the `previewContent` attribute will slot the layers content in the `WebLayer.shadowRoot`. The `<slot>` element will either be replaced with the sourced result if `previewSource` is present or replaced with the rendered content.

```html
<web-layer previewContent></web-layer>
```

#### `previewSource`

When present the `previewSource` attribute indicates that once the layer is sourced to render the contents in the `WebLayer.shadowRoot`. This content will be replaced with the rendered result.

```html
<web-layer previewSource></web-layer>
```

#### `sharedContext`

The sharedContext attribute prevents the layer from creating a new context window when rendering. All javascript will be evaluated within the current windows context.

> **Note**
>
> `renderAdoptStart` and `renderAdoptComplete` events will not be dispatched on layers with the `sharedContext` attribute.

```html
<web-layer sharedContext></web-layer>
```

#### `extend`

The `extend` attribute will source and merge the target layers template with the parent layer. When there are multiple extending layers, the target layers resources are appended to the parents `<head>` or `<body>` in the same order as they appear in the content.

```html
<web-layer>
  <web-layer extend></web-layer>
</web-layer>
```


#### `template`

The `template` attribute indicates that the web layer will be sourced but not rendered. This is used in prerendering and also allows for presourcing a layer.

```html
<web-layer template></web-layer>
```

#### `sourceEvent`

The `sourceEvent` attribute defines a custom complete event that will be dispatched from the source iframe when it is done.

```html
<web-layer sourceEvent="customSource">
  <template>
    <script>
      setTimeout(() =>
        window.dispatch(new Event('customSource')),
        3000
      )
    </script>
  </template>
</web-layer>
```

### Events

#### Web Layer

Events dispatched on the `WebLayer` element

##### `layerSourced`

Event dispatched on the `WebLayer` element when it has finished sourcing

##### `layerRendered`

Event dispatched on the `WebLayer` element when it has finished rendering

##### `layerPrerendered`

Event dispatched on the `WebLayer` element when it has finished prerendering

#### Web Layer Window

Events dispatched on `WebLayer` iframe windows

##### `sourceStart`

`CustomEvent` dispatched when a source iframe is created and appended to the host. This event is dispatched with a `WebLayerEventDetail` instance as its `CustomEvent.detail`.

##### `renderStart`

`CustomEvent` dispatched when a render iframe is created and appended to the host. This event is dispatched with a `WebLayerEventDetail` instance as its `CustomEvent.detail`.

##### `renderAdoptComplete`

`CustomEvent` dispatched after the render iframes childnodes are adopted into the host layers document and appended to the host layers shadowRoot. This event is dispatched with a `WebLayerEventDetail` instance as its `CustomEvent.detail`.

#### Host Window

Events dispatched on the host window

##### `sourceComplete`
Dispatched when all the `WebLayer` instances have been sourced

##### `renderComplete`

Dispatched when all the `WebLayer` instances have been rendered

##### `prerenderStart`

Dispatched when a prerender has been started.

##### `prerenderComplete`

Dispatched when all the `WebLayer` instances have been prerendered

### Interfaces

#### `WebLayerEventDetail`

The `WebLayerEventDetail` interface exposes the host window and host layer.

##### Properties

`WebLayerEventDetail.window`

A reference to the host window

`WebLayerEventDetail.element`

A reference to the host layer

#### `Proxy`

A writable property that is only assigned in the root host layer. The proxy is a URL string that is used to construct the layers source iframe `src` attribute only when the current `window.location.origin` does not match the layers src origin. To get an instance of it, use the `window.webLayerProxy` property.

#### `TemplateRegistry`

The `TemplateRegistry` is responsible for managing each layers source templates. It is a map of layer source URLs and their source node instances. To get an instance of it, use the `window.webLayerTemplateRegistry` property.

#### `CustomEventRegistry`

The `CustomEventRegistry` interface provides methods for registering and querying custom events. An instance of it will be passed as the event detail for `sourceStart` and `renderStart` events. It can also be accessed from the `WebLayer.customEvents` property.

##### Methods

`customEvents.get(event)`
Returns the event name for the custom event.

`customEvents.define(event, customName)`
Defines a new custom event.

`customEvents.update(event, customName, options = {adopt: false})`
Update a new custom event. Optionally adopt to new listeners.

> **Note**
>
> Calling update will cancel any current event listeners for that event and optionally add them as listeners to the new event name.

##### Examples

TBD

The default events for each lifecycle are:
- **source:**
`DOMContentLoaded`

- **render:**
`load`

- **prerender:**
`renderComplete`

### Lifecycle

- construct
- connect
- attribute change
  - source
  - render
- prerender

## CLI

Prerenders the target URL and prints the prerendered html to the console

```bash
~ npx web-layers prerender https://localhost:9000/layer/https%3A%2F%2Flocalhost%3A8080%2Fexamples%2Ftest
```

Optionaly write the output to a file

```bash
~ npx web-layers prerender https://localhost:9000/examples/test > index.html
```

Start a local proxy server

```bash
~ npx web-layers proxy

```

## Development

1. install deps
```bash
~ npm i
```

2. get HTTPS working for localhost see
[HTTPS for localhost](###-HTTPS-for-Localhost)

### Custom Element

1. run static server
```bash
~ node static.js
```

2. view an example e.g. https://localhost:8080/examples/nested.html

### Proxy Server

1. run proxy server
```bash
~ node index.mjs
```

2. view an example
```
https://localhost:9000/layer/https%3A%2F%2Flocalhost%3A8080%2Fexamples%2Fperformance.html
```
