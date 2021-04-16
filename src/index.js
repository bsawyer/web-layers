window.top.sourceTemplate = window.top.sourceTemplate || {};
window.top.proxy = window.top.proxy || new URL(`${window.top.location.origin}/layer`);

function getIframe(){
  const iframe = document.createElement('iframe');
  iframe.setAttribute('hidden', '');
  return iframe;
}

function assignSourceTemplate(element, iframe){
  const template = document.createElement('template');
  const body = document.adoptNode(iframe.contentDocument.body);
  template.content.appendChild(body);
  Array.from(iframe.contentDocument.head.querySelectorAll('style, link[rel="stylesheet"]')).reverse().forEach(style => {
    body.prepend(document.adoptNode(style));
  });
  element.appendChild(template);
  element.sourceTemplate = template;
  iframe.remove();
}

function sourceLayer(element, waitingOnTemplateLayers, preview){
  element.sourced = true;
  element.dispatchEvent(new Event('layerSourced'));
  WebLayer.updateStatus('source', element);
  if(preview){
    const fragment = document.createDocumentFragment();
    getTemplateChildren(element.sourceTemplate).forEach(node => {
      fragment.appendChild(node);
    });
    Array.from(fragment.querySelectorAll('script')).forEach(script => {
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
  if(clone.childNodes[0] && clone.childNodes[0].tagName && clone.childNodes[0].tagName.toUpperCase() === 'BODY'){
    return Array.from(clone.childNodes[0].childNodes);
  }else{
    return Array.from(clone.childNodes);
  }
}

function getRenderIframe(element, templates){
  const body = document.createElement('body');
  templates.forEach(template => {
    getTemplateChildren(template).forEach(node => {
      body.appendChild(node);
    });
  });
  Array.from(body.querySelectorAll('script[type="text/render"]')).forEach(script => {
    script.setAttribute('type', 'text/javascript');
  });
  const iframe = getIframe();
  iframe.setAttribute('srcdoc', body.outerHTML);
  return iframe;
}

function adoptIframeBody(element, iframe){
  iframe.contentWindow.dispatchEvent(new Event('adoptStart'));
  element.shadowRoot.innerHTML = '';
  Array.from(iframe.contentDocument.body.childNodes).forEach(node => {
    if(!node.tagName || node.tagName.toUpperCase() !== 'SCRIPT'){
      element.shadowRoot.appendChild(document.adoptNode(node));
    }
  });
  iframe.contentWindow.dispatchEvent(new Event('adoptComplete'));
}

function isElementType(element, type){
  return element.tagName && element.tagName.toUpperCase() === type.toUpperCase();
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
    const previewSourceTemplate = this.getAttribute('previewSourceTemplate') !== null;
    const showLayerContent = this.getAttribute('showLayerContent') !== null;

    if(showLayerContent){
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
      sourceLayer(this, !!templateLayers.length, previewSourceTemplate);
      return;
    }

    if(template){
      this.sourceTemplate = template;
      if(src && !window.top.sourceTemplate[src]){
        window.top.sourceTemplate[src] = this;
      }
      sourceLayer(this, !!templateLayers.length, previewSourceTemplate);
      return;
    }

    if(src){
      if(window.top.sourceTemplate[src]){
        if(!window.top.sourceTemplate[src].sourced){
          window.top.sourceTemplate[src].addEventListener('layerSourced', ()=>{
            this.sourceTemplate = window.top.sourceTemplate[src].sourceTemplate;
            sourceLayer(this, !!templateLayers.length, previewSourceTemplate);
          }, {once: true});
        }else{
          this.sourceTemplate = window.top.sourceTemplate[src].sourceTemplate;
          sourceLayer(this, !!templateLayers.length, previewSourceTemplate);
        }
      }else{
        window.top.sourceTemplate[src] = this;
        const iframe = getIframe();
        iframe.setAttribute('src', getIframeSource(src));
        this.appendChild(iframe);
        iframe.contentWindow.addEventListener(sourceEventName, () => {
          assignSourceTemplate(this, iframe);
          sourceLayer(this, !!templateLayers.length, previewSourceTemplate);
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

    this.rendered = true;
    this.dispatchEvent(new Event('layerRendered'));

    templateLayerTemplates.unshift(this.sourceTemplate);

    const iframe = getRenderIframe(this, templateLayerTemplates);
    const onload = ()=>{
      adoptIframeBody(this, iframe);
      WebLayer.updateStatus('render', this);
    };
    if(renderEventName === 'load'){
      iframe.onload = onload;
    }
    this.appendChild(iframe);
    if(renderEventName !== 'load'){
      iframe.contentWindow.addEventListener(renderEventName, onload);
    }
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
