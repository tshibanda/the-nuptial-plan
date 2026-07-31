import { Router, type IRouter } from "express";
import healthRouter from "./health";
import weddingsRouter from "./weddings";
import vendorsRouter from "./vendors";
import guestsRouter from "./guests";
import milestonesRouter from "./milestones";
import paymentsRouter from "./payments";
import contractsRouter from "./contracts";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(weddingsRouter);
router.use(vendorsRouter);
router.use(guestsRouter);
router.use(milestonesRouter);
router.use(paymentsRouter);
router.use(contractsRouter);

export default router;
