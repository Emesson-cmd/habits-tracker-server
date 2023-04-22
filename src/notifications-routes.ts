import WebPush, { setVapidDetails } from 'web-push';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const publicKey =
  'BFON9XJwTX_MChf4dbEkwXHrhGXxeLhORg0rDSBDexSRywkukC5ylGAI6kafaGudNUTKsn6SG1jy87pazbeEc00';
const privateKey = 'Z_4PD6c6RlZGq4IYbGlcdzRb5R-8ks_4oml3LrhAdds';

WebPush.setVapidDetails('http://localhost:3000', publicKey, privateKey);

export async function notificationRoutes(app: FastifyInstance) {
  app.get('/push/public_key', () => {
    return { publicKey };
  });

  app.post('/push/register', (request, reply) => {
    console.log(request.body);

    return reply.status(201).send();
  });

  app.post('/push/send', async (request, reply) => {
    const sendPushBody = z.object({
      subscription: z.object({
        endpoint: z.string(),
        keys: z.object({
          p256dh: z.string(),
          auth: z.string(),
        }),
      }),
    });

    const { subscription } = sendPushBody.parse(request.body)
    
    WebPush.sendNotification(subscription, 'HELLO WORLD DO BACKEND!')
    
    return reply.status(201).send();
  });
}
