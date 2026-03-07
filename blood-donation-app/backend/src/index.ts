import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { config } from './config.js';
import { connectDb } from './db.js';
import usersRouter from './routes/users.js';
import hospitalsRouter from './routes/hospitals.js';
import requestsRouter from './routes/requests.js';
import donationsRouter from './routes/donations.js';

async function main() {
  await connectDb();

  const app = express();
  const httpServer = createServer(app);

  const io = new SocketServer(httpServer, {
    cors: { origin: config.corsOrigin },
  });

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  app.use('/api/users', usersRouter);
  app.use('/api/hospitals', hospitalsRouter);
  app.use('/api/requests', requestsRouter);
  app.use('/api/donations', donationsRouter);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // Attach io to req for use in routes if we add real-time notifications later
  app.set('io', io);

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId as string | undefined;
    if (userId) socket.join(`user:${userId}`);
  });

  httpServer.listen(config.port, () => {
    console.log(`Server listening on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
