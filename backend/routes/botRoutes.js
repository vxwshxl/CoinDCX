const express = require("express");

module.exports = ({ botController }) => {
  const router = express.Router();

  router.get("/status", async (_req, res, next) => {
    try {
      res.json(await botController.getStatus());
    } catch (error) {
      next(error);
    }
  });

  router.post("/start-bot", async (_req, res, next) => {
    try {
      res.json(await botController.startBot());
    } catch (error) {
      next(error);
    }
  });

  router.post("/stop-bot", async (_req, res, next) => {
    try {
      res.json(await botController.stopBot());
    } catch (error) {
      next(error);
    }
  });

  router.post("/settings", async (req, res, next) => {
    try {
      res.json(await botController.updateSettings(req.body));
    } catch (error) {
      next(error);
    }
  });

  router.get("/logs", async (_req, res, next) => {
    try {
      res.json(await botController.getLogs());
    } catch (error) {
      next(error);
    }
  });

  return router;
};
