import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';
import DocumentShareToken from '../models/DocumentShareToken';
import Document from '../models/Document';
import Project from '../models/Project';
import { PlanLimitService } from './PlanLimitService';

export class DataRoomService {
  static async createShareLink(
    documentId: string,
    createdBy: string,
    options: {
      expiresAt?: Date;
      maxAccess?: number;
      password?: string;
    } = {}
  ) {
    const document = await Document.findById(documentId);
    if (!document) throw new Error('Document not found');

    const project = await Project.findById(document.project);
    if (!project) throw new Error('Project not found');

    // Check if user has access to the document (owner or team member)
    const promoteur = await require('../models/Promoteur').findOne({
      _id: project.promoteur,
      $or: [
        { user: createdBy },
        { 'teamMembers.userId': createdBy }
      ]
    });

    if (!promoteur) {
      throw new Error('Unauthorized to share this document');
    }

    const canUseDataRoom = await PlanLimitService.checkCapability(project.promoteur.toString(), 'dataRoom');
    if (!canUseDataRoom) {
      throw new Error('Data room sharing is not available on your current plan');
    }

    const token = nanoid(32);
    let hashedPassword: string | undefined;

    if (options.password) {
      hashedPassword = await bcrypt.hash(options.password, 10);
    }

    const shareToken = await DocumentShareToken.create({
      document: documentId,
      project: document.project,
      promoteur: project.promoteur,
      token,
      createdBy,
      expiresAt: options.expiresAt,
      maxAccess: options.maxAccess,
      password: hashedPassword,
    });

    return {
      shareLink: `${process.env.FRONTEND_URL}/shared/documents/${token}`,
      token,
      expiresAt: options.expiresAt,
      maxAccess: options.maxAccess
    };
  }

  static async accessSharedDocument(token: string, password?: string) {
    const shareToken = await DocumentShareToken.findOne({ token })
      .populate('document')
      .populate('project', 'title status publicationStatus');

    if (!shareToken) {
      throw new Error('Invalid share link');
    }

    if (shareToken.status !== 'active') {
      throw new Error('Share link is no longer active');
    }

    if (shareToken.expiresAt && shareToken.expiresAt < new Date()) {
      shareToken.status = 'expired';
      await shareToken.save();
      throw new Error('Share link has expired');
    }

    if (shareToken.maxAccess && shareToken.accessCount >= shareToken.maxAccess) {
      throw new Error('Share link access limit exceeded');
    }

    if (shareToken.password) {
      if (!password) {
        throw new Error('Password required');
      }
      const isValidPassword = await bcrypt.compare(password, shareToken.password);
      if (!isValidPassword) {
        throw new Error('Invalid password');
      }
    }

    // Increment access count
    shareToken.accessCount += 1;
    shareToken.lastAccessedAt = new Date();
    await shareToken.save();

    return {
      document: shareToken.document,
      downloadUrl: (shareToken.document as any).url, // Assuming document has url field
      project: shareToken.project,
      expiresAt: shareToken.expiresAt,
      accessCount: shareToken.accessCount,
      maxAccess: shareToken.maxAccess
    };
  }

  static async getShareLinks(documentId: string, promoteurId: string) {
    return DocumentShareToken.find({
      document: documentId,
      promoteur: promoteurId
    }).sort({ createdAt: -1 });
  }

  static async revokeShareLink(tokenId: string, promoteurId: string) {
    const shareToken = await DocumentShareToken.findOne({
      _id: tokenId,
      promoteur: promoteurId
    });

    if (!shareToken) {
      throw new Error('Share token not found');
    }

    shareToken.status = 'revoked';
    await shareToken.save();

    return shareToken;
  }

  static async createDataRoom(
    projectId: string,
    documentIds: string[],
    createdBy: string,
    options: {
      expiresAt?: Date;
      password?: string;
    } = {}
  ) {
    const project = await Project.findById(projectId);
    if (!project) throw new Error('Project not found');

    // Check authorization
    const promoteur = await require('../models/Promoteur').findOne({
      _id: project.promoteur,
      $or: [
        { user: createdBy },
        { 'teamMembers.userId': createdBy }
      ]
    });

    if (!promoteur) {
      throw new Error('Unauthorized to create data room for this project');
    }

    const canUseDataRoom = await PlanLimitService.checkCapability(project.promoteur.toString(), 'dataRoom');
    if (!canUseDataRoom) {
      throw new Error('Data room is not available on your current plan');
    }

    // Verify all documents belong to the project
    const documents = await Document.find({
      _id: { $in: documentIds },
      project: projectId
    });

    if (documents.length !== documentIds.length) {
      throw new Error('Some documents not found or do not belong to this project');
    }

    const token = nanoid(32);
    let hashedPassword: string | undefined;

    if (options.password) {
      hashedPassword = await bcrypt.hash(options.password, 10);
    }

    // Create share tokens for each document with the same token
    const shareTokens = await Promise.all(
      documentIds.map(documentId =>
        DocumentShareToken.create({
          document: documentId,
          project: projectId,
          promoteur: project.promoteur,
          token,
          createdBy,
          expiresAt: options.expiresAt,
          password: hashedPassword,
        })
      )
    );

    return {
      dataRoomLink: `${process.env.FRONTEND_URL}/data-room/${token}`,
      token,
      documentCount: documentIds.length,
      expiresAt: options.expiresAt
    };
  }

  static async accessDataRoom(token: string, password?: string) {
    const shareTokens = await DocumentShareToken.find({ token })
      .populate('document')
      .populate('project', 'title status publicationStatus');

    if (!shareTokens.length) {
      throw new Error('Invalid data room link');
    }

    const firstToken = shareTokens[0];

    if (firstToken.status !== 'active') {
      throw new Error('Data room is no longer active');
    }

    if (firstToken.expiresAt && firstToken.expiresAt < new Date()) {
      // Expire all tokens
      await DocumentShareToken.updateMany(
        { token },
        { status: 'expired' }
      );
      throw new Error('Data room has expired');
    }

    if (firstToken.password) {
      if (!password) {
        throw new Error('Password required');
      }
      const isValidPassword = await bcrypt.compare(password, firstToken.password);
      if (!isValidPassword) {
        throw new Error('Invalid password');
      }
    }

    // Increment access count for all tokens
    await DocumentShareToken.updateMany(
      { token },
      {
        $inc: { accessCount: 1 },
        $set: { lastAccessedAt: new Date() }
      }
    );

    return {
      documents: shareTokens.map(st => st.document),
      project: firstToken.project,
      expiresAt: firstToken.expiresAt
    };
  }
}
