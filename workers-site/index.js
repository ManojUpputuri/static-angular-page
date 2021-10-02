import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler'

/**
 * The DEBUG flag will do two things that help during development:
 * 1. we will skip caching on the edge, which makes it easier to
 *    debug.
 * 2. we will return an error message on exception in your Response rather
 *    than the default 404.html page.
 */
const DEBUG = false

const BASIC_USER = 'admin'
const BASIC_PASS = 'admin'

addEventListener('fetch', event => {
  try {
    event.respondWith(handleEvent(event))
  } catch (e) {
    if (DEBUG) {
      return event.respondWith(
        new Response(e.message || e.toString(), {
          status: 500,
        }),
      )
    }
    event.respondWith(new Response('Internal Error', { status: 500 }))
  }
})

async function handleEvent(event) {
  const url = new URL(event.request.url)
  let options = {}

  /**
   * You can add custom logic to how we fetch your assets
   * by configuring the function `mapRequestToAsset`
   */
  // options.mapRequestToAsset = handlePrefix(/^\/docs/)
  options.mapRequestToAsset = (req) => {


    req = mapRequestToAsset(req);


    if (req.url.endsWith("/index.html")) {


      return new Request(`${new URL(req.url).origin}/index.html`, req);

    } else {

      return req;

    }

  };

  try {
    if (DEBUG) {
      // customize caching
      options.cacheControl = {
        bypassCache: true,
      };
    }
    const { protocol, pathname } = new URL(event.request.url)

    switch (pathname) {
      case '/':
        const page = await getAssetFromKV(event, options);

        // allow headers to be altered
        const response = new Response(page.body, page);

        response.headers.set("X-XSS-Protection", "1; mode=block");
        response.headers.set("X-Content-Type-Options", "nosniff");
        response.headers.set("X-Frame-Options", "DENY");
        response.headers.set("Referrer-Policy", "unsafe-url");
        response.headers.set("Feature-Policy", "none");

        return response;
      case '/home':
        return new Response('Anyone can access the homepage.')

      case '/logout':
        // Invalidate the "Authorization" header by returning a HTTP 401.
        // We do not send a "WWW-Authenticate" header, as this would trigger
        // a popup in the browser, immediately asking for credentials again.
        return new Response('Logged out.', { status: 401 })

      case '/admin': {
        // The "Authorization" header is sent when authenticated.
        if (event.request.headers.has('Authorization')) {
          // Throws exception when authorization fails.
          const { user, pass } = basicAuthentication(event.request)
          verifyCredentials(user, pass)

          // Only returns this response when no exception is thrown.
          return new Response('You have private access.', {
            status: 200,
            headers: {
              'Cache-Control': 'no-store'
            }
          })
        }

        // Not authenticated.
        return new Response('You need to login.', {
          status: 401,
          headers: {
            // Prompts the user for credentials.
            'WWW-Authenticate': 'Basic realm="my scope", charset="UTF-8"'
          }
        })
      }

      case '/favicon.ico':
      case '/robots.txt':
        return new Response(null, { status: 204 })
    }

    // return new Response('Not Found.', { status: 404 })
    const page = await getAssetFromKV(event, options);

    // allow headers to be altered
    const response = new Response(page.body, page);

    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "unsafe-url");
    response.headers.set("Feature-Policy", "none");

    return response;

  } catch (e) {
    // if an error is thrown try to serve the asset at 404.html
    if (!DEBUG) {
      try {
        let notFoundResponse = await getAssetFromKV(event, {

          mapRequestToAsset: (req) =>

            new Request(`${new URL(req.url).origin}/index.html`, req),

        })

        return new Response(notFoundResponse.body, { ...notFoundResponse, status: 404 })
      } catch (e) { }
    }

    return new Response(e.message || e.toString(), { status: 500 })
  }
}

/**
 * Here's one example of how to modify a request to
 * remove a specific prefix, in this case `/docs` from
 * the url. This can be useful if you are deploying to a
 * route on a zone, or if you only want your static content
 * to exist at a specific path.
 */
function handlePrefix(prefix) {
  return request => {
    // compute the default (e.g. / -> index.html)
    let defaultAssetKey = mapRequestToAsset(request)
    let url = new URL(defaultAssetKey.url)

    // strip the prefix from the path for lookup
    url.pathname = url.pathname.replace(prefix, '/')

    // inherit all other props from the default request
    return new Request(url.toString(), defaultAssetKey)
  }
}
function verifyCredentials(user, pass) {
  if (BASIC_USER !== user) {
    throw new UnauthorizedException('Invalid username.')
  }

  if (BASIC_PASS !== pass) {
    throw new UnauthorizedException('Invalid password.')
  }
}
/**
 * Parse HTTP Basic Authorization value.
 * @param {Request} request
 * @throws {BadRequestException}
 * @returns {{ user: string, pass: string }}
 */
function basicAuthentication(request) {
  const Authorization = request.headers.get('Authorization')

  const [scheme, encoded] = Authorization.split(' ')

  // The Authorization header must start with "Basic", followed by a space.
  if (!encoded || scheme !== 'Basic') {
    throw new BadRequestException('Malformed authorization header.')
  }

  // Decodes the base64 value and performs unicode normalization.
  // @see https://datatracker.ietf.org/doc/html/rfc7613#section-3.3.2 (and #section-4.2.2)
  // @see https://dev.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String/normalize
  const decoded = atob(encoded).normalize()

  // The username & password are split by the first colon.
  //=> example: "username:password"
  const index = decoded.indexOf(':')

  // The user & password are split by the first colon and MUST NOT contain control characters.
  // @see https://tools.ietf.org/html/rfc5234#appendix-B.1 (=> "CTL = %x00-1F / %x7F")
  if (index === -1 || /[\0-\x1F\x7F]/.test(decoded)) {
    throw new BadRequestException('Invalid authorization value.')
  }

  return {
    user: decoded.substring(0, index),
    pass: decoded.substring(index + 1),
  }
}

function UnauthorizedException(reason) {
  this.status = 401
  this.statusText = 'Unauthorized'
  this.reason = reason
}

function BadRequestException(reason) {
  this.status = 400
  this.statusText = 'Bad Request'
  this.reason = reason
}