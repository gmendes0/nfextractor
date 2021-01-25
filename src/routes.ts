import { NextFunction, Request, Response, Router } from "express";
import NFEController from "./controllers/NFEController";

const routes = Router();

routes.get(
  "/healthcheck",
  (request: Request, response: Response, next: NextFunction) => {
    response.json({ ok: true });
  }
);

routes.post("/nfes", NFEController.get);

export default routes;
