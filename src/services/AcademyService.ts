import AcademyCourse from '../models/AcademyCourse';
import AcademyProgress from '../models/AcademyProgress';
import { NotificationService } from './NotificationService';

export class AcademyService {
  /**
   * Get all courses
   */
  static async getCourses(filters: {
    category?: string;
    status?: string;
    targetAudience?: string;
    page?: number;
    limit?: number;
  }) {
    const query: any = {};
    
    if (filters.category) query.category = filters.category;
    if (filters.status) query.status = filters.status;
    if (filters.targetAudience) {
      query.targetAudience = { $in: [filters.targetAudience, 'all'] };
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const courses = await AcademyCourse.find(query)
      .sort({ enrollments: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AcademyCourse.countDocuments(query);

    return {
      courses,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  /**
   * Get course by ID or slug
   */
  static async getCourse(identifier: string) {
    const course = await AcademyCourse.findOne({
      $or: [
        { _id: identifier },
        { slug: identifier },
      ],
    });
    return course;
  }

  /**
   * Create a course
   */
  static async createCourse(data: {
    title: string;
    slug: string;
    description: string;
    category: string;
    targetAudience: string;
    requiredPlan?: string;
    hasCertificate?: boolean;
    passingScore?: number;
  }) {
    const course = new AcademyCourse({
      ...data,
      modules: [],
      status: 'draft',
    });

    await course.save();
    return course;
  }

  /**
   * Add module to course
   */
  static async addModule(courseId: string, moduleData: {
    title: string;
    lessons: Array<{
      title: string;
      type: 'video' | 'article' | 'quiz';
      content?: string;
      videoUrl?: string;
      durationMinutes: number;
    }>;
  }) {
    const course = await AcademyCourse.findById(courseId);
    if (!course) throw new Error('Course not found');

    const order = course.modules.length;
    
    course.modules.push({
      title: moduleData.title,
      order,
      lessons: moduleData.lessons.map((lesson, index) => ({
        ...lesson,
        order: index,
      })),
    });

    await course.save();
    return course;
  }

  /**
   * Publish course
   */
  static async publishCourse(courseId: string) {
    return AcademyCourse.findByIdAndUpdate(
      courseId,
      { status: 'published', publishedAt: new Date() },
      { new: true }
    );
  }

  /**
   * Enroll user in course
   */
  static async enrollUser(userId: string, courseId: string) {
    const existing = await AcademyProgress.findOne({ user: userId, course: courseId });
    if (existing) {
      return existing;
    }

    const progress = new AcademyProgress({
      user: userId,
      course: courseId,
      status: 'enrolled',
      enrolledAt: new Date(),
    });

    await progress.save();

    // Update course enrollment count
    await AcademyCourse.findByIdAndUpdate(courseId, {
      $inc: { enrollments: 1 },
    });

    return progress;
  }

  /**
   * Complete a lesson
   */
  static async completeLesson(
    userId: string,
    courseId: string,
    moduleIndex: number,
    lessonIndex: number
  ) {
    let progress = await AcademyProgress.findOne({ user: userId, course: courseId });
    
    if (!progress) {
      progress = await this.enrollUser(userId, courseId);
    }

    // Check if already completed
    const alreadyCompleted = progress.completedLessons.some(
      l => l.moduleIndex === moduleIndex && l.lessonIndex === lessonIndex
    );

    if (!alreadyCompleted) {
      progress.completedLessons.push({
        moduleIndex,
        lessonIndex,
        completedAt: new Date(),
      });

      if (progress.status === 'enrolled') {
        progress.status = 'in-progress';
        progress.startedAt = new Date();
      }

      // Calculate progress
      const course = await AcademyCourse.findById(courseId);
      if (course) {
        const totalLessons = course.modules.reduce(
          (sum, m) => sum + m.lessons.length,
          0
        );
        progress.progressPercent = Math.round(
          (progress.completedLessons.length / totalLessons) * 100
        );

        // Check if course completed
        if (progress.completedLessons.length >= totalLessons) {
          progress.status = 'completed';
          progress.completedAt = new Date();

          // Update course completion count
          await AcademyCourse.findByIdAndUpdate(courseId, {
            $inc: { completions: 1 },
          });

          // Check for certificate
          if (course.hasCertificate) {
            await this.awardCertificate(userId, courseId, progress);
          }

          // Notify user
          await NotificationService.create({
            recipient: userId,
            type: 'achievement',
            title: 'Formation complétée!',
            message: `Vous avez terminé la formation "${course.title}"`,
            priority: 'medium',
            channels: { inApp: true, email: true },
          });
        }
      }

      await progress.save();
    }

    return progress;
  }

  /**
   * Submit quiz result
   */
  static async submitQuizResult(
    userId: string,
    courseId: string,
    moduleIndex: number,
    lessonIndex: number,
    score: number
  ) {
    let progress = await AcademyProgress.findOne({ user: userId, course: courseId });
    
    if (!progress) {
      progress = await this.enrollUser(userId, courseId);
    }

    const existingResult = progress.quizResults.find(
      r => r.moduleIndex === moduleIndex && r.lessonIndex === lessonIndex
    );

    if (existingResult) {
      existingResult.score = Math.max(existingResult.score, score);
      existingResult.attempts += 1;
      existingResult.lastAttemptAt = new Date();
    } else {
      progress.quizResults.push({
        moduleIndex,
        lessonIndex,
        score,
        attempts: 1,
        lastAttemptAt: new Date(),
      });
    }

    // If passed, mark lesson as complete
    const course = await AcademyCourse.findById(courseId);
    if (course && course.passingScore && score >= course.passingScore) {
      await this.completeLesson(userId, courseId, moduleIndex, lessonIndex);
    }

    await progress.save();
    return progress;
  }

  /**
   * Award certificate
   */
  private static async awardCertificate(
    userId: string,
    courseId: string,
    progress: any
  ) {
    const course = await AcademyCourse.findById(courseId);
    if (!course?.hasCertificate) return;

    // Check passing score for quizzes
    if (course.passingScore) {
      const avgScore = progress.quizResults.length > 0
        ? progress.quizResults.reduce((sum: number, r: any) => sum + r.score, 0) / progress.quizResults.length
        : 100;

      if (avgScore < course.passingScore) {
        return;
      }
    }

    // Generate certificate URL (in production, would generate actual PDF)
    const certificateUrl = `/certificates/${courseId}/${userId}`;

    progress.certificateEarned = true;
    progress.certificateUrl = certificateUrl;
    progress.certificateEarnedAt = new Date();
    await progress.save();

    await NotificationService.create({
      recipient: userId,
      type: 'achievement',
      title: 'Certificat obtenu!',
      message: `Vous avez obtenu le certificat pour "${course.title}"`,
      priority: 'high',
      channels: { inApp: true, email: true },
    });
  }

  /**
   * Get user's course progress
   */
  static async getUserProgress(userId: string, courseId?: string) {
    const query: any = { user: userId };
    if (courseId) query.course = courseId;

    const progress = await AcademyProgress.find(query)
      .populate('course', 'title slug category hasCertificate');

    return progress;
  }

  /**
   * Get user's certificates
   */
  static async getUserCertificates(userId: string) {
    return AcademyProgress.find({
      user: userId,
      certificateEarned: true,
    }).populate('course', 'title slug');
  }

  /**
   * Rate course
   */
  static async rateCourse(
    userId: string,
    courseId: string,
    rating: number,
    review?: string
  ) {
    const progress = await AcademyProgress.findOneAndUpdate(
      { user: userId, course: courseId },
      { rating, review },
      { new: true }
    );

    // Update course average rating
    const allRatings = await AcademyProgress.find({
      course: courseId,
      rating: { $exists: true },
    });

    const avgRating = allRatings.reduce((sum, p) => sum + (p.rating || 0), 0) / allRatings.length;

    await AcademyCourse.findByIdAndUpdate(courseId, {
      averageRating: Math.round(avgRating * 10) / 10,
    });

    return progress;
  }

  /**
   * Update lesson time spent
   */
  static async updateTimeSpent(userId: string, courseId: string, minutes: number) {
    return AcademyProgress.findOneAndUpdate(
      { user: userId, course: courseId },
      { $inc: { totalTimeSpentMinutes: minutes } },
      { new: true }
    );
  }

  /**
   * Get course analytics (admin)
   */
  static async getCourseAnalytics(courseId: string) {
    const course = await AcademyCourse.findById(courseId);
    if (!course) throw new Error('Course not found');

    const allProgress = await AcademyProgress.find({ course: courseId });

    const completionRate = allProgress.length > 0
      ? (allProgress.filter(p => p.status === 'completed').length / allProgress.length) * 100
      : 0;

    const avgProgress = allProgress.length > 0
      ? allProgress.reduce((sum, p) => sum + p.progressPercent, 0) / allProgress.length
      : 0;

    const avgTimeSpent = allProgress.length > 0
      ? allProgress.reduce((sum, p) => sum + p.totalTimeSpentMinutes, 0) / allProgress.length
      : 0;

    return {
      course: course.toObject(),
      analytics: {
        totalEnrollments: course.enrollments,
        totalCompletions: course.completions,
        completionRate: Math.round(completionRate * 100) / 100,
        averageProgress: Math.round(avgProgress * 100) / 100,
        averageTimeSpentMinutes: Math.round(avgTimeSpent),
        averageRating: course.averageRating,
      },
    };
  }
}
