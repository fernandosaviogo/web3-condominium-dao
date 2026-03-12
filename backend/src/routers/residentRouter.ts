import { Router } from "express";
import residentController from "src/controllers/residentController.js";
import { onlyCounselor, onlyManager } from "src/middlewares/autorizationMiddleware.js";

const router = Router();

router.get('/:wallet', residentController.getResident);

router.post('/', onlyCounselor, residentController.postResident);

router.patch('/:wallet', onlyManager, residentController.patchResident);

router.delete('/:wallet', onlyManager, residentController.deleteResident);

export default router;