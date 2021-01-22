import { NextFunction, Request, Response, Router } from "express";

const routes = Router();

routes.get(
  "/check",
  (request: Request, response: Response, next: NextFunction) => {
    response.json({ ok: true });
  }
);

export default routes;
