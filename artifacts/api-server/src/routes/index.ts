import { Router, type IRouter } from "express";
import healthRouter from "./health";
import weddingsRouter from "./weddings";
import vendorsRouter from "./vendors";
import guestsRouter from "./guests";
import budgetRouter from "./budget";
import budgetSummaryRouter from "./budget-summary";
import eventsRouter from "./events";
import contractsRouter from "./contracts";
import paymentsRouter from "./payments";
import documentsRouter from "./documents";
import storageRouter from "./storage";
import openaiConversationsRouter from "./openai/conversations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use("/openai/conversations", openaiConversationsRouter);
router.use("/weddings", weddingsRouter);
router.use("/weddings/:weddingId/vendors", vendorsRouter);
router.use("/weddings/:weddingId/guests", guestsRouter);
router.use("/weddings/:weddingId/budget-categories", budgetRouter);
router.use("/weddings/:weddingId/budget-summary", budgetSummaryRouter);
router.use("/weddings/:weddingId/events", eventsRouter);
router.use("/weddings/:weddingId/contracts", contractsRouter);
router.use("/weddings/:weddingId/payments", paymentsRouter);
router.use("/weddings/:weddingId/documents", documentsRouter);

export default router;
