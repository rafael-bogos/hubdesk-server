import { RequestHandler, Router } from 'express';
import multer from 'multer';
import { TicketController } from '../controllers/ticket-controller';
import { requireRole } from '../middleware/require-role';
import { validate, validateQuery } from '../middleware/validate';
import {
  addCommentSchema,
  assignTicketSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  updateTicketStatusSchema,
} from '../schemas/ticket.schemas';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/zip',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, ALLOWED_MIME_TYPES.has(file.mimetype));
  },
});

export const makeTicketRouter = (ticketController: TicketController, authenticate: RequestHandler) => {
  const router = Router();

  router.use('/tickets', authenticate);

  router.post('/tickets', validate(createTicketSchema), ticketController.create);
  router.get('/tickets', validateQuery(listTicketsQuerySchema), ticketController.list);
  router.get('/tickets/:id', ticketController.get);
  router.patch(
    '/tickets/:id/status',
    requireRole('AGENT', 'ADMIN'),
    validate(updateTicketStatusSchema),
    ticketController.updateStatus,
  );
  router.patch(
    '/tickets/:id/assign',
    requireRole('AGENT', 'ADMIN'),
    validate(assignTicketSchema),
    ticketController.assign,
  );
  router.post('/tickets/:id/comments', validate(addCommentSchema), ticketController.addComment);
  router.post('/tickets/:id/attachments', upload.single('file'), ticketController.addAttachment);
  router.get('/tickets/:id/attachments/:attachmentId', ticketController.downloadAttachment);

  return router;
};
