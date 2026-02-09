import ProjectQuestion from '../models/ProjectQuestion';
import Project from '../models/Project';
import Promoteur from '../models/Promoteur';
import User from '../models/User';
import { sendEmail } from '../utils/emailService';

export class QuestionService {
  static async askQuestion(
    projectId: string,
    userId: string,
    question: string
  ) {
    const project = await Project.findById(projectId);
    if (!project) throw new Error('Project not found');

    if (project.publicationStatus !== 'published') {
      throw new Error('Cannot ask questions on unpublished projects');
    }

    const questionDoc = await ProjectQuestion.create({
      project: projectId,
      promoteur: project.promoteur,
      askedBy: userId,
      question
    });

    // Notify promoteur (could be done asynchronously)
    await this.notifyPromoteurOfQuestion(questionDoc);

    return questionDoc;
  }

  static async answerQuestion(
    questionId: string,
    promoteurId: string,
    answer: string,
    makePublic: boolean = false
  ) {
    const question = await ProjectQuestion.findById(questionId)
      .populate('project')
      .populate('askedBy', 'firstName lastName email');

    if (!question) throw new Error('Question not found');

    // Check if user is authorized (owner or team member)
    const promoteur = await Promoteur.findOne({
      _id: question.promoteur,
      $or: [
        { user: promoteurId },
        { 'teamMembers.userId': promoteurId }
      ]
    });

    if (!promoteur) {
      throw new Error('Unauthorized to answer this question');
    }

    question.answer = answer;
    question.status = 'answered';
    question.answeredBy = promoteurId as any;
    question.answeredAt = new Date();
    question.isPublic = makePublic;

    await question.save();

    // If making public, add to project FAQ
    if (makePublic) {
      await Project.findByIdAndUpdate(question.project, {
        $push: {
          faq: {
            question: question.question,
            answer,
            addedAt: new Date()
          }
        }
      });
    }

    // Notify asker
    await this.notifyQuestionAnswered(question);

    return question;
  }

  static async rejectQuestion(questionId: string, promoteurId: string) {
    const question = await ProjectQuestion.findById(questionId);

    if (!question) throw new Error('Question not found');

    // Check authorization
    const promoteur = await Promoteur.findOne({
      _id: question.promoteur,
      $or: [
        { user: promoteurId },
        { 'teamMembers.userId': promoteurId }
      ]
    });

    if (!promoteur) {
      throw new Error('Unauthorized to reject this question');
    }

    question.status = 'rejected';
    await question.save();

    return question;
  }

  static async upvoteQuestion(questionId: string, userId: string) {
    const question = await ProjectQuestion.findById(questionId);

    if (!question) throw new Error('Question not found');

    const hasUpvoted = question.upvotedBy.some(id => id.toString() === userId);

    if (hasUpvoted) {
      // Remove upvote
      question.upvotedBy = question.upvotedBy.filter(id => id.toString() !== userId);
      question.upvotes -= 1;
    } else {
      // Add upvote
      question.upvotedBy.push(userId as any);
      question.upvotes += 1;
    }

    await question.save();
    return { upvotes: question.upvotes, hasUpvoted: !hasUpvoted };
  }

  static async getProjectQuestions(projectId: string, userId?: string, filters: any = {}) {
    const query: any = { project: projectId };

    // If not the project owner/promoteur, only show public answered questions
    if (userId) {
      const project = await Project.findById(projectId);
      if (project && project.promoteur.toString() !== userId) {
        // Check if user is team member
        const promoteur = await Promoteur.findOne({
          _id: project.promoteur,
          $or: [
            { user: userId },
            { 'teamMembers.userId': userId }
          ]
        });

        if (!promoteur) {
          query.isPublic = true;
          query.status = 'answered';
        }
      }
    } else {
      query.isPublic = true;
      query.status = 'answered';
    }

    if (filters.status) query.status = filters.status;

    return ProjectQuestion.find(query)
      .populate('askedBy', 'firstName lastName')
      .populate('answeredBy', 'firstName lastName')
      .sort({ createdAt: -1 });
  }

  static async getPromoteurQuestions(promoteurId: string, filters: any = {}) {
    const query: any = { promoteur: promoteurId };

    if (filters.status) query.status = filters.status;
    if (filters.projectId) query.project = filters.projectId;

    return ProjectQuestion.find(query)
      .populate('project', 'title slug')
      .populate('askedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
  }

  static async getPopularQuestions(projectId: string, limit: number = 10) {
    return ProjectQuestion.find({
      project: projectId,
      status: 'pending'
    })
    .sort({ upvotes: -1, createdAt: -1 })
    .limit(limit)
    .populate('askedBy', 'firstName lastName');
  }

  private static async notifyPromoteurOfQuestion(question: any) {
    const promoteur = await Promoteur.findById(question.promoteur).populate('user', 'email');
    const asker = await User.findById(question.askedBy);

    if (!promoteur || !asker || !promoteur.user) return;

    const project = await Project.findById(question.project);
    if (!project) return;

    await sendEmail({
      to: (promoteur.user as any).email,
      subject: 'Nouvelle question sur votre projet',
      template: 'new-question',
      data: {
        projectTitle: project.title,
        askerName: `${asker.firstName} ${asker.lastName}`,
        question: question.question,
        questionUrl: `${process.env.FRONTEND_URL}/projects/${question.project}/questions`
      }
    });
  }

  private static async notifyQuestionAnswered(question: any) {
    const asker = await User.findById(question.askedBy);
    const project = await Project.findById(question.project);

    if (!asker || !project) return;

    await sendEmail({
      to: asker.email,
      subject: 'Votre question a été répondue',
      template: 'question-answered',
      data: {
        projectTitle: project.title,
        question: question.question,
        answer: question.answer,
        projectUrl: `${process.env.FRONTEND_URL}/projects/${project._id}`
      }
    });
  }
}