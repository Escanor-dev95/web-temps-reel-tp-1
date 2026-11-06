# TP noté 1 — Suivi de commandes

Dépôt Git : https://github.com/Escanor-dev95/web-temps-reel-tp-1

## Lancement

```sh
docker compose up --build -d
```

Application : http://localhost:3000

## API

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/users` | Liste les clients |
| GET | `/api/products` | Liste les produits et leur stock |
| GET | `/api/orders` | Liste les commandes |
| GET | `/api/orders/:id` | Affiche une commande |
| POST | `/api/orders` | Crée une commande (`userId`, `productId`, `quantity`) |
| PATCH | `/api/orders/:id/advance` | Expédie une commande |
| PATCH | `/api/orders/:id/cancel` | Annule une commande en préparation |
| GET | `/api/orders/:id/events` | Suit une commande par SSE |
| GET | `/api/stock/events` | Reçoit les changements de stock par SSE |

## Exigences

- F1 à F10 : terminées.
- B1 à B4 : non réalisées.
