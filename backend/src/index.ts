import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from '@/routes';
import { errorHandler } from '@/middleware/errorHandler';

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api', routes); // All routes under /api

app.use(errorHandler);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;
