import express, { type NextFunction, type Request, type Response } from "express";
import { initDb } from "./db";
import { HttpError } from "./http-error";
import { resumePendingDeliveries } from "./orders-service";
import { router } from "./routes";

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use("/api", router);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Erreur interne" });
});

const PORT = Number(process.env.PORT) || 3000;

async function main(): Promise<void> {
  await initDb();
  await resumePendingDeliveries();

  app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
  });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
