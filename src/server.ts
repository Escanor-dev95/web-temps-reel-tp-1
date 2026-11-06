import express from "express";
import { initDb } from "./db";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = Number(process.env.PORT) || 3000;

async function main(): Promise<void> {
  await initDb();

  app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
  });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
