const functions = require('firebase-functions');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: functions.config().openai.key
});

exports.generateAIResponse = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to use AI features'
    );
  }

  // Input validation
  if (!data.prompt || typeof data.prompt !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with a valid prompt'
    );
  }

  try {
    const completion = await openai.chat.completions.create({
      model: data.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful writing assistant. Keep responses concise and helpful.'
        },
        {
          role: 'user',
          content: data.context ? `${data.prompt}\n\nContext: ${data.context}` : data.prompt
        }
      ],
      temperature: parseFloat(data.temperature) || 0.7,
      max_tokens: 1000
    });

    return {
      text: completion.choices[0].message.content
    };
  } catch (error) {
    console.error('OpenAI Error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to generate AI response',
      error.message
    );
  }
});