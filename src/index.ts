import express, { Request, Response } from 'express';

const app = express();

// JSON middleware
app.use(express.json());

// Root route
app.get('/', (req: Request, res: Response) => {
  res.send('Server is running smoothly with TypeScript + ES modules');
});

// Start server
const PORT = 8090;
app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});