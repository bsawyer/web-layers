function createBatch(max = 10){
  const queue = [];
  let listening;
  let t;

  return function batch(fn){
    const next = ()=>{
      let i = 0;
      while(queue.length && i < max){
        queue.shift()();
        i++;
      }
      if(queue.length){
        t = setTimeout(next);
      }else{
        t = null;
      }
    };
    if(document.readyState === 'complete'){
      queue.push(fn);
      if(!t){
        t = setTimeout(next);
      }
      return;
    }
    if(!listening){
      listening = true;
      window.addEventListener('load', ()=>{
        next();
        listening = false;
      }, {once: true});
    }
    queue.push(fn);
  };
}

const batch = createBatch();

function getIframe(){
  const iframe = document.createElement('iframe');
  iframe.setAttribute('hidden', '');
  return iframe;
}

function assignSourceTemplate(element, iframe){
  iframe.contentWindow.dispatchEvent(new CustomEvent('sourceAdoptStart', {detail:{element, window}}));
  const template = document.createElement('template');
  const head = document.adoptNode(iframe.contentDocument.head);
  const body = document.adoptNode(iframe.contentDocument.body);
  const layerHead = document.createElement('wl-head');
  const layerBody = document.createElement('wl-body');
  template.content.appendChild(layerHead);
  template.content.appendChild(layerBody);
  Array.from(head.querySelectorAll('style, link[rel="stylesheet"], script'))
    .forEach(resource => {
      layerHead.appendChild(resource);
    });
  Array.from(body.childNodes)
    .forEach(node => {
      layerBody.appendChild(node);
    });
  element.appendChild(template);
  element.sourceTemplate = template;
  iframe.contentWindow.dispatchEvent(new CustomEvent('sourceAdoptComplete', {detail:{element, window}}));
  iframe.remove();
}

function sourceLayer({
  element,
  template,
  waitingOnTemplateLayers,
  previewSource
}){
  element.sourceTemplate = template;
  element.isSourced = true;
  element.dispatchEvent(new Event('layerSourced'));
  WebLayer.updateStatus('source', element);
  if(previewSource){
    const fragment = document.createDocumentFragment();
    const nodes = getTemplateChildren(element.sourceTemplate);
    nodes.head.forEach(n => fragment.appendChild(n));
    nodes.body.forEach(n => fragment.appendChild(n));
    Array.from(fragment.querySelectorAll('script'))
      .forEach(script => {
        script.remove();
      });
    element.shadowRoot.innerHTML = '';
    element.shadowRoot.appendChild(fragment);
  }
  if(!waitingOnTemplateLayers && !element.isRendered){
    element.render();
  }
}

function getTemplateChildren(template){
  const clone = template.content.cloneNode(true);
  if(isElementType(clone.childNodes[0], 'wl-head')){
    return {
      head: Array.from(clone.childNodes[0].childNodes),
      body: Array.from(clone.childNodes[1].childNodes)
    };
  }
  return {
    head: [],
    body: Array.from(clone.childNodes)
  };
}

function getRenderDocument(templates){
  const html = document.createElement('html');
  const head = document.createElement('head');
  const body = document.createElement('body');
  html.appendChild(head);
  html.appendChild(body);
  templates.forEach(template => {
    const nodes = getTemplateChildren(template);
    nodes.head.forEach(n => head.appendChild(n));
    nodes.body.forEach(n => body.appendChild(n));
  });
  Array.from(html.querySelectorAll('script[type="text/render"]'))
    .forEach(script => {
      script.setAttribute('type', 'text/javascript');
    });
  return html;
}

function getRenderIframe(element, templates){
  const html = getRenderDocument(templates);
  const iframe = getIframe();
  // iframe.setAttribute('srcdoc', html.outerHTML);
  // iframe.setAttribute('src', `data:text/html;base64,${btoa(html.outerHTML)}`)
  const blob = new Blob([html.outerHTML], {type: 'text/html'});
  iframe.setAttribute('src', window.URL.createObjectURL(blob));
  return iframe;
}

function adoptChildNodes(target, element){
  Array.from(target.childNodes)
    .forEach(node => {
      if(!isElementType(node, 'script')){
        element.shadowRoot.appendChild(document.adoptNode(node));
      }
    });
}

