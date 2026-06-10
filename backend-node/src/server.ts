import { createApp } from './app.js';
import { env } from './config/env.js';
import { startRecurringJob } from './jobs/recurring.job.js';

const app = createApp();

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 API listening on http://localhost:${env.PORT}`);
  startRecurringJob();
});
