const express = require("express");

module.exports = ({ botController }) => {
  const router = express.Router();

  router.get("/prices", async (_req, res, next) => {
    try {
      res.json(await botController.getPrices());
    } catch (error) {
      next(error);
    }
  });

  router.get("/markets", async (_req, res, next) => {
    try {
      res.json(await botController.getMarkets());
    } catch (error) {
      next(error);
    }
  });

  router.post("/markets", async (req, res, next) => {
    try {
      res.json(await botController.updateMarkets(req.body));
    } catch (error) {
      next(error);
    }
  });

  return router;
};
