import type { Response } from "express";
import type { Order, Product } from "./types";

type OrderEventName = "order-created" | "order-status" | "order-cancelled";

type OrderEventRecord = {
  orderId: number;
  name: OrderEventName;
  data: Order;
};

type OrderSubscriber = {
  orderId: number;
  response: Response;
  initializing: boolean;
  pending: OrderEventRecord[];
  closed: boolean;
};

type StockSubscriber = {
  response: Response;
  closed: boolean;
};

const orderSubscribers = new Set<OrderSubscriber>();
const stockSubscribers = new Set<StockSubscriber>();

function writeEvent(
  response: Response,
  name: string,
  data: unknown,
): void {
  if (response.destroyed || response.writableEnded) return;

  response.write(`event: ${name}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

function removeOrderSubscriber(subscriber: OrderSubscriber): void {
  if (subscriber.closed) return;
  subscriber.closed = true;
  orderSubscribers.delete(subscriber);
}

function sendOrderRecord(
  subscriber: OrderSubscriber,
  event: OrderEventRecord,
): void {
  writeEvent(subscriber.response, event.name, event.data);
}

export function publishOrderEvent(name: OrderEventName, order: Order): void {
  const event: OrderEventRecord = {
    orderId: order.id,
    name,
    data: order,
  };

  for (const subscriber of orderSubscribers) {
    if (subscriber.orderId !== order.id || subscriber.closed) continue;

    if (subscriber.initializing) {
      subscriber.pending.push(event);
    } else {
      sendOrderRecord(subscriber, event);
    }
  }
}

export function publishStockEvent(product: Product): void {
  for (const subscriber of stockSubscribers) {
    if (!subscriber.closed) {
      writeEvent(subscriber.response, "stock-updated", product);
    }
  }
}

export function openOrderStream(
  orderId: number,
  response: Response,
  loadOrder: () => Promise<Order | undefined>,
): void {
  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.flushHeaders();

  const subscriber: OrderSubscriber = {
    orderId,
    response,
    initializing: true,
    pending: [],
    closed: false,
  };
  orderSubscribers.add(subscriber);
  response.on("close", () => removeOrderSubscriber(subscriber));
  response.on("error", () => removeOrderSubscriber(subscriber));

  void initializeOrderStream(subscriber, loadOrder);
}

async function initializeOrderStream(
  subscriber: OrderSubscriber,
  loadOrder: () => Promise<Order | undefined>,
): Promise<void> {
  try {
    const order = await loadOrder();
    if (subscriber.closed) return;
    if (!order) {
      writeEvent(subscriber.response, "stream-error", {
        error: "Commande introuvable",
      });
      removeOrderSubscriber(subscriber);
      return;
    }

    writeEvent(subscriber.response, "order-state", order);

    const pendingEvents = subscriber.pending;
    subscriber.pending = [];
    for (const event of pendingEvents) {
      if (subscriber.closed) return;
      sendOrderRecord(subscriber, event);
    }
    if (!subscriber.closed) subscriber.initializing = false;
  } catch (error) {
    console.error("Impossible d'initialiser le flux de commande :", error);
    writeEvent(subscriber.response, "stream-error", {
      error: "Impossible de charger la commande",
    });
    removeOrderSubscriber(subscriber);
  }
}

export function openStockStream(response: Response): void {
  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.flushHeaders();

  const subscriber: StockSubscriber = {
    response,
    closed: false,
  };
  stockSubscribers.add(subscriber);

  const removeSubscriber = (): void => {
    if (subscriber.closed) return;
    subscriber.closed = true;
    stockSubscribers.delete(subscriber);
  };
  response.on("close", removeSubscriber);
  response.on("error", removeSubscriber);
}
