import Fastify from 'fastify';
import cors from '@fastify/cors';
import { appRoutes } from './routes';

const app = Fastify();
//res.header('Access-Control-Allow-Origin', '*');
//res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

app.register(cors, {
  origin: '*',
  allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept',
});
app.register(appRoutes);

app
  .listen({
    port: 3000,
    host: '0.0.0.0',
  })
  .then(() => {
    console.log('HTTP Server running!');
  });
