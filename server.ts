import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  const noCacheHtml = (res: express.Response): void => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  };

  // Serve static files from /browser (HTML documents must never be cached)
  server.get('**', express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        noCacheHtml(res);
      }
    },
  }));

  // Rutas protegidas que dependen de autenticación en navegador (localStorage) usan shell CSR puro
  const csrOnlyPrefixes = ['/dashboard', '/admin', '/scout', '/auth/complete-profile'];
  const csrIndexHtml = join(browserDistFolder, 'index.csr.html');

  // All regular routes use the Angular engine
  server.get('**', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers, path } = req;

    if (csrOnlyPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      noCacheHtml(res);
      res.sendFile(csrIndexHtml);
      return;
    }

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => {
        noCacheHtml(res);
        res.send(html);
      })
      .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();
