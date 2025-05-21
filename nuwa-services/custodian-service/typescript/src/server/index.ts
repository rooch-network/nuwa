import express from 'express';
import cors from 'cors';
import apiRoutes from './api';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api', apiRoutes);

// Root route - health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Custodian Service',
    version: '1.0.0'
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Custodian Service listening on port ${PORT}`);
  });
}

export default app; 