const express = require('express');
const proxy = require('express-http-proxy');
const cors = require('cors');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8084;

const STAKEHOLDERS_URL    = process.env.STAKEHOLDERS_URL    || 'http://localhost:8080';
const BLOG_URL            = process.env.BLOG_URL            || 'http://localhost:8081';
const TOURS_URL           = process.env.TOURS_URL           || 'http://localhost:8082';
const FOLLOWER_URL        = process.env.FOLLOWER_URL        || 'http://localhost:8083';
const TOURS_GRPC_ADDRESS  = process.env.TOURS_GRPC_ADDRESS  || 'localhost:9091';

// Load tour.proto for gRPC CreateTour call
const PROTO_PATH = path.join(__dirname, 'proto', 'tour.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const tourProto = grpc.loadPackageDefinition(packageDef).tour;

function createTourGrpcClient() {
  return new tourProto.TourService(
    TOURS_GRPC_ADDRESS,
    grpc.credentials.createInsecure()
  );
}

app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}));

app.use((req, res, next) => {
  console.log(`[Gateway] ${req.method} ${req.url}`);
  next();
});

// Intercept POST /api/tours — route via gRPC to Tours service
app.post('/api/tours', express.json(), (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const body = req.body || {};

  // Extract user id from JWT payload (base64 decode middle segment)
  let authorId = 0;
  try {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    authorId = parseInt(payload.user_id || payload.userId || payload.sub || '0', 10);
  } catch (_) {}

  const grpcReq = {
    name: body.name || '',
    description: body.description || '',
    difficulty: body.difficulty || 'EASY',
    tags: body.tags || [],
    author_id: authorId,
  };

  const client = createTourGrpcClient();
  const metadata = new grpc.Metadata();
  if (authHeader) {
    metadata.set('authorization', authHeader);
  }

  client.CreateTour(grpcReq, metadata, (err, response) => {
    client.close();
    if (err) {
      console.error('[Gateway] gRPC CreateTour error:', err.message);
      return res.status(502).json({ error: 'gRPC call failed', detail: err.message });
    }
    res.status(201).json(response);
  });
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
      if (res.headersSent) {
        return next(err);
      }
      res.status(502).json({ error: 'Bad Gateway', detail: err.message });
    }
  });
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function makeFetchProxy(target) {
  return async (req, res) => {
    try {
      const url = new URL(req.originalUrl, target);
      console.log(`[Gateway] Fetch proxying to ${url.toString()}`);

      const headers = { ...req.headers };
      delete headers.host;
      delete headers.connection;
      delete headers['content-length'];
      delete headers['transfer-encoding'];
      delete headers['accept-encoding'];
      delete headers.expect;

      const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
      const body = hasBody ? await readRequestBody(req) : undefined;

      const upstream = await fetch(url, {
        method: req.method,
        headers,
        body,
      });

      upstream.headers.forEach((value, key) => {
        if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });

      const responseBody = Buffer.from(await upstream.arrayBuffer());
      res.status(upstream.status).send(responseBody);
    } catch (err) {
      console.error(`[Gateway] Fetch proxy error -> ${target}: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Bad Gateway', detail: err.message });
      }
    }
  };
}

app.use('/api/auth',             makeFetchProxy(STAKEHOLDERS_URL));
app.use('/api/profile',          makeFetchProxy(STAKEHOLDERS_URL));
app.use('/api/users',            makeFetchProxy(STAKEHOLDERS_URL));
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
      if (res.headersSent) {
        return next(err);
      }
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
  console.log(`  → tours        : ${TOURS_URL} (gRPC CreateTour → ${TOURS_GRPC_ADDRESS})`);
  console.log(`  → follower     : ${FOLLOWER_URL}`);
});
