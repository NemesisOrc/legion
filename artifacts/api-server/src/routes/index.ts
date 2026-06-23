import { Router, type IRouter } from "express";
import healthRouter from "./health";
import newworldRouter from "./newworld";

const router: IRouter = Router();

router.use(healthRouter);
router.use(newworldRouter);

export default router;
