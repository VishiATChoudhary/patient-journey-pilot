# Patient Journey Pilot

A document processing pipeline application that helps streamline and analyze patient documents before they reach doctors, with specialized processing modes for different patient demographics.

## Prerequisites

- Python 3.12
- Node.js and npm
- OpenAI API Key
- Gemini API Key

## Setup Instructions

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Create a `.env` file in the root directory with the following variables:
```env
OPENAI_API_KEY=your_openai_api_key
VITE_OPENAI_API_KEY=your_openai_api_key
REACT_APP_GEMINI_API_KEY=your_gemini_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

Note: The Vite and React environment variables should contain the same API keys.

3. Set up the vector database:
```bash
python vdb_setup.py
```

4. In a separate terminal, install and start the frontend:
```bash
npm install
npm start
```

## Application Overview

This application implements a document processing pipeline that analyzes and prepares patient documents before they reach doctors. The system features two distinct processing modes:

### Normal Mode
The standard processing stream designed for general patient documents. This mode:
- Processes standard medical documentation
- Performs basic document analysis
- Extracts key medical information
- Prepares documents for doctor review

### Fine Wine Age Mode
A specialized processing stream optimized for elderly patients. This mode:
- Implements enhanced sensitivity to age-related medical terminology
- Provides additional context for geriatric care considerations
- Includes specialized analysis for chronic conditions common in elderly patients
- Offers more detailed medical history tracking

Both modes utilize advanced AI processing to ensure accurate and efficient document handling while maintaining patient privacy and medical compliance standards.
