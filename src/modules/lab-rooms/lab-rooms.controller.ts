import type { Request, Response } from 'express';
import * as labRoomsService from './lab-rooms.service';
import type { CreateLabRoomInput, UpdateLabRoomInput } from './lab-rooms.schema';

export async function listLabRooms(req: Request, res: Response): Promise<void> {
  const name = typeof req.query.name === 'string' ? req.query.name : undefined;
  const data = await labRoomsService.listLabRooms(name);
  res.json({ data });
}

export async function getLabRoom(req: Request, res: Response): Promise<void> {
  const data = await labRoomsService.getLabRoom(req.params['id'] as string);
  res.json({ data });
}

export async function createLabRoom(req: Request, res: Response): Promise<void> {
  const data = await labRoomsService.createLabRoom(req.body as CreateLabRoomInput);
  res.status(201).json({ data });
}

export async function updateLabRoom(req: Request, res: Response): Promise<void> {
  const data = await labRoomsService.updateLabRoom(
    req.params['id'] as string,
    req.body as UpdateLabRoomInput,
  );
  res.json({ data });
}

export async function deleteLabRoom(req: Request, res: Response): Promise<void> {
  await labRoomsService.deleteLabRoom(req.params['id'] as string);
  res.json({ message: 'Xóa phòng xét nghiệm thành công' });
}
