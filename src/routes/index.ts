import { Hono } from "hono";
import { transactionRouter } from "./transaction.routes.js";
import { authRouter } from "./auth.routes.js";

const apiRouter = new Hono();

apiRouter.route("/transactions", transactionRouter);
apiRouter.route("/auth", authRouter);

export { apiRouter };
