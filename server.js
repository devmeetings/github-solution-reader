const http = require('http')
const fs = require('fs')
const path = require('path')
const util = require('util')

const port = process.env.PORT || 7010
const allowedExtensions = ['.css', '.js', '.ico', '.html']

exports.startServer = () => {
  const server = http.createServer((req, res) => {
    serve(req, res).catch((e) => {
      console.error(e)
      res.writeHead(500)
      res.end('Internal error')
    })
  }).listen({
    host: 'localhost',
    port
  })

  console.log('Listening on', server.address())
}

async function serve (req, res) {
  let filePath = null
  try {
    filePath = await util.promisify(fs.realpath)(path.normalize('.' + req.url))
  } catch (e) {
    return notFound(res, e)
  }

  console.log('Real path: ', filePath)
  if (!path.dirname(filePath).startsWith(path.dirname(__filename))) {
    return internal(res, 'Invalid path')
  }

  if (allowedExtensions.indexOf(path.extname(filePath)) === -1) {
    return internal(res, 'Invalid path')
  }

  try {
    const file = fs.createReadStream(filePath, 'utf8')
    res.writeHead(200, { 'Content-Type': 'html' })
    file.pipe(res)
  } catch (e) {
    return notFound(res, e)
  }
}

function internal (res, e) {
  res.writeHead(500)
  res.end(e)
}

function notFound (res, e) {
  res.writeHead(404)
  res.end('Not found: ' + e)
}

if (require.main === module) {
  exports.startServer()
}
