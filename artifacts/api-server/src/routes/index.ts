import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import followsRouter from "./follows";
import postsRouter from "./posts";
import reactionsRouter from "./reactions";
import commentsRouter from "./comments";
import storiesRouter from "./stories";
import notificationsRouter from "./notifications";
import chatRouter from "./chat";
import searchRouter from "./search";
import settingsRouter from "./settings";
import storageRouter from "./storage";
import groupsRouter from "./groups";
import blocksRouter from "./blocks";
import emojisRouter from "./emojis";
import interactionsRouter from "./interactions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(followsRouter);
router.use(postsRouter);
router.use(reactionsRouter);
router.use(commentsRouter);
router.use(storiesRouter);
router.use(notificationsRouter);
router.use(chatRouter);
router.use(searchRouter);
router.use(settingsRouter);
router.use(storageRouter);
router.use(groupsRouter);
router.use(blocksRouter);
router.use(emojisRouter);
router.use(interactionsRouter);

export default router;
