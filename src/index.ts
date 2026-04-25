import express, { Request, Response } from 'express';
import { matchesRouter } from './routes/matches.ts';

const app = express();

// JSON middleware
app.use(express.json());

// Root route
app.get('/', (req: Request, res: Response) => {
  res.send('Server is running smoothly with TypeScript + ES modules');
});
app.use("/matches",matchesRouter)
// Start server
const PORT = 8090;
app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});