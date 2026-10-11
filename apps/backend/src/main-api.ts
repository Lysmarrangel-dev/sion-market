import { createApp } from './app.js';
import { config } from './config.js';

const app = await createApp();
await app.listen({ port: config().PORT, host: '0.0.0.0' });
console.log(`API SionMarket escuchando en :${config().PORT}/v1`);
