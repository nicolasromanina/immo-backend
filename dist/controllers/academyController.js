"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcademyController = void 0;
const AcademyService_1 = require("../services/AcademyService");
class AcademyController {
    /**
     * Get all courses
     */
    static async getCourses(req, res) {
        try {
            const { category, page, limit } = req.query;
            const result = await AcademyService_1.AcademyService.getCourses({
                category: category,
                status: 'published',
                targetAudience: req.user?.roles?.[0] || 'all',
                page: page ? parseInt(page) : 1,
                limit: limit ? parseInt(limit) : 20,
            });
            res.json(result);
        }
        catch (error) {
            console.error('Error getting courses:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get course by ID
     */
    static async getCourse(req, res) {
        try {
            const { id } = req.params;
            const course = await AcademyService_1.AcademyService.getCourse(id);
            if (!course) {
                return res.status(404).json({ message: 'Course not found' });
            }
            res.json({ course });
        }
        catch (error) {
            console.error('Error getting course:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Enroll in course
     */
    static async enrollInCourse(req, res) {
        try {
            const { id } = req.params;
            const progress = await AcademyService_1.AcademyService.enrollUser(req.user.id, id);
            res.status(201).json({ progress });
        }
        catch (error) {
            console.error('Error enrolling in course:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Complete lesson
     */
    static async completeLesson(req, res) {
        try {
            const { id } = req.params;
            const { moduleIndex, lessonIndex } = req.body;
            if (moduleIndex === undefined || lessonIndex === undefined) {
                return res.status(400).json({ message: 'Module and lesson index are required' });
            }
            const progress = await AcademyService_1.AcademyService.completeLesson(req.user.id, id, moduleIndex, lessonIndex);
            res.json({ progress });
        }
        catch (error) {
            console.error('Error completing lesson:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Submit quiz
     */
    static async submitQuiz(req, res) {
        try {
            const { id } = req.params;
            const { moduleIndex, lessonIndex, score } = req.body;
            if (moduleIndex === undefined || lessonIndex === undefined || score === undefined) {
                return res.status(400).json({ message: 'Module, lesson index and score are required' });
            }
            const progress = await AcademyService_1.AcademyService.submitQuizResult(req.user.id, id, moduleIndex, lessonIndex, score);
            res.json({ progress });
        }
        catch (error) {
            console.error('Error submitting quiz:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get my progress
     */
    static async getMyProgress(req, res) {
        try {
            const { courseId } = req.query;
            const progress = await AcademyService_1.AcademyService.getUserProgress(req.user.id, courseId);
            res.json({ progress });
        }
        catch (error) {
            console.error('Error getting progress:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get my certificates
     */
    static async getMyCertificates(req, res) {
        try {
            const certificates = await AcademyService_1.AcademyService.getUserCertificates(req.user.id);
            res.json({ certificates });
        }
        catch (error) {
            console.error('Error getting certificates:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Rate course
     */
    static async rateCourse(req, res) {
        try {
            const { id } = req.params;
            const { rating, review } = req.body;
            if (!rating || rating < 1 || rating > 5) {
                return res.status(400).json({ message: 'Rating must be between 1 and 5' });
            }
            const progress = await AcademyService_1.AcademyService.rateCourse(req.user.id, id, rating, review);
            res.json({ progress });
        }
        catch (error) {
            console.error('Error rating course:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Update time spent
     */
    static async updateTimeSpent(req, res) {
        try {
            const { id } = req.params;
            const { minutes } = req.body;
            if (!minutes || minutes < 0) {
                return res.status(400).json({ message: 'Valid minutes value is required' });
            }
            const progress = await AcademyService_1.AcademyService.updateTimeSpent(req.user.id, id, minutes);
            res.json({ progress });
        }
        catch (error) {
            console.error('Error updating time spent:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    // Admin endpoints
    /**
     * Create course (admin)
     */
    static async createCourse(req, res) {
        try {
            const course = await AcademyService_1.AcademyService.createCourse(req.body);
            res.status(201).json({ course });
        }
        catch (error) {
            console.error('Error creating course:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Add module to course (admin)
     */
    static async addModule(req, res) {
        try {
            const { id } = req.params;
            const course = await AcademyService_1.AcademyService.addModule(id, req.body);
            res.json({ course });
        }
        catch (error) {
            console.error('Error adding module:', error);
            res.status(500).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Publish course (admin)
     */
    static async publishCourse(req, res) {
        try {
            const { id } = req.params;
            const course = await AcademyService_1.AcademyService.publishCourse(id);
            if (!course) {
                return res.status(404).json({ message: 'Course not found' });
            }
            res.json({ course });
        }
        catch (error) {
            console.error('Error publishing course:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get course analytics (admin)
     */
    static async getCourseAnalytics(req, res) {
        try {
            const { id } = req.params;
            const analytics = await AcademyService_1.AcademyService.getCourseAnalytics(id);
            res.json(analytics);
        }
        catch (error) {
            console.error('Error getting course analytics:', error);
            res.status(500).json({ message: error.message || 'Server error' });
        }
    }
}
exports.AcademyController = AcademyController;
