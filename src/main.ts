/**
 * `MvcShowcaseAppInitializer`, as a program rather than as a class the servlet
 * container discovers.
 *
 * Everything the container did lives in {@link ServletContainer}; this file is
 * only the adapter onto `node:http` and the two settings Jetty took from the
 * war: the context path it deploys under and the port it listens on.
 */

import { createServer, type IncomingMessage, type Server } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ServletContainer } from './framework/web/ServletContainer.js';
import { conversionService, webMvcConfig } from './config/WebMvcConfig.js';
import { csrfFilter } from './config/RootConfig.js';
import { VIEWS } from './webapp/views/index.js';

/** Jetty deploys the war under its artifact id, which the pages link against. */
export const CONTEXT_PATH = process.env['CONTEXT_PATH'] ?? '/spring-mvc-showcase';
const PORT = Number.parseInt(process.env['PORT'] ?? '8080', 10);

export function newContainer(contextPath = CONTEXT_PATH): ServletContainer {
  return new ServletContainer({
    contextPath,
    resourceRoots: [resolve('public/resources'), resolve('vendor')],
    dispatcher: webMvcConfig(),
    conversionService: conversionService(),
    csrf: csrfFilter(),
    views: VIEWS,
  });
}

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

/** Wraps the container in an HTTP server without starting it listening. */
export function createApplication(container = newContainer()): Server {
  return createServer((incoming, outgoing) => {
    void (async () => {
      const answer = await container.service({
        method: incoming.method ?? 'GET',
        url: incoming.url ?? '/',
        headers: incoming.headers,
        body: await readBody(incoming),
      });
      for (const [name, value] of answer.headers) {
        outgoing.setHeader(name, value);
      }
      outgoing.writeHead(answer.status);
      outgoing.end(answer.body);
    })().catch((error: unknown) => {
      outgoing.writeHead(500, { 'Content-Type': 'text/plain' });
      outgoing.end(error instanceof Error ? error.stack : String(error));
    });
  });
}

export function start(port = PORT): Server {
  const server = createApplication();
  return server.listen(port, () => {
    const bound = server.address();
    const actual = typeof bound === 'object' && bound !== null ? bound.port : port;
    process.stdout.write(`Started on http://localhost:${String(actual)}${CONTEXT_PATH}/\n`);
  });
}

// Run as a program; imported by a test, it starts nothing on its own.
if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  start();
}
