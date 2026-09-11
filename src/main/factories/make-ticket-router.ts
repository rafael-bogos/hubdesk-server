import { PrismaClient } from '@prisma/client';
import { resolve } from 'node:path';
import { RequestHandler } from 'express';
import { AddAttachmentUseCase } from '../../application/use-cases/tickets/add-attachment.use-case';
import { AddCommentUseCase } from '../../application/use-cases/tickets/add-comment.use-case';
import { AssignTicketUseCase } from '../../application/use-cases/tickets/assign-ticket.use-case';
import { CreateTicketUseCase } from '../../application/use-cases/tickets/create-ticket.use-case';
import { DownloadAttachmentUseCase } from '../../application/use-cases/tickets/download-attachment.use-case';
import { GetTicketUseCase } from '../../application/use-cases/tickets/get-ticket.use-case';
import { ListTicketsUseCase } from '../../application/use-cases/tickets/list-tickets.use-case';
import { UpdateAttachmentInternalUseCase } from '../../application/use-cases/tickets/update-attachment-internal.use-case';
import { UpdateCommentInternalUseCase } from '../../application/use-cases/tickets/update-comment-internal.use-case';
import { UpdateTicketStatusUseCase } from '../../application/use-cases/tickets/update-ticket-status.use-case';
import { PrismaAttachmentRepository } from '../../infrastructure/database/repositories/prisma-attachment-repository';
import { PrismaCategoryRepository } from '../../infrastructure/database/repositories/prisma-category-repository';
import { PrismaCommentRepository } from '../../infrastructure/database/repositories/prisma-comment-repository';
import { PrismaTicketRepository } from '../../infrastructure/database/repositories/prisma-ticket-repository';
import { PrismaUserRepository } from '../../infrastructure/database/repositories/prisma-user-repository';
import { TicketController } from '../../infrastructure/http/express/controllers/ticket-controller';
import { makeTicketRouter } from '../../infrastructure/http/express/routes/ticket-routes';
import { LocalFileStorage } from '../../infrastructure/storage/local-file-storage';
import { env } from '../config/env';

export const makeTicketModule = (prisma: PrismaClient, authenticate: RequestHandler) => {
  const ticketRepository = new PrismaTicketRepository(prisma);
  const commentRepository = new PrismaCommentRepository(prisma);
  const attachmentRepository = new PrismaAttachmentRepository(prisma);
  const userRepository = new PrismaUserRepository(prisma);
  const categoryRepository = new PrismaCategoryRepository(prisma);
  const fileStorage = new LocalFileStorage(resolve(process.cwd(), env.uploadsDir));

  const createTicketUseCase = new CreateTicketUseCase(ticketRepository);
  const getTicketUseCase = new GetTicketUseCase(
    ticketRepository,
    commentRepository,
    attachmentRepository,
    userRepository,
    categoryRepository,
  );
  const listTicketsUseCase = new ListTicketsUseCase(ticketRepository, userRepository, categoryRepository);
  const updateTicketStatusUseCase = new UpdateTicketStatusUseCase(ticketRepository);
  const assignTicketUseCase = new AssignTicketUseCase(ticketRepository);
  const addCommentUseCase = new AddCommentUseCase(ticketRepository, commentRepository);
  const updateCommentInternalUseCase = new UpdateCommentInternalUseCase(ticketRepository, commentRepository);
  const addAttachmentUseCase = new AddAttachmentUseCase(
    ticketRepository,
    attachmentRepository,
    fileStorage,
    commentRepository,
  );
  const updateAttachmentInternalUseCase = new UpdateAttachmentInternalUseCase(ticketRepository, attachmentRepository);
  const downloadAttachmentUseCase = new DownloadAttachmentUseCase(ticketRepository, attachmentRepository, fileStorage);

  const ticketController = new TicketController(
    createTicketUseCase,
    getTicketUseCase,
    listTicketsUseCase,
    updateTicketStatusUseCase,
    assignTicketUseCase,
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
