const express = require("express");

module.exports = ({ botController }) => {
  const router = express.Router();

  router.get("/strategies", async (_req, res, next) => {
    try {
      res.json(await botController.getStrategies());
    } catch (error) {
      next(error);
    }
  });

  router.post("/strategies", async (req, res, next) => {
    try {
      res.json(await botController.updateStrategy(req.body));
    } catch (error) {
      next(error);
    }
  });

  return router;
};