function adoptIframeBody(element, iframe){
  iframe.contentWindow.dispatchEvent(new CustomEvent('renderAdoptStart', {detail:{element, window}}));
  requestAnimationFrame(()=>{
    element.shadowRoot.innerHTML = '';
    adoptChildNodes(iframe.contentDocument.head, element);
    adoptChildNodes(iframe.contentDocument.body, element);
    iframe.contentWindow.dispatchEvent(new CustomEvent('renderAdoptComplete', {detail:{element, window}}));
  });
}

function appendChildNodes(target, element){
  Array.from(target.childNodes)
    .forEach(node => {
      element.shadowRoot.appendChild(document.adoptNode(node));
    });
}

function appendDocument(element, document){
  requestAnimationFrame(()=>{
    element.shadowRoot.innerHTML = '';
    appendChildNodes(document.children[0], element);
    appendChildNodes(document.children[1], element);
  });
}

function isElementType(element, type){
  return element && element.tagName && element.tagName.toUpperCase() === type.toUpperCase();
}

function getExtendLayers(element){
  return Array.from(element.children).filter(child => child.getAttribute('extend') !== null);
}

function getIframeSource(src){
  src = new URL(src);
  return src.origin !== window.location.origin ? `${window.top.proxy}/${encodeURIComponent(src)}` : src.toString();
}

class WebLayer extends HTMLElement {
  constructor() {
    super();
    this.isSourced = false;
    this.isRendered = false;
    this.attachShadow({mode: 'open'});
  }

  connectedCallback(){
    if(!this.isSourced && this.isConnected){
      this.source();
    }
  }

  attributeChangedCallback(name, oldValue, newValue){
    if(name === 'src' && oldValue !== newValue && this.isConnected){
      this.isSourced = false;
      this.isRendered = false;
      this.source();
    }
  }

  source(){
    const template = Array.from(this.children).find(child => child instanceof HTMLTemplateElement);
    const extendLayers = getExtendLayers(this);
    const sourceEventName = this.getAttribute('sourceEvent') || 'DOMContentLoaded';
    const src = this.getAttribute('src');
    const previewSource = this.getAttribute('previewSource') !== null;
    const previewContent = this.getAttribute('previewContent') !== null;

    if(previewContent){
      this.shadowRoot.innerHTML = '';
      this.shadowRoot.appendChild(document.createElement('slot'));
    }

    if(WebLayer.sourceStatus !== 'complete'){
      WebLayer.sourceQueue.push(this);
      WebLayer.sourceStatus = 'queued';
    }

    if(extendLayers.length){
      extendLayers.forEach(layer => {
        layer.addEventListener('layerSourced', () => {
          extendLayers.splice(extendLayers.indexOf(layer), 1);
          if(!extendLayers.length && this.isSourced){
            this.render();
          }
        }, {once:true});
      });
    }

    if(!src && !template){
      const anonymousTemplate = document.createElement('template');
      anonymousTemplate.content.appendChild(document.createElement('slot'));
      this.appendChild(anonymousTemplate);
      sourceLayer({
        element: this,
        template: anonymousTemplate,
        waitingOnTemplateLayers: !!extendLayers.length,
        previewSource
      });
      return;
    }

    if(template){
      if(src && !WebLayer.TemplateRegsitry.get(src)){
        WebLayer.TemplateRegsitry.define(src, this);
      }
      sourceLayer({
        element: this,
        template,
        waitingOnTemplateLayers: !!extendLayers.length,
        previewSource
      });
      return;
    }

    if(src){
      const existingTemplate = WebLayer.TemplateRegsitry.get(src);
      if(existingTemplate){
        if(!existingTemplate.isSourced){
          existingTemplate.addEventListener('layerSourced', ()=>{
            sourceLayer({
              element: this,
              template: existingTemplate.sourceTemplate,
              waitingOnTemplateLayers: !!extendLayers.length,
              previewSource
            });
          }, {once: true});
        }else{
          sourceLayer({
            element: this,
            template: existingTemplate.sourceTemplate,
            waitingOnTemplateLayers: !!extendLayers.length,
            previewSource
          });
        }
      }else{
        const prerenderedTemplate = document.querySelector(`[src="${src}"]>template`);
        if(prerenderedTemplate){
          WebLayer.TemplateRegsitry.define(src, prerenderedTemplate.parentNode);
          prerenderedTemplate.parentNode.addEventListener('layerSourced', () => {
            sourceLayer({
              element: this,
              template: prerenderedTemplate.sourceTemplate,
              waitingOnTemplateLayers: !!extendLayers.length,
              previewSource
            });
          }, {once: true});
        }else{
          WebLayer.TemplateRegsitry.define(src, this);
          const iframe = getIframe();
          iframe.setAttribute('src', getIframeSource(src));
          this.appendChild(iframe);
          iframe.contentWindow.addEventListener(sourceEventName, () => {
            assignSourceTemplate(this, iframe);
            sourceLayer({
              element: this,
              template: this.sourceTemplate,
              waitingOnTemplateLayers: !!extendLayers.length,
              previewSource
            });
          });
        }
      }
    }
  }

