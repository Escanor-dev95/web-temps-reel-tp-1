import { JsonDB, Config } from "node-json-db";
import type { User, Product, Order } from "./types";

export const db = new JsonDB(new Config("data/db", true, true, "/"));

async function seedIfEmpty(): Promise<void> {
  const hasUsers = await db.exists("/users");
  if (!hasUsers) {
    const users: User[] = [
      { id: 1, name: "Ada Lovelace", username: "ada", email: "ada@esgi.fr" },
      { id: 2, name: "Alan Turing", username: "alan", email: "alan@esgi.fr" },
    ];
    await db.push("/users", users);
  }

  const hasProducts = await db.exists("/products");
  if (!hasProducts) {
    const products: Product[] = [
      { id: 1, name: "Clavier mécanique", stock: 10 },
      { id: 2, name: "Souris sans fil", stock: 15 },
      { id: 3, name: "Écran 27 pouces", stock: 5 },
    ];
    await db.push("/products", products);
  }

  const hasOrders = await db.exists("/orders");
  if (!hasOrders) {
    const orders: Order[] = [];
    await db.push("/orders", orders);
  }
}

export async function initDb(): Promise<void> {
  await seedIfEmpty();
}
