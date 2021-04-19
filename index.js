window.top.sourceTemplate = window.top.sourceTemplate || {};
window.top.proxy = window.top.proxy || new URL(`${window.top.location.origin}/layer`);

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

function sourceLayer(element, waitingOnTemplateLayers, preview){
  element.sourced = true;
  element.dispatchEvent(new Event('layerSourced'));
  WebLayer.updateStatus('source', element);
  if(preview){
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
  if(!waitingOnTemplateLayers && !element.rendered){
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

function getRenderIframe(element, templates){
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

function isElementType(element, type){
  return element && element.tagName && element.tagName.toUpperCase() === type.toUpperCase();
}

function getTemplateLayers(element){
  return Array.from(element.children).filter(child => isElementType(child, 'web-layer') && child.getAttribute('template') !== null);
}

function getIframeSource(src){
  src = new URL(src);
  return src.origin !== window.location.origin ? `${window.top.proxy}/${encodeURIComponent(src)}` : src.toString();
}

class WebLayer extends HTMLElement {
  constructor() {
    super();
    this.sourced = false;
    this.rendered = false;
    this.attachShadow({mode: 'open'});
  }

  source(){
    const template = Array.from(this.children).find(child => child instanceof HTMLTemplateElement);
    const templateLayers = getTemplateLayers(this);
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

    if(templateLayers.length){
      templateLayers.forEach(layer => {
        layer.addEventListener('layerSourced', () => {
          templateLayers.splice(templateLayers.indexOf(layer), 1);
          if(!templateLayers.length && this.sourced){
            this.render();
          }
        }, {once:true});
      });
    }

    if(!src && !template){
      this.sourceTemplate = document.createElement('template');
      this.appendChild(this.sourceTemplate);
      this.sourceTemplate.content.appendChild(document.createElement('slot'));
      sourceLayer(this, !!templateLayers.length, previewSource);
      return;
    }

    if(template){
      this.sourceTemplate = template;
      if(src && !window.top.sourceTemplate[src]){
        window.top.sourceTemplate[src] = this;
      }
      sourceLayer(this, !!templateLayers.length, previewSource);
      return;
    }

    if(src){
      if(window.top.sourceTemplate[src]){
        if(!window.top.sourceTemplate[src].sourced){
          window.top.sourceTemplate[src].addEventListener('layerSourced', ()=>{
            this.sourceTemplate = window.top.sourceTemplate[src].sourceTemplate;
            sourceLayer(this, !!templateLayers.length, previewSource);
          }, {once: true});
        }else{
          this.sourceTemplate = window.top.sourceTemplate[src].sourceTemplate;
          sourceLayer(this, !!templateLayers.length, previewSource);
        }
      }else{
        window.top.sourceTemplate[src] = this;
        const iframe = getIframe();
        iframe.setAttribute('src', getIframeSource(src));
        this.appendChild(iframe);
        iframe.contentWindow.addEventListener(sourceEventName, () => {
          assignSourceTemplate(this, iframe);
          sourceLayer(this, !!templateLayers.length, previewSource);
        });
      }
    }
  }

  render(){
    const templateLayerTemplates = getTemplateLayers(this).map(layer => layer.sourceTemplate);
    const isTemplate = this.getAttribute('template') !== null;
    const renderEventName = this.getAttribute('renderEvent') || 'load';

    if(isTemplate){
      this.rendered = true;
      this.dispatchEvent(new Event('layerRendered'));
      return;
    }

    if(WebLayer.renderStatus !== 'complete'){
      WebLayer.renderQueue.push(this);
      WebLayer.renderStatus = 'queued';
    }

    templateLayerTemplates.unshift(this.sourceTemplate);

    const iframe = getRenderIframe(this, templateLayerTemplates);

    batch(() => {
      const onload = ()=>{
        adoptIframeBody(this, iframe);
        this.rendered = true;
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

  connectedCallback(){
    if(!this.sourced){
      this.source();
    }
  }

  attributeChangedCallback(name, oldValue, newValue){
    if(name === 'src' && oldValue !== newValue && this.isConnected){
      this.sourced = false;
      this.rendered = false;
      this.source();
    }
  }
}

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
