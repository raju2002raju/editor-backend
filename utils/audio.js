// audioUtils.js
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function transcribeAudio(filePath) {
    // First, verify the file exists and is readable
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    // Verify file size
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    if (fileSizeInMB > 25) { // Whisper API limit
        throw new Error('File size exceeds 25MB limit');
    }

    const formData = new FormData();
    
    // Add file to form data with proper content type
    const fileStream = fs.createReadStream(filePath);
    formData.append('file', fileStream, {
        filename: path.basename(filePath),
        contentType: 'audio/wav' // Ensure proper content type
    });
    
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    formData.append('response_format', 'json');

    try {
        console.log('Sending request to OpenAI Whisper API...');
        const response = await axios.post(
            'https://api.openai.com/v1/audio/transcriptions',
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    ...formData.getHeaders()
                },
                maxBodyLength: Infinity,
                timeout: 30000 // 30 second timeout
            }
        );

        console.log('Transcription response:', response.data);
        return response.data.text;
    } catch (error) {
        console.error('Transcription error details:', error.response?.data || error.message);
        if (error.response?.status === 400) {
            throw new Error('Invalid audio file format. Please ensure the file is WAV format with proper encoding.');
        }
        throw new Error(`Transcription failed: ${error.message}`);
    } finally {
        // Clean up file stream
        fileStream.destroy();
    }
}

async function getChatCompletion(transcript, templateText = '') {
    try {
        if (!transcript) {
            throw new Error('Missing transcript');
        }

        const messages = [
            {
                role: 'system',
                content: `You are a legal document assistant. Your task is to format the following update in a clean, professional manner. 
                         Return ONLY the formatted text without any additional commentary.
                         ${templateText ? `Use this template as context: ${templateText}` : ''}`
            },
            {
                role: 'user',
                content: transcript.trim()
            }
        ];

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages,
                temperature: 0.3,
                max_tokens: 500,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const formattedText = response.data?.choices?.[0]?.message?.content?.trim();
        if (!formattedText) {
            throw new Error('Invalid response from OpenAI API');
        }

        return {
            success: true,
            spokenText: transcript,
            formattedText,
            mergedText: formattedText
        };
    } catch (error) {
        console.error('Chat completion error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.message || 'Unknown error occurred',
            spokenText: transcript
        };
    }
}

module.exports = {
    transcribeAudio,
    getChatCompletion
};