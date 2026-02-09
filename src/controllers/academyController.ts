import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { AcademyService } from '../services/AcademyService';

export class AcademyController {
  /**
   * Get all courses
   */
  static async getCourses(req: AuthRequest, res: Response) {
    try {
      const { category, page, limit } = req.query;

      const result = await AcademyService.getCourses({
        category: category as string,
        status: 'published',
        targetAudience: req.user?.roles?.[0] || 'all',
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });

      res.json(result);
    } catch (error) {
      console.error('Error getting courses:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get course by ID
   */
  static async getCourse(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const course = await AcademyService.getCourse(id);

      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      res.json({ course });
    } catch (error) {
      console.error('Error getting course:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Enroll in course
   */
  static async enrollInCourse(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const progress = await AcademyService.enrollUser(req.user!.id, id);

      res.status(201).json({ progress });
    } catch (error) {
      console.error('Error enrolling in course:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Complete lesson
   */
  static async completeLesson(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { moduleIndex, lessonIndex } = req.body;

      if (moduleIndex === undefined || lessonIndex === undefined) {
        return res.status(400).json({ message: 'Module and lesson index are required' });
      }

      const progress = await AcademyService.completeLesson(
        req.user!.id,
        id,
        moduleIndex,
        lessonIndex
      );

      res.json({ progress });
    } catch (error) {
      console.error('Error completing lesson:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Submit quiz
   */
  static async submitQuiz(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { moduleIndex, lessonIndex, score } = req.body;

      if (moduleIndex === undefined || lessonIndex === undefined || score === undefined) {
        return res.status(400).json({ message: 'Module, lesson index and score are required' });
      }

      const progress = await AcademyService.submitQuizResult(
        req.user!.id,
        id,
        moduleIndex,
        lessonIndex,
        score
      );

      res.json({ progress });
    } catch (error) {
      console.error('Error submitting quiz:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get my progress
   */
  static async getMyProgress(req: AuthRequest, res: Response) {
    try {
      const { courseId } = req.query;

      const progress = await AcademyService.getUserProgress(
        req.user!.id,
        courseId as string
      );

      res.json({ progress });
    } catch (error) {
      console.error('Error getting progress:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get my certificates
   */
  static async getMyCertificates(req: AuthRequest, res: Response) {
    try {
      const certificates = await AcademyService.getUserCertificates(req.user!.id);

      res.json({ certificates });
    } catch (error) {
      console.error('Error getting certificates:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Rate course
   */
  static async rateCourse(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { rating, review } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }

      const progress = await AcademyService.rateCourse(
        req.user!.id,
        id,
        rating,
        review
      );

      res.json({ progress });
    } catch (error) {
      console.error('Error rating course:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Update time spent
   */
  static async updateTimeSpent(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { minutes } = req.body;

      if (!minutes || minutes < 0) {
        return res.status(400).json({ message: 'Valid minutes value is required' });
      }

      const progress = await AcademyService.updateTimeSpent(
        req.user!.id,
        id,
        minutes
      );

      res.json({ progress });
    } catch (error) {
      console.error('Error updating time spent:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Admin endpoints

  /**
   * Create course (admin)
   */
  static async createCourse(req: AuthRequest, res: Response) {
    try {
      const course = await AcademyService.createCourse(req.body);

      res.status(201).json({ course });
    } catch (error) {
      console.error('Error creating course:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Add module to course (admin)
   */
  static async addModule(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const course = await AcademyService.addModule(id, req.body);

      res.json({ course });
    } catch (error: any) {
      console.error('Error adding module:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }

  /**
   * Publish course (admin)
   */
  static async publishCourse(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const course = await AcademyService.publishCourse(id);

      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      res.json({ course });
    } catch (error) {
      console.error('Error publishing course:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get course analytics (admin)
   */
  static async getCourseAnalytics(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const analytics = await AcademyService.getCourseAnalytics(id);

      res.json(analytics);
    } catch (error: any) {
      console.error('Error getting course analytics:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }
}