  render(){
    const isTemplate = this.getAttribute('template') !== null;
    if(isTemplate){
      return;
    }
    const templateLayerTemplates = Array.from(this.children)
      .filter(child => child.getAttribute('extend') !== null || child instanceof HTMLTemplateElement)
      .map(child => child.sourceTemplate || child);
    const isExtend = this.getAttribute('extend') !== null;
    const hasTemplate = !!Array.from(this.children).find(child => child instanceof HTMLTemplateElement);
    const renderEventName = this.getAttribute('renderEvent') || 'load';
    const sharedContext = this.getAttribute('sharedContext') !== null;

    if(isExtend){
      this.isRendered = true;
      this.dispatchEvent(new Event('layerRendered'));
      return;
    }

    if(WebLayer.renderStatus !== 'complete'){
      WebLayer.renderQueue.push(this);
      WebLayer.renderStatus = 'queued';
    }

    if(!hasTemplate){
      templateLayerTemplates.unshift(this.sourceTemplate);
    }

    if(sharedContext){
      appendDocument(this, getRenderDocument(templateLayerTemplates));
      this.isRendered = true;
      this.dispatchEvent(new Event('layerRendered'));
      WebLayer.updateStatus('render', this);
      return;
    }

    const iframe = getRenderIframe(this, templateLayerTemplates);

    batch(() => {
      const onload = ()=>{
        adoptIframeBody(this, iframe);
        this.isRendered = true;
        this.dispatchEvent(new Event('layerRendered'));
        WebLayer.updateStatus('render', this);
      };
      if(renderEventName === 'load'){
        iframe.onload = onload;
      }
      this.appendChild(iframe);
      if(renderEventName !== 'load'){
        iframe.contentWindow.addEventListener(renderEventName, onload);
      }
    });
  }
}
WebLayer.TemplateRegsitry = {
  get(src){
    return WebLayer.TemplateRegsitry.templates[src];
  },
  define(src, element){
    if(!element instanceof WebLayer){
      throw new Error(`Invalid element`)
    }
    if(WebLayer.TemplateRegsitry.templates[src]){
      throw new Error(`Template exists`)
    }
    WebLayer.TemplateRegsitry.templates[src] = element;
  }
};
function templateRegistryClosure(){
  const templates = {};
  return {
    get(){
      if(window.top === window){
        return templates;
      }
      return window.top.customElements.get('web-layer').TemplateRegsitry.templates;
    },
    set(){
      //
    }
  };
}
function proxyClosure(){
  let localProxy = new URL(`${window.top.location.origin}/layer`);
  return {
    get(){
      if(window.top === window){
        return localProxy;
      }
      return window.top.customElements.get('web-layer').proxy;
    },
    set(value){
      localProxy = new URL(value);
    }
  };
}
Object.defineProperty(WebLayer.TemplateRegsitry, 'templates', templateRegistryClosure())
Object.defineProperty(WebLayer, 'proxy', proxyClosure())
WebLayer.sourceStatus = 'pending'; // pending, queued, complete
WebLayer.sourceQueue = [];
WebLayer.renderStatus = 'pending'; // pending, queued, complete
WebLayer.renderQueue = [];
WebLayer.updateStatus = function(status, element){
  if(WebLayer[`${status}Queue`].includes(element)){
    WebLayer[`${status}Queue`].splice(WebLayer[`${status}Queue`].indexOf(element), 1);

    if(!WebLayer[`${status}Queue`].length){
      WebLayer[`${status}Status`] = 'complete';
      window.dispatchEvent(new CustomEvent(`${status}Complete`));
    }
  }
};

if(!customElements.get('web-layer')){
  customElements.define('web-layer', WebLayer);
}
