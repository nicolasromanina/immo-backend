"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcademyService = void 0;
const AcademyCourse_1 = __importDefault(require("../models/AcademyCourse"));
const AcademyProgress_1 = __importDefault(require("../models/AcademyProgress"));
const NotificationService_1 = require("./NotificationService");
class AcademyService {
    /**
     * Get all courses
     */
    static async getCourses(filters) {
        const query = {};
        if (filters.category)
            query.category = filters.category;
        if (filters.status)
            query.status = filters.status;
        if (filters.targetAudience) {
            query.targetAudience = { $in: [filters.targetAudience, 'all'] };
        }
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;
        const courses = await AcademyCourse_1.default.find(query)
            .sort({ enrollments: -1 })
            .skip(skip)
            .limit(limit);
        const total = await AcademyCourse_1.default.countDocuments(query);
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
    static async getCourse(identifier) {
        const course = await AcademyCourse_1.default.findOne({
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
    static async createCourse(data) {
        const course = new AcademyCourse_1.default({
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
    static async addModule(courseId, moduleData) {
        const course = await AcademyCourse_1.default.findById(courseId);
        if (!course)
            throw new Error('Course not found');
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
    static async publishCourse(courseId) {
        return AcademyCourse_1.default.findByIdAndUpdate(courseId, { status: 'published', publishedAt: new Date() }, { new: true });
    }
    /**
     * Enroll user in course
     */
    static async enrollUser(userId, courseId) {
        const existing = await AcademyProgress_1.default.findOne({ user: userId, course: courseId });
        if (existing) {
            return existing;
        }
        const progress = new AcademyProgress_1.default({
            user: userId,
            course: courseId,
            status: 'enrolled',
            enrolledAt: new Date(),
        });
        await progress.save();
        // Update course enrollment count
        await AcademyCourse_1.default.findByIdAndUpdate(courseId, {
            $inc: { enrollments: 1 },
        });
        return progress;
    }
    /**
     * Complete a lesson
     */
    static async completeLesson(userId, courseId, moduleIndex, lessonIndex) {
        let progress = await AcademyProgress_1.default.findOne({ user: userId, course: courseId });
        if (!progress) {
            progress = await this.enrollUser(userId, courseId);
        }
        // Check if already completed
        const alreadyCompleted = progress.completedLessons.some(l => l.moduleIndex === moduleIndex && l.lessonIndex === lessonIndex);
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
            const course = await AcademyCourse_1.default.findById(courseId);
            if (course) {
                const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
                progress.progressPercent = Math.round((progress.completedLessons.length / totalLessons) * 100);
                // Check if course completed
                if (progress.completedLessons.length >= totalLessons) {
                    progress.status = 'completed';
                    progress.completedAt = new Date();
                    // Update course completion count
                    await AcademyCourse_1.default.findByIdAndUpdate(courseId, {
                        $inc: { completions: 1 },
                    });
                    // Check for certificate
                    if (course.hasCertificate) {
                        await this.awardCertificate(userId, courseId, progress);
                    }
                    // Notify user
                    await NotificationService_1.NotificationService.create({
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
    static async submitQuizResult(userId, courseId, moduleIndex, lessonIndex, score) {
        let progress = await AcademyProgress_1.default.findOne({ user: userId, course: courseId });
        if (!progress) {
            progress = await this.enrollUser(userId, courseId);
        }
        const existingResult = progress.quizResults.find(r => r.moduleIndex === moduleIndex && r.lessonIndex === lessonIndex);
        if (existingResult) {
            existingResult.score = Math.max(existingResult.score, score);
            existingResult.attempts += 1;
            existingResult.lastAttemptAt = new Date();
        }
        else {
            progress.quizResults.push({
                moduleIndex,
                lessonIndex,
                score,
                attempts: 1,
                lastAttemptAt: new Date(),
            });
        }
        // If passed, mark lesson as complete
        const course = await AcademyCourse_1.default.findById(courseId);
        if (course && course.passingScore && score >= course.passingScore) {
            await this.completeLesson(userId, courseId, moduleIndex, lessonIndex);
        }
        await progress.save();
        return progress;
    }
    /**
     * Award certificate
     */
    static async awardCertificate(userId, courseId, progress) {
        const course = await AcademyCourse_1.default.findById(courseId);
        if (!course?.hasCertificate)
            return;
        // Check passing score for quizzes
        if (course.passingScore) {
            const avgScore = progress.quizResults.length > 0
                ? progress.quizResults.reduce((sum, r) => sum + r.score, 0) / progress.quizResults.length
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
        await NotificationService_1.NotificationService.create({
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
    static async getUserProgress(userId, courseId) {
        const query = { user: userId };
        if (courseId)
            query.course = courseId;
        const progress = await AcademyProgress_1.default.find(query)
            .populate('course', 'title slug category hasCertificate');
        return progress;
    }
    /**
     * Get user's certificates
     */
    static async getUserCertificates(userId) {
        return AcademyProgress_1.default.find({
            user: userId,
            certificateEarned: true,
        }).populate('course', 'title slug');
    }
    /**
     * Rate course
     */
    static async rateCourse(userId, courseId, rating, review) {
        const progress = await AcademyProgress_1.default.findOneAndUpdate({ user: userId, course: courseId }, { rating, review }, { new: true });
        // Update course average rating
        const allRatings = await AcademyProgress_1.default.find({
            course: courseId,
            rating: { $exists: true },
        });
        const avgRating = allRatings.reduce((sum, p) => sum + (p.rating || 0), 0) / allRatings.length;
        await AcademyCourse_1.default.findByIdAndUpdate(courseId, {
            averageRating: Math.round(avgRating * 10) / 10,
        });
        return progress;
    }
    /**
     * Update lesson time spent
     */
    static async updateTimeSpent(userId, courseId, minutes) {
        return AcademyProgress_1.default.findOneAndUpdate({ user: userId, course: courseId }, { $inc: { totalTimeSpentMinutes: minutes } }, { new: true });
    }
    /**
     * Get course analytics (admin)
     */
    static async getCourseAnalytics(courseId) {
        const course = await AcademyCourse_1.default.findById(courseId);
        if (!course)
            throw new Error('Course not found');
        const allProgress = await AcademyProgress_1.default.find({ course: courseId });
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
exports.AcademyService = AcademyService;
