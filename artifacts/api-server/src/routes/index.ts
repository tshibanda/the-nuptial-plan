import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireWeddingOwnership } from "../middlewares/requireWeddingOwnership";
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
import dashboardRouter from "./dashboard";
import openaiConversationsRouter from "./openai/conversations";
import addressBookRouter from "./address-book";
import publicRsvpRouter from "./public-rsvp";
import notificationsRouter from "./notifications";
import subscriptionRouter from "./subscription";
import socialRouter, { oauthCallbackHandler } from "./social";
import editorialPostsRouter from "./editorial-posts";

const router: IRouter = Router();

// Public — no auth required
router.use(healthRouter);
router.use("/public/rsvp", publicRsvpRouter);
// OAuth callback arrives from external providers with no Clerk session — must be public.
router.get("/social/oauth/callback", oauthCallbackHandler);
router.get("/social/oauth/callback/:platform", oauthCallbackHandler);

// Auth-gated — all routes below require a valid Clerk session
router.use(requireAuth);
router.use(storageRouter);
router.use("/openai/conversations", openaiConversationsRouter);
router.use(addressBookRouter);
router.use("/notifications", notificationsRouter);
router.use("/subscription", subscriptionRouter);
router.use("/social", socialRouter);
router.use("/editorial-posts", editorialPostsRouter);
router.use(dashboardRouter);
router.use("/weddings", weddingsRouter);
router.use("/weddings/:weddingId/vendors", requireWeddingOwnership, vendorsRouter);
router.use("/weddings/:weddingId/guests", requireWeddingOwnership, guestsRouter);
router.use("/weddings/:weddingId/budget-categories", requireWeddingOwnership, budgetRouter);
router.use("/weddings/:weddingId/budget-summary", requireWeddingOwnership, budgetSummaryRouter);
router.use("/weddings/:weddingId/events", requireWeddingOwnership, eventsRouter);
router.use("/weddings/:weddingId/contracts", requireWeddingOwnership, contractsRouter);
router.use("/weddings/:weddingId/payments", requireWeddingOwnership, paymentsRouter);
router.use("/weddings/:weddingId/documents", requireWeddingOwnership, documentsRouter);

export default router;
