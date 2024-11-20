const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs'); 
const FormData = require('form-data'); 
const app = express();
const router = express.Router();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'your-openai-api-key';

router.post('/ai-audio-update', async (req, res) => {
    try {

        if (!req.files || !req.files.audio) {
            return res.status(400).json({ success: false, message: 'No audio file provided' });
        }

        const audioFile = req.files.audio;

      
        const transcript = await transcribeAudio(audioFile.tempFilePath || audioFile.path); 


        const templateText = req.body.templateText;
        if (!templateText) {
            return res.status(400).json({ success: false, message: 'Missing required field: templateText' });
        }

        console.log('Transcribed text:', transcript);
        console.log('Received templateText:', templateText);

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `You are a specialized text formatter that combines spoken numbers with templates.`
                    },
                    {
                        role: 'user',
                        content: `Please update this template: "${templateText}" using this text: "${transcript}".`
                    }
                ],
                temperature: 0.7,
                max_tokens: 150
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const correctedText = response.data.choices[0].message.content.trim();
        res.json({ success: true, correctedText });

    } catch (error) {
        console.error('Error in /api/ai-audio-update:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

async function transcribeAudio(filePath) {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/audio/transcriptions',
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    ...formData.getHeaders()
                }
            }
        );
        return response.data.text;
    } catch (error) {
        throw new Error(`Transcription failed: ${error.message}`);
    }
}

module.exports = router;
