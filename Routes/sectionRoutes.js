const express = require('express');
const router = express.Router();
const DynamicModel = require('../Models/section');
const mongoose = require('mongoose');

// Function to fetch all documents
async function fetchAllDocuments() {
  try {
    const documents = await DynamicModel.find({}).lean();
    return documents;
  } catch (error) {
    throw error;
  }
}

// Function to fetch a document by ID
async function fetchDocumentById(id) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid document ID');
    }
    const document = await DynamicModel.findById(id).lean();
    return document;
  } catch (error) {
    throw error;
  }
}

// API endpoint to get all documents
router.get('/documents', async (req, res) => {
  try {
    const documents = await fetchAllDocuments();
    console.log('Raw documents:', JSON.stringify(documents, null, 2));
    
    const formattedDocuments = documents.map(doc => ({
      _id: doc._id.toString(),
      name: doc.fileName || 'Untitled Document',
      content: doc.content || ''
    }));
    
    console.log('Formatted Documents:', JSON.stringify(formattedDocuments, null, 2));
    res.json(formattedDocuments);
  } catch (error) {
    console.error('Error in /documents:', error);
    res.status(500).json({ message: error.message });
  }
});

// API endpoint to get a specific document by ID
router.get('/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Requested document ID:', id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid document ID format' });
    }

    const document = await fetchDocumentById(id);
    console.log('Found document:', JSON.stringify(document, null, 2));

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const formattedDocument = {
      _id: document._id.toString(),
      name: document.fileName || 'Untitled Document',
      content: document.content || ''
    };

    res.json(formattedDocument);
  } catch (error) {
    console.error('Error in /documents/:id:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;