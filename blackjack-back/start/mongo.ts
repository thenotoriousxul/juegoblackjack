import mongoose from 'mongoose';
import env from '#start/env';

export async function connectToMongoDB() {
    const mongoUrl = env.get('MONGO_URL');
    if (!mongoUrl) {
        throw new Error('MONGO_URL is not defined in the environment variables');
    }
    
    try {
        await mongoose.connect(mongoUrl, {
            // Configuraciones recomendadas para MongoDB Atlas
            maxPoolSize: 10, // Mantener hasta 10 conexiones socket
            serverSelectionTimeoutMS: 5000, // Mantener intentando seleccionar servidor por 5 segundos
            socketTimeoutMS: 45000, // Cerrar sockets después de 45 segundos de inactividad
            bufferCommands: false, // Deshabilitar mongoose buffering
        });
        console.log('✅ Connected to MongoDB Atlas successfully');
        console.log(`🗄️  Database: ${mongoose.connection.name}`);
    } catch (error) {
        console.error('❌ Error connecting to MongoDB:', error);
        throw error;
    }
}

export async function disconnectFromMongoDB() {
    try {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB successfully');
    } catch (error) {
        console.error('Error disconnecting from MongoDB:', error);
        throw error;
    }
}