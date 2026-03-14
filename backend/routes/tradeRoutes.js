const express = require("express");

module.exports = ({ botController }) => {
  const router = express.Router();

  router.get("/trades", async (_req, res, next) => {
    try {
      res.json(await botController.getTrades());
    } catch (error) {
      next(error);
    }
  });

  router.post("/orders/:orderId/cancel", async (req, res, next) => {
    try {
      res.json(await botController.cancelOrder(Number(req.params.orderId)));
    } catch (error) {
      next(error);
    }
  });

  return router;
};
