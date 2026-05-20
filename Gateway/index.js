const express = require('express');
const proxy = require('express-http-proxy');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8084;

const STAKEHOLDERS_URL = process.env.STAKEHOLDERS_URL || 'http://localhost:8080';
const BLOG_URL         = process.env.BLOG_URL         || 'http://localhost:8081';
const TOURS_URL        = process.env.TOURS_URL        || 'http://localhost:8082';
const FOLLOWER_URL     = process.env.FOLLOWER_URL     || 'http://localhost:8083';

app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}));

app.use((req, res, next) => {
  console.log(`[Gateway] ${req.method} ${req.url}`);
  next();
});

function makeProxy(target, pathPrefix) {
  return proxy(target, {
    proxyReqPathResolver: req => {
      const suffix = req.url === '/' ? '' : req.url;
      const resolvedPath = pathPrefix + suffix;
      console.log(`[Gateway] Proxying to ${target}${resolvedPath}`);
      return resolvedPath;
    },
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      if (srcReq.headers['authorization']) {
        proxyReqOpts.headers['Authorization'] = srcReq.headers['authorization'];
      }
      return proxyReqOpts;
    },
    proxyErrorHandler: (err, res, next) => {
      console.error(`[Gateway] Proxy error → ${target}${pathPrefix}: ${err.message}`);
      res.status(502).json({ error: 'Bad Gateway', detail: err.message });
    }
  });
}

app.use('/api/auth',             makeProxy(STAKEHOLDERS_URL, '/api/auth'));
app.use('/api/profile',          makeProxy(STAKEHOLDERS_URL, '/api/profile'));
app.use('/api/users',            makeProxy(STAKEHOLDERS_URL, '/api/users'));
app.use('/api/blogs', (req, res, next) => {
  const suffix = req.url === '/' || req.url === '' ? '/' : req.url;
  return proxy(BLOG_URL, {
    proxyReqPathResolver: () => {
      const path = '/blogs' + suffix;
      console.log(`[Gateway] Proxying to ${BLOG_URL}${path}`);
      return path;
    },
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      if (srcReq.headers['authorization']) {
        proxyReqOpts.headers['Authorization'] = srcReq.headers['authorization'];
      }
      return proxyReqOpts;
    },
    proxyErrorHandler: (err, res, next) => {
      console.error(`[Gateway] Proxy error: ${err.message}`);
      res.status(502).json({ error: 'Bad Gateway' });
    }
  })(req, res, next);
});
app.use('/api/follow',           makeProxy(FOLLOWER_URL,     '/follow'));
app.use('/api/tourist-position', makeProxy(TOURS_URL,        '/api/tourist-position'));
app.use('/api/tours',            makeProxy(TOURS_URL,        '/api/tours'));
app.use('/api/feed',            makeProxy(FOLLOWER_URL, '/feed'));
app.use('/api/recommendations', makeProxy(FOLLOWER_URL, '/recommendations'));
app.use('/api/discover',        makeProxy(FOLLOWER_URL, '/discover'));
app.use('/api/following',       makeProxy(FOLLOWER_URL, '/following'));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'gateway' }));

app.listen(PORT, () => {
  console.log(`[Gateway] running on port ${PORT}`);
  console.log(`  → stakeholders : ${STAKEHOLDERS_URL}`);
  console.log(`  → blog         : ${BLOG_URL}`);
  console.log(`  → tours        : ${TOURS_URL}`);
  console.log(`  → follower     : ${FOLLOWER_URL}`);
});