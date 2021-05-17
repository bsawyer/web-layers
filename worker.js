addEventListener('fetch', function(event) {
  event.respondWith(handleRequest(event.request))
})
async function handleRequest(request) {
  const url = new URL(request.url)
  let layerUrl = url.searchParams.get("layerUrl");
  if (request.method !== 'GET' || !layerUrl) return MethodNotAllowed(request)
  request = new Request(layerUrl, request)
  request.headers.set("Origin", new URL(layerUrl).origin)
  let response = await fetch(request)

  // Recreate the response so we can modify the headers
  response = new Response(response.body, response)

  // Set CORS headers
  response.headers.set("Access-Control-Allow-Origin", url.origin)

  // Append to/Add Vary header so browser will cache response correctly
  response.headers.append("Vary", "Origin")

  return response
}
function MethodNotAllowed(request) {
  return new Response(`Method ${request.method} not allowed.`, {
    status: 405,
    headers: {
      'Allow': 'GET'
    }
  })
}
