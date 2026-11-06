import { db } from "./db";
import type { User, Product, Order } from "./types";

export async function getUsers(): Promise<User[]> {
  return db.getObject<User[]>("/users");
}

export async function getProducts(): Promise<Product[]> {
  return db.getObject<Product[]>("/products");
}

export async function getOrders(): Promise<Order[]> {
  return db.getObject<Order[]>("/orders");
}

export async function getUserById(id: number): Promise<User | undefined> {
  const users = await getUsers();
  return users.find((u) => u.id === id);
}

export async function getProductById(id: number): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((p) => p.id === id);
}

export async function getOrderById(id: number): Promise<Order | undefined> {
  const orders = await getOrders();
  return orders.find((o) => o.id === id);
}

export async function saveProduct(product: Product): Promise<void> {
  const products = await getProducts();
  const index = products.findIndex((p) => p.id === product.id);
  if (index === -1) throw new Error(`Produit ${product.id} introuvable`);
  await db.push(`/products[${index}]`, product, true);
}

export async function saveOrder(order: Order): Promise<void> {
  const orders = await getOrders();
  const index = orders.findIndex((o) => o.id === order.id);
  if (index === -1) {
    await db.push("/orders[]", order, true);
  } else {
    await db.push(`/orders[${index}]`, order, true);
  }
}

export async function nextOrderId(): Promise<number> {
  const orders = await getOrders();
  return orders.reduce((max, o) => Math.max(max, o.id), 0) + 1;
}
