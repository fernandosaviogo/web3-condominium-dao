import { Router } from "express";
import topicFileController from "src/controllers/topicFileController.js";
import { onlyCounselor, onlyManager } from "src/middlewares/autorizationMiddleware.js";

const router = Router();

//topicfiles/hash/nome-arquivo
router.get('/:hash/:fileName', topicFileController.getTopicFile);

router.get('/:hash/', topicFileController.getTopicFiles);

router.post('/hash/', onlyCounselor, topicFileController.addTopicFile);

router.delete('/:hash/:fileName', onlyManager, topicFileController.deleteTopicFile);

router.delete('/:hash/', onlyManager, topicFileController.deleteAllTopicFile);

export default router;