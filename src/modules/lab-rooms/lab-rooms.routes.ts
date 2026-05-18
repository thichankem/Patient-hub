import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createLabRoomSchema,
  idParamSchema,
  updateLabRoomSchema,
} from './lab-rooms.schema';
import * as labRoomsController from './lab-rooms.controller';

const router = Router();
router.use(authenticate);

router.get('/', labRoomsController.listLabRooms);
router.get(
  '/:id',
  validate({ params: idParamSchema }),
  labRoomsController.getLabRoom,
);

router.post(
  '/',
  requireRole('manager'),
  validate({ body: createLabRoomSchema }),
  labRoomsController.createLabRoom,
);

router.patch(
  '/:id',
  requireRole('manager'),
  validate({ params: idParamSchema, body: updateLabRoomSchema }),
  labRoomsController.updateLabRoom,
);

router.delete(
  '/:id',
  requireRole('manager'),
  validate({ params: idParamSchema }),
  labRoomsController.deleteLabRoom,
);

export default router;
