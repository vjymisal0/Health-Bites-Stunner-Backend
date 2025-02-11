const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables

const mongoUrl = process.env.Mongo_url;

// Log the URL to check if it is correctly loaded from the environment variable
console.log(`MongoDB URL: ${mongoUrl}`);

if (!mongoUrl) {
    console.error('MongoDB URL not found in environment variables.');
    process.exit(1); // Exit the process if MongoDB URL is not provided
}

// Connect to MongoDB
mongoose.connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log('MongoDB connection established successfully');
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
        process.exit(1); // Exit the process in case of connection error
    });

// Check the connection status
const db = mongoose.connection;

db.on('connected', () => {
    console.log('Mongoose connected to the database');
});

db.on('disconnected', () => {
    console.log('Mongoose disconnected from the database');
});

db.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

module.exports = db;
