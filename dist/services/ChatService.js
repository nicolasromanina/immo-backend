"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const GroqService_1 = require("./GroqService");
const ChatModel_1 = require("../models/ChatModel");
const assistants_1 = require("../assistants");
const mongodb_1 = require("mongodb");
class ChatService {
    constructor() {
        this.groqService = new GroqService_1.GroqService();
    }
    async handleChat(request, stream = true) {
        try {
            const { messages, assistantType = 'buyer', userId, conversationId } = request;
            // Valider les messages
            this.validateMessages(messages);
            // Préparer les messages avec le prompt système
            const preparedMessages = assistants_1.AssistantFactory.prepareMessages(assistantType, messages);
            if (stream) {
                // Streaming response
                const streamResponse = await this.groqService.createChatCompletion(preparedMessages);
                // Sauvegarder la conversation si userId est fourni (en arrière-plan)
                if (userId) {
                    this.saveConversationInBackground(userId, assistantType, preparedMessages, conversationId)
                        .catch(error => console.error('Background save error:', error));
                }
                return streamResponse;
            }
            else {
                // Non-streaming response
                const responseContent = await this.groqService.createNonStreamingCompletion(preparedMessages);
                // Créer la réponse complète
                const fullResponse = {
                    role: 'assistant',
                    content: responseContent || 'Désolé, je n\'ai pas pu générer de réponse.',
                };
                // Sauvegarder la conversation
                let savedConversationId = conversationId;
                if (userId) {
                    try {
                        savedConversationId = await this.saveConversation(userId, assistantType, [...preparedMessages, fullResponse], conversationId);
                    }
                    catch (saveError) {
                        console.error('Failed to save conversation:', saveError);
                        // Ne pas échouer la requête si la sauvegarde échoue
                    }
                }
                return {
                    success: true,
                    data: {
                        content: fullResponse.content,
                        conversationId: savedConversationId || '',
                        messageId: new mongodb_1.ObjectId().toString(),
                        timestamp: new Date().toISOString(),
                    },
                };
            }
        }
        catch (error) {
            console.error('Chat service error:', error);
            // Gérer les erreurs spécifiques
            if (error.status === 429) {
                throw new Error('Trop de requêtes. Réessayez plus tard.');
            }
            else if (error.status === 402) {
                throw new Error('Crédits épuisés.');
            }
            else if (error.message?.includes('rate limit')) {
                throw new Error('Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.');
            }
            throw new Error(error.message || 'Erreur du service IA');
        }
    }
    validateMessages(messages) {
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            throw new Error('Les messages sont requis et doivent être un tableau non vide');
        }
        // Vérifier que le dernier message est de l'utilisateur
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role !== 'user') {
            throw new Error('Le dernier message doit provenir de l\'utilisateur');
        }
        // Valider chaque message
        messages.forEach((msg, index) => {
            if (!msg.role || !msg.content) {
                throw new Error(`Message ${index} invalide: role et content sont requis`);
            }
            if (!['system', 'user', 'assistant'].includes(msg.role)) {
                throw new Error(`Message ${index} invalide: role '${msg.role}' non reconnu`);
            }
            if (typeof msg.content !== 'string') {
                throw new Error(`Message ${index} invalide: content doit être une chaîne de caractères`);
            }
        });
    }
    async saveConversation(userId, assistantType, messages, conversationId) {
        try {
            // Valider l'ID de conversation si fourni
            if (conversationId && !mongodb_1.ObjectId.isValid(conversationId)) {
                throw new Error('ID de conversation invalide');
            }
            if (conversationId) {
                // Mettre à jour la conversation existante
                const updated = await ChatModel_1.ConversationModel.findOneAndUpdate({ _id: conversationId, userId }, {
                    $push: {
                        messages: {
                            $each: messages.slice(-2), // Ajouter seulement les 2 derniers messages
                            $position: 0
                        }
                    },
                    updatedAt: new Date(),
                }, {
                    new: true,
                    upsert: false // Ne pas créer si non existant
                });
                if (!updated) {
                    // Si la conversation n'existe pas ou n'appartient pas à l'utilisateur, en créer une nouvelle
                    return await this.createNewConversation(userId, assistantType, messages);
                }
                return conversationId;
            }
            else {
                // Créer une nouvelle conversation
                return await this.createNewConversation(userId, assistantType, messages);
            }
        }
        catch (error) {
            console.error('Error saving conversation:', error);
            throw new Error('Échec de la sauvegarde de la conversation');
        }
    }
    async createNewConversation(userId, assistantType, messages) {
        const conversation = new ChatModel_1.ConversationModel({
            userId,
            assistantType,
            messages: messages.slice(-10), // Limiter à 10 derniers messages pour la nouvelle conversation
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await conversation.save();
        return conversation._id.toString();
    }
    async saveConversationInBackground(userId, assistantType, messages, conversationId) {
        try {
            await this.saveConversation(userId, assistantType, messages, conversationId);
        }
        catch (error) {
            // Log l'erreur mais ne la propage pas
            console.error('Background conversation save failed:', error);
        }
    }
    async getUserConversations(userId, assistantType, limit = 20, page = 1) {
        try {
            // Valider les paramètres
            if (!userId) {
                throw new Error('User ID is required');
            }
            if (limit > 50)
                limit = 50; // Limite maximale
            if (page < 1)
                page = 1;
            const query = { userId };
            if (assistantType && ['buyer', 'promoter', 'admin'].includes(assistantType)) {
                query.assistantType = assistantType;
            }
            const skip = (page - 1) * limit;
            // Exécuter les requêtes en parallèle
            const [conversations, total] = await Promise.all([
                ChatModel_1.ConversationModel.find(query)
                    .sort({ updatedAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .select('_id assistantType messages updatedAt')
                    .lean(),
                ChatModel_1.ConversationModel.countDocuments(query)
            ]);
            // Formater les conversations pour la réponse
            const formattedConversations = conversations.map(conv => ({
                id: conv._id.toString(),
                assistantType: conv.assistantType,
                lastMessage: conv.messages.length > 0
                    ? conv.messages[conv.messages.length - 1]?.content.substring(0, 100) + '...'
                    : '',
                messageCount: conv.messages.length,
                updatedAt: conv.updatedAt,
            }));
            return {
                conversations: formattedConversations,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1,
                },
            };
        }
        catch (error) {
            console.error('Get user conversations error:', error);
            throw new Error('Échec de la récupération des conversations');
        }
    }
    async getConversationById(conversationId, userId) {
        try {
            if (!mongodb_1.ObjectId.isValid(conversationId)) {
                throw new Error('ID de conversation invalide');
            }
            const conversation = await ChatModel_1.ConversationModel.findOne({
                _id: conversationId,
                userId
            }).select('-__v').lean();
            if (!conversation) {
                throw new Error('Conversation non trouvée');
            }
            return {
                id: conversation._id.toString(),
                userId: conversation.userId,
                assistantType: conversation.assistantType,
                messages: conversation.messages,
                createdAt: conversation.createdAt,
                updatedAt: conversation.updatedAt,
            };
        }
        catch (error) {
            console.error('Get conversation by ID error:', error);
            throw new Error('Échec de la récupération de la conversation');
        }
    }
    async deleteConversation(conversationId, userId) {
        try {
            if (!mongodb_1.ObjectId.isValid(conversationId)) {
                throw new Error('ID de conversation invalide');
            }
            const result = await ChatModel_1.ConversationModel.deleteOne({
                _id: conversationId,
                userId,
            });
            if (result.deletedCount === 0) {
                throw new Error('Conversation non trouvée ou non autorisée');
            }
            return true;
        }
        catch (error) {
            console.error('Delete conversation error:', error);
            throw new Error('Échec de la suppression de la conversation');
        }
    }
    async clearUserConversations(userId, assistantType) {
        try {
            const query = { userId };
            if (assistantType && ['buyer', 'promoter', 'admin'].includes(assistantType)) {
                query.assistantType = assistantType;
            }
            const result = await ChatModel_1.ConversationModel.deleteMany(query);
            return {
                deletedCount: result.deletedCount,
                success: true
            };
        }
        catch (error) {
            console.error('Clear conversations error:', error);
            throw new Error('Échec de la suppression des conversations');
        }
    }
    async updateConversationTitle(conversationId, userId, title) {
        try {
            if (!mongodb_1.ObjectId.isValid(conversationId)) {
                throw new Error('ID de conversation invalide');
            }
            if (!title || title.trim().length === 0) {
                throw new Error('Le titre est requis');
            }
            const updated = await ChatModel_1.ConversationModel.findOneAndUpdate({ _id: conversationId, userId }, {
                title: title.trim().substring(0, 100),
                updatedAt: new Date()
            }, { new: true });
            if (!updated) {
                throw new Error('Conversation non trouvée ou non autorisée');
            }
            return {
                id: updated._id.toString(),
                title: updated.title,
                updatedAt: updated.updatedAt
            };
        }
        catch (error) {
            console.error('Update conversation title error:', error);
            throw new Error('Échec de la mise à jour du titre');
        }
    }
}
exports.ChatService = ChatService;
