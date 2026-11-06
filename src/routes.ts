import { Router } from "express";
import { HttpError } from "./http-error";
import { openOrderStream, openStockStream } from "./events";
import { advanceOrder, cancelOrder, createOrder } from "./orders-service";
import { getOrderById, getOrders, getProducts, getUsers } from "./store";

export const router = Router();

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "Identifiant invalide");
  }
  return id;
}

router.get("/users", async (_req, res) => {
  res.json(await getUsers());
});

router.get("/products", async (_req, res) => {
  res.json(await getProducts());
});

router.get("/orders", async (_req, res) => {
  res.json(await getOrders());
});

router.get("/orders/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const order = await getOrderById(id);
  if (!order) throw new HttpError(404, `Commande ${id} introuvable`);
  res.json(order);
});

router.get("/orders/:id/events", async (req, res) => {
  const id = parseId(req.params.id);
  const order = await getOrderById(id);
  if (!order) throw new HttpError(404, `Commande ${id} introuvable`);

  openOrderStream(id, res, () => getOrderById(id));
});

router.get("/stock/events", (_req, res) => {
  openStockStream(res);
});

router.post("/orders", async (req, res) => {
  const order = await createOrder(req.body as unknown);
  res.status(201).json(order);
});

router.patch("/orders/:id/advance", async (req, res) => {
  const id = parseId(req.params.id);
  const order = await advanceOrder(id);
  res.json(order);
});

router.patch("/orders/:id/cancel", async (req, res) => {
  const id = parseId(req.params.id);
  const order = await cancelOrder(id);
  res.json(order);
});
