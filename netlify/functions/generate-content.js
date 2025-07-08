// netlify/functions/generate-content.js
// This file will run on the Netlify server, NOT in the user's browser.
const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
    // Ensure the request is a POST request
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' }),
        };
    }

    // Get your API key from environment variables (set in Netlify UI)
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Server configuration error: API key not set in Netlify environment variables.' }),
        };
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash"}); // Using gemini-2.5-flash as it's typically faster and cheaper

    try {
        const { prompt } = JSON.parse(event.body);

        if (!prompt) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Bad Request: Prompt is missing.' }),
            };
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const generatedText = response.text();

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: generatedText }),
        };
    } catch (error) {
        console.error('Error in serverless function:', error);
        // Be careful not to expose too much internal error detail to the client
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to generate content via API.', error: error.message }),
        };
    }
};