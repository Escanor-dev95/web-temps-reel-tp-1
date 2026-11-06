import { HttpError } from "./http-error";
import { publishOrderEvent, publishStockEvent } from "./events";
import {
  getOrderById,
  getOrders,
  getProductById,
  getUserById,
  nextOrderId,
  saveOrder,
  saveProduct,
} from "./store";
import type { Order, Status } from "./types";

const NEXT_STATUS: Partial<Record<Status, Status>> = {
  preparing: "shipped",
};

const DELIVERY_DELAY_MS = 20_000;
const pendingDeliveries = new Map<number, NodeJS.Timeout>();
let mutationQueue: Promise<void> = Promise.resolve();

function serializeMutation<T>(operation: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(operation);
  mutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function scheduleDelivery(orderId: number): void {
  const timer = setTimeout(() => {
    void serializeMutation(() => deliverOrder(orderId)).catch(
      (error: unknown) => console.error("Échec de la livraison automatique :", error),
    );
  }, DELIVERY_DELAY_MS);
  pendingDeliveries.set(orderId, timer);
}

async function deliverOrder(orderId: number): Promise<void> {
  pendingDeliveries.delete(orderId);

  const order = await getOrderById(orderId);
  if (!order || order.status !== "shipped") return;

  const updated: Order = { ...order, status: "delivered" };
  await saveOrder(updated);
  publishOrderEvent("order-status", updated);
}

export async function resumePendingDeliveries(): Promise<void> {
  const orders = await getOrders();
  for (const order of orders) {
    if (order.status === "shipped") scheduleDelivery(order.id);
  }
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

async function createOrderUnlocked(input: unknown): Promise<Order> {
  const body = asRecord(input);
  const userId = body?.userId;
  const productId = body?.productId;
  const quantity = body?.quantity;

  if (
    !isPositiveInteger(userId) ||
    !isPositiveInteger(productId) ||
    !isPositiveInteger(quantity)
  ) {
    throw new HttpError(
      400,
      "userId, productId et quantity sont requis et doivent être des entiers positifs",
    );
  }

  const user = await getUserById(userId);
  if (!user) throw new HttpError(404, `Client ${userId} introuvable`);

  const product = await getProductById(productId);
  if (!product) throw new HttpError(404, `Produit ${productId} introuvable`);

  if (product.stock < quantity) {
    throw new HttpError(409, `Stock insuffisant pour ${product.name}`);
  }

  const order: Order = {
    id: await nextOrderId(),
    userId,
    productId,
    quantity,
    status: "preparing",
    createdAt: new Date().toISOString(),
  };

  const updatedProduct = { ...product, stock: product.stock - quantity };
  await saveProduct(updatedProduct);
  await saveOrder(order);
  publishStockEvent(updatedProduct);
  publishOrderEvent("order-created", order);

  return order;
}

export function createOrder(input: unknown): Promise<Order> {
  return serializeMutation(() => createOrderUnlocked(input));
}

async function advanceOrderUnlocked(id: number): Promise<Order> {
  const order = await getOrderById(id);
  if (!order) throw new HttpError(404, `Commande ${id} introuvable`);

  const next = NEXT_STATUS[order.status];
  if (!next) {
    throw new HttpError(
      409,
      `La commande ${id} est "${order.status}" et ne peut plus avancer`,
    );
  }

  const updated: Order = { ...order, status: next };
  await saveOrder(updated);
  publishOrderEvent("order-status", updated);

  if (next === "shipped") scheduleDelivery(updated.id);

  return updated;
}

export function advanceOrder(id: number): Promise<Order> {
  return serializeMutation(() => advanceOrderUnlocked(id));
}

async function cancelOrderUnlocked(id: number): Promise<Order> {
  const order = await getOrderById(id);
  if (!order) throw new HttpError(404, `Commande ${id} introuvable`);

  if (order.status !== "preparing") {
    throw new HttpError(
      409,
      `La commande ${id} est "${order.status}" et ne peut plus être annulée`,
    );
  }

  const product = await getProductById(order.productId);
  if (!product) throw new HttpError(404, `Produit ${order.productId} introuvable`);

  const updated: Order = { ...order, status: "cancelled" };
  const updatedProduct = { ...product, stock: product.stock + order.quantity };
  await saveProduct(updatedProduct);
  await saveOrder(updated);
  publishStockEvent(updatedProduct);
  publishOrderEvent("order-cancelled", updated);

  return updated;
}

export function cancelOrder(id: number): Promise<Order> {
  return serializeMutation(() => cancelOrderUnlocked(id));
}
