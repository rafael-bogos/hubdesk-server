import { NextFunction, Request, Response } from 'express';
import { AddAttachmentUseCase } from '../../../../application/use-cases/tickets/add-attachment.use-case';
import { AddCommentUseCase } from '../../../../application/use-cases/tickets/add-comment.use-case';
import { AssignTicketUseCase } from '../../../../application/use-cases/tickets/assign-ticket.use-case';
import { BulkUpdateTicketsUseCase } from '../../../../application/use-cases/tickets/bulk-update-tickets.use-case';
import { CreateTicketUseCase } from '../../../../application/use-cases/tickets/create-ticket.use-case';
import { DownloadAttachmentUseCase } from '../../../../application/use-cases/tickets/download-attachment.use-case';
import { GetTicketUseCase } from '../../../../application/use-cases/tickets/get-ticket.use-case';
import { ListTicketsUseCase } from '../../../../application/use-cases/tickets/list-tickets.use-case';
import { UpdateAttachmentInternalUseCase } from '../../../../application/use-cases/tickets/update-attachment-internal.use-case';
import { UpdateCommentInternalUseCase } from '../../../../application/use-cases/tickets/update-comment-internal.use-case';
import { UpdateTicketStatusUseCase } from '../../../../application/use-cases/tickets/update-ticket-status.use-case';
import { Actor } from '../../../../application/dtos/ticket.dto';
import { AppError } from '../../../../domain/errors/app-error';
import { UnauthorizedError } from '../../../../domain/errors/auth-errors';
import { AgentCategoryRepository } from '../../../../domain/repositories/agent-category-repository';

export class TicketController {
  constructor(
    private readonly createTicketUseCase: CreateTicketUseCase,
    private readonly getTicketUseCase: GetTicketUseCase,
    private readonly listTicketsUseCase: ListTicketsUseCase,
    private readonly updateTicketStatusUseCase: UpdateTicketStatusUseCase,
    private readonly assignTicketUseCase: AssignTicketUseCase,
    private readonly bulkUpdateTicketsUseCase: BulkUpdateTicketsUseCase,
    private readonly addCommentUseCase: AddCommentUseCase,
    private readonly updateCommentInternalUseCase: UpdateCommentInternalUseCase,
    private readonly addAttachmentUseCase: AddAttachmentUseCase,
    private readonly updateAttachmentInternalUseCase: UpdateAttachmentInternalUseCase,
    private readonly downloadAttachmentUseCase: DownloadAttachmentUseCase,
    private readonly agentCategoryRepository: AgentCategoryRepository,
  ) {}

  // Async porque, pra AGENT, busca a restrição de categoria dele — feito uma
  // vez aqui (não em cada use case) pra todo o resto do controller já
  // receber o Actor pronto (ver ticket-access.ts).
  private async actor(req: Request): Promise<Actor> {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    const { userId, role } = req.user;

    if (role !== 'AGENT') {
      return { userId, role };
    }

    const categoryIds = await this.agentCategoryRepository.listCategoryIdsForUser(userId);
    return { userId, role, allowedCategoryIds: categoryIds.length > 0 ? categoryIds : null };
  }

  private ticketId(req: Request): string {
    const id = req.params.id;
    return Array.isArray(id) ? id[0] : id;
  }

  private commentId(req: Request): string {
    const id = req.params.commentId;
    return Array.isArray(id) ? id[0] : id;
  }

  private attachmentId(req: Request): string {
    const id = req.params.attachmentId;
    return Array.isArray(id) ? id[0] : id;
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ticket = await this.createTicketUseCase.execute(req.body, await this.actor(req));
      res.status(201).json(ticket);
    } catch (err) {
      next(err);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.getTicketUseCase.execute(this.ticketId(req), await this.actor(req));
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.listTicketsUseCase.execute(req.query, await this.actor(req));
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ticket = await this.updateTicketStatusUseCase.execute(this.ticketId(req), req.body, await this.actor(req));
      res.status(200).json(ticket);
    } catch (err) {
      next(err);
    }
  };

  assign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ticket = await this.assignTicketUseCase.execute(this.ticketId(req), req.body, await this.actor(req));
      res.status(200).json(ticket);
    } catch (err) {
      next(err);
    }
  };

  bulkUpdate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.bulkUpdateTicketsUseCase.execute(req.body, await this.actor(req));
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  addComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const comment = await this.addCommentUseCase.execute(this.ticketId(req), req.body, await this.actor(req));
      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  };

  updateCommentInternal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const comment = await this.updateCommentInternalUseCase.execute(
        this.ticketId(req),
        this.commentId(req),
        req.body,
        await this.actor(req),
      );
      res.status(200).json(comment);
    } catch (err) {
      next(err);
    }
  };

  addAttachment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('Arquivo é obrigatório', 400);
      }

      const attachment = await this.addAttachmentUseCase.execute(
        this.ticketId(req),
        {
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          buffer: req.file.buffer,
          commentId: req.body.commentId,
          // multipart/form-data só transmite strings; sem o campo, deixa o use case decidir o padrão.
          isInternal: req.body.isInternal === undefined ? undefined : req.body.isInternal === 'true',
        },
        await this.actor(req),
      );

      res.status(201).json(attachment);
    } catch (err) {
      next(err);
    }
  };

  updateAttachmentInternal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const attachment = await this.updateAttachmentInternalUseCase.execute(
        this.ticketId(req),
        this.attachmentId(req),
        req.body,
        await this.actor(req),
      );
      res.status(200).json(attachment);
    } catch (err) {
      next(err);
    }
  };

  downloadAttachment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = await this.downloadAttachmentUseCase.execute(
        this.ticketId(req),
        this.attachmentId(req),
        await this.actor(req),
      );

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);
      res.status(200).send(file.buffer);
    } catch (err) {
      next(err);
    }
  };
}
