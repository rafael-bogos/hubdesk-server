import { PrismaClient } from '@prisma/client';
import { resolve } from 'node:path';
import { RequestHandler } from 'express';
import { AddAttachmentUseCase } from '../../application/use-cases/tickets/add-attachment.use-case';
import { AddCommentUseCase } from '../../application/use-cases/tickets/add-comment.use-case';
import { AssignTicketUseCase } from '../../application/use-cases/tickets/assign-ticket.use-case';
import { BulkUpdateTicketsUseCase } from '../../application/use-cases/tickets/bulk-update-tickets.use-case';
import { CreateTicketUseCase } from '../../application/use-cases/tickets/create-ticket.use-case';
import { DownloadAttachmentUseCase } from '../../application/use-cases/tickets/download-attachment.use-case';
import { GetTicketUseCase } from '../../application/use-cases/tickets/get-ticket.use-case';
import { ListTicketsUseCase } from '../../application/use-cases/tickets/list-tickets.use-case';
import { UpdateAttachmentInternalUseCase } from '../../application/use-cases/tickets/update-attachment-internal.use-case';
import { UpdateCommentInternalUseCase } from '../../application/use-cases/tickets/update-comment-internal.use-case';
import { UpdateTicketStatusUseCase } from '../../application/use-cases/tickets/update-ticket-status.use-case';
import { TicketNotificationService } from '../../application/services/ticket-notification-service';
import { RealtimeNotifier } from '../../domain/ports/realtime-notifier';
import { TicketClosureScheduler } from '../../domain/ports/ticket-closure-scheduler';
import { PrismaAttachmentRepository } from '../../infrastructure/database/repositories/prisma-attachment-repository';
import { PrismaCategoryRepository } from '../../infrastructure/database/repositories/prisma-category-repository';
import { PrismaCommentRepository } from '../../infrastructure/database/repositories/prisma-comment-repository';
import { PrismaNotificationRepository } from '../../infrastructure/database/repositories/prisma-notification-repository';
import { PrismaTicketRepository } from '../../infrastructure/database/repositories/prisma-ticket-repository';
import { PrismaUserRepository } from '../../infrastructure/database/repositories/prisma-user-repository';
import { makeEmailSender } from '../../infrastructure/email/make-email-sender';
import { TicketController } from '../../infrastructure/http/express/controllers/ticket-controller';
import { makeTicketRouter } from '../../infrastructure/http/express/routes/ticket-routes';
import { NullRealtimeNotifier } from '../../infrastructure/realtime/null-realtime-notifier';
import { NullTicketClosureScheduler } from '../../infrastructure/queue/null-ticket-closure-scheduler';
import { LocalFileStorage } from '../../infrastructure/storage/local-file-storage';
import { env } from '../config/env';

export const makeTicketModule = (
  prisma: PrismaClient,
  authenticate: RequestHandler,
  realtimeNotifier: RealtimeNotifier = new NullRealtimeNotifier(),
  ticketClosureScheduler: TicketClosureScheduler = new NullTicketClosureScheduler(),
) => {
  const ticketRepository = new PrismaTicketRepository(prisma);
  const commentRepository = new PrismaCommentRepository(prisma);
  const attachmentRepository = new PrismaAttachmentRepository(prisma);
  const userRepository = new PrismaUserRepository(prisma);
  const categoryRepository = new PrismaCategoryRepository(prisma);
  const notificationRepository = new PrismaNotificationRepository(prisma);
  const fileStorage = new LocalFileStorage(resolve(process.cwd(), env.uploadsDir));

  const ticketNotificationService = new TicketNotificationService(
    userRepository,
    notificationRepository,
    realtimeNotifier,
    makeEmailSender(),
  );

  const createTicketUseCase = new CreateTicketUseCase(ticketRepository, ticketNotificationService);
  const getTicketUseCase = new GetTicketUseCase(
    ticketRepository,
    commentRepository,
    attachmentRepository,
    userRepository,
    categoryRepository,
  );
  const listTicketsUseCase = new ListTicketsUseCase(ticketRepository, userRepository, categoryRepository);
  const updateTicketStatusUseCase = new UpdateTicketStatusUseCase(
    ticketRepository,
    ticketNotificationService,
    ticketClosureScheduler,
  );
  const assignTicketUseCase = new AssignTicketUseCase(ticketRepository, ticketNotificationService);
  const bulkUpdateTicketsUseCase = new BulkUpdateTicketsUseCase(
    ticketRepository,
    ticketNotificationService,
    ticketClosureScheduler,
  );
  const addCommentUseCase = new AddCommentUseCase(ticketRepository, commentRepository, ticketNotificationService);
  const updateCommentInternalUseCase = new UpdateCommentInternalUseCase(ticketRepository, commentRepository);
  const addAttachmentUseCase = new AddAttachmentUseCase(
    ticketRepository,
    attachmentRepository,
    fileStorage,
    commentRepository,
    ticketNotificationService,
  );
  const updateAttachmentInternalUseCase = new UpdateAttachmentInternalUseCase(ticketRepository, attachmentRepository);
  const downloadAttachmentUseCase = new DownloadAttachmentUseCase(ticketRepository, attachmentRepository, fileStorage);

  const ticketController = new TicketController(
    createTicketUseCase,
    getTicketUseCase,
    listTicketsUseCase,
    updateTicketStatusUseCase,
    assignTicketUseCase,
    bulkUpdateTicketsUseCase,
    addCommentUseCase,
    updateCommentInternalUseCase,
    addAttachmentUseCase,
    updateAttachmentInternalUseCase,
    downloadAttachmentUseCase,
  );

  return {
    router: makeTicketRouter(ticketController, authenticate),
  };
};
