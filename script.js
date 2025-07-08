// Remove this line: const API_KEY = "AIzaSyCeaVHVCsXjcCtG03r-fPv6vFLC4fuJr2c";

// Your existing sheet URLs (ensure these are correct)
const NCERT_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgm9W0EEVTGv2K8Zg77JKZH_WzNmEBz5KpXNWR_t8HdUdimKX67PaVV8cIUjfVzlzvTBAYeGi36ewE/pubhtml"; // Replace with your actual URL
const STANDARD_BOOKS_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSKKG_8zpTqcTahdKDr9FKLfjv8a5DRdvy-_mJIUZa5pMGicCf1G1fVBiMwG1pyBKTlLDRjIOdcikr8/pubhtml"; // Replace with your actual URL
const PYQS_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmviPVyDKD96PN9JYSZfNu4hRZOsNPfFSF18nuKMKPEE7uwhnOkB8XIAr2N6wJn-ciQDeTnSVdp_ut/pubhtml"; // Replace if you fetch PYQs data from a sheet

// Global variables for data and state
let ncertData = {};
let standardBooksData = {};
let pyqsData = {}; // If you fetch PYQs from a sheet, populate this
let currentContentType = 'ncert';
let currentSummary = ''; // To store the summary for "Generate MCQs from Summary"

// DOM Elements
const contentTypeSelect = document.getElementById('contentTypeSelect');
const subjectSelect = document.getElementById('subjectSelect');
const topicSelect = document.getElementById('topicSelect');
const pyqsYearContainer = document.getElementById('pyqsYearContainer');
const pyqsYearSelect = document.getElementById('pyqsYearSelect');
const generateSummaryBtn = document.getElementById('generateSummaryBtn');
const generateMCQsBtn = document.getElementById('generateMCQsBtn');
const generateMCQsFromSummaryBtn = document.getElementById('generateMCQsFromSummaryBtn');
const contentArea = document.getElementById('contentArea');
const loadingIndicator = document.getElementById('loading');

// --- Utility Functions ---

async function fetchSheetData(sheetUrl) {
    if (!sheetUrl || sheetUrl.includes('YOUR_')) {
        console.error('Sheet URL is not configured. Please update the JavaScript with actual Google Sheet URLs.');
        contentArea.innerHTML = `<p style="color: red; text-align: center; padding: 20px; border: 1px solid red; background-color: #ffebee; border-radius: 5px;">
            <strong>Configuration Error:</strong> Google Sheet URLs are not set up. Please replace "YOUR_NCERT_GOOGLE_SHEET_PUBLISHED_URL", etc., with your actual published Google Sheet URLs.
        </p>`;
        return null;
    }
    try {
        const response = await fetch(sheetUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const rows = text.split('\n').map(row => row.trim()).filter(row => row);
        const headers = rows[0].split('\t').map(header => header.trim());
        const data = {};

        for (let i = 1; i < rows.length; i++) {
            const values = rows[i].split('\t').map(val => val.trim());
            const rowObject = {};
            headers.forEach((header, index) => {
                rowObject[header] = values[index];
            });

            const subject = rowObject.Subject;
            const topic = rowObject.Topic;

            if (subject && topic) {
                if (!data[subject]) {
                    data[subject] = {};
                }
                if (!data[subject][topic]) {
                    data[subject][topic] = { content: '', keywords: '' };
                }
                data[subject][topic].content = rowObject.Content;
                data[subject][topic].keywords = rowObject.Keywords || '';
            }
        }
        return data;
    } catch (error) {
        console.error('Error fetching sheet data:', error);
        contentArea.innerHTML = `<p style="color: red; text-align: center; padding: 20px; border: 1px solid red; background-color: #ffebee; border-radius: 5px;">
            <strong>Data Fetch Error:</strong> Failed to load data from Google Sheet. Please ensure the URL is correct and the sheet is published for anyone with the link. Error: ${error.message}
        </p>`;
        return null;
    }
}

function populateControls() {
    let dataToUse;
    switch (currentContentType) {
        case 'ncert':
            dataToUse = ncertData;
            pyqsYearContainer.style.display = 'none';
            generateMCQsFromSummaryBtn.style.display = 'none';
            break;
        case 'standardBooks':
            dataToUse = standardBooksData;
            pyqsYearContainer.style.display = 'none';
            // Check if STANDARD_BOOKS_SHEET_URL is still placeholder
            if (STANDARD_BOOKS_SHEET_URL.includes('YOUR_') && Object.keys(standardBooksData).length === 0) {
                subjectSelect.innerHTML = '<option value="">Please configure Standard Books Sheet URL first</option>';
                topicSelect.innerHTML = '<option value="">Select a subject first</option>';
                return; // Stop further population until URL is configured
            }
            generateMCQsFromSummaryBtn.style.display = 'none';
            break;
        case 'pyqs':
            populatePyqsYears();
            pyqsYearContainer.style.display = 'block';
            dataToUse = pyqsData; // PYQs data could be from a sheet or just dynamic topics/years
            generateMCQsFromSummaryBtn.style.display = 'none';
            break;
    }

    // Clear and populate subjects
    subjectSelect.innerHTML = '<option value="">Select Subject</option>';
    if (dataToUse && Object.keys(dataToUse).length > 0) {
        Object.keys(dataToUse).forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    } else if (currentContentType !== 'pyqs') { // Don't show this for PYQs unless pyqsData is truly empty from a sheet
        subjectSelect.innerHTML = '<option value="">No data available for this content type</option>';
    }

    // Clear topics
    topicSelect.innerHTML = '<option value="">Select Topic</option>';
}

function populateSubtopics() {
    const selectedSubject = subjectSelect.value;
    topicSelect.innerHTML = '<option value="">Select Topic</option>';

    let dataToUse;
    switch (currentContentType) {
        case 'ncert':
            dataToUse = ncertData;
            break;
        case 'standardBooks':
            dataToUse = standardBooksData;
            break;
        case 'pyqs':
            dataToUse = pyqsData; // For PYQs, 'subjects' might be years or static categories
            break;
    }

    if (selectedSubject && dataToUse && dataToUse[selectedSubject]) {
        Object.keys(dataToUse[selectedSubject]).forEach(topic => {
            const option = document.createElement('option');
            option.value = topic;
            option.textContent = topic;
            topicSelect.appendChild(option);
        });
    } else if (currentContentType === 'pyqs') {
        // Special handling for PYQs if topics are not strictly hierarchical like NCERT
        // For PYQs, if 'subjects' are years, we might just have generic topics or rely on user prompt
        // If your PYQs sheet also has Subject->Topic, this will work.
        // If PYQs are just year based, you might not populate topics from dataToUse for PYQs
    }
}

function populatePyqsYears() {
    pyqsYearSelect.innerHTML = '<option value="">Select Year</option>';
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 1; year >= 2013; year--) { // Example range
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        pyqsYearSelect.appendChild(option);
    }
}

function displayMCQs(mcqsJson) {
    if (!mcqsJson) {
        contentArea.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">Could not generate MCQs. Please try again or with a different topic.</p>`;
        return;
    }

    let mcqHtml = `<h2>🧠 UPSC Prelims MCQs</h2>`;
    mcqHtml += `<form id="mcqForm">`;
    mcqsJson.forEach((mcq, index) => {
        mcqHtml += `<div class="mcq-question" id="mcq-${index}">`;
        mcqHtml += `<p>${index + 1}. ${mcq.question}</p>`;
        mcqHtml += `<div class="mcq-options">`;
        mcq.options.forEach((option, optIndex) => {
            const optionId = `q${index}-opt${optIndex}`;
            mcqHtml += `<label for="${optionId}"><input type="radio" id="${optionId}" name="question${index}" value="${option.value}">${option.label}</label>`;
        });
        mcqHtml += `</div>`;
        mcqHtml += `<div class="mcq-explanation" id="explanation-${index}"><strong>Explanation:</strong> ${mcq.explanation}</div>`;
        mcqHtml += `<button type="button" class="check-answer-btn" data-question-index="${index}" data-correct-answer="${mcq.answer.value}" data-correct-label="${mcq.answer.label}">Check Answer</button>`;
        mcqHtml += `</div>`;
    });
    mcqHtml += `<button type="submit" class="submit-quiz-btn">Submit Quiz</button>`;
    mcqHtml += `</form>`;
    mcqHtml += `<div id="quizResult" class="result-area" style="display: none;"></div>`;

    contentArea.innerHTML = mcqHtml;

    document.querySelectorAll('.check-answer-btn').forEach(button => {
        button.addEventListener('click', function() {
            const questionIndex = this.dataset.questionIndex;
            const correctAnswerValue = this.dataset.correctAnswer;
            const correctAnswerLabel = this.dataset.correctLabel;
            const selectedOption = document.querySelector(`input[name="question${questionIndex}"]:checked`);
            const explanationDiv = document.getElementById(`explanation-${questionIndex}`);

            if (selectedOption) {
                const isCorrect = selectedOption.value === correctAnswerValue;
                const questionDiv = document.getElementById(`mcq-${questionIndex}`);

                // Clear previous highlights
                questionDiv.querySelectorAll('label').forEach(label => {
                    label.style.backgroundColor = '';
                    label.style.color = '';
                });

                // Highlight selected
                selectedOption.closest('label').style.backgroundColor = isCorrect ? '#d4edda' : '#f8d7da'; // Green for correct, red for incorrect
                selectedOption.closest('label').style.color = isCorrect ? '#155724' : '#721c24';

                // Highlight correct answer if incorrect
                if (!isCorrect) {
                    questionDiv.querySelector(`input[value="${correctAnswerValue}"]`).closest('label').style.backgroundColor = '#d4edda';
                    questionDiv.querySelector(`input[value="${correctAnswerValue}"]`).closest('label').style.color = '#155724';
                }

                explanationDiv.style.display = 'block'; // Show explanation
                this.style.display = 'none'; // Hide "Check Answer" button
            } else {
                alert('Please select an option first.');
            }
        });
    });

    document.getElementById('mcqForm').addEventListener('submit', function(event) {
        event.preventDefault();
        let correctCount = 0;
        const totalQuestions = mcqsJson.length;
        const quizResultDiv = document.getElementById('quizResult');

        mcqsJson.forEach((mcq, index) => {
            const selectedOption = document.querySelector(`input[name="question${index}"]:checked`);
            if (selectedOption && selectedOption.value === mcq.answer.value) {
                correctCount++;
            }
        });

        quizResultDiv.innerHTML = `You got ${correctCount} out of ${totalQuestions} correct!`;
        quizResultDiv.style.display = 'block';

        // Optionally, disable further interaction or show all explanations
        document.querySelectorAll('.check-answer-btn').forEach(btn => btn.style.display = 'none');
        document.querySelectorAll('.mcq-explanation').forEach(exp => exp.style.display = 'block');
    });
}

function cleanHTML(htmlString) {
    let cleaned = htmlString.replace(/```json/g, '').replace(/```/g, '');
    try {
        const parsed = JSON.parse(cleaned);
        // If it's valid JSON, stringify it with proper indentation for display
        return `<pre><code>${JSON.stringify(parsed, null, 2)}</code></pre>`;
    } catch (e) {
        // If not JSON, try to format common AI output patterns
        cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
        cleaned = cleaned.replace(/\* (.*)/g, '<li>$1</li>'); // List items
        cleaned = cleaned.replace(/\n\n/g, '<p>'); // Paragraphs
        cleaned = cleaned.replace(/\n/g, '<br>'); // Line breaks

        // If it's a summary and might contain HTML already, sanitize it
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleaned;
        return tempDiv.innerHTML;
    }
}

// Function to handle API generation (Summary or MCQs)
async function handleAPIGeneration(requestType, dataContent = '', keywords = '') {
    loadingIndicator.style.display = 'block';
    contentArea.innerHTML = ''; // Clear previous content

    const selectedSubject = subjectSelect.value;
    const selectedTopic = topicSelect.value;
    const selectedYear = pyqsYearSelect.value;

    let title = '';
    let prompt = '';

    if (requestType === 'summary' || requestType === 'mcq') {
        let content;
        if (currentContentType === 'ncert' && ncertData[selectedSubject] && ncertData[selectedSubject][selectedTopic]) {
            content = ncertData[selectedSubject][selectedTopic].content;
            keywords = ncertData[selectedSubject][selectedTopic].keywords || keywords;
            title = `${selectedSubject} - ${selectedTopic}`;
        } else if (currentContentType === 'standardBooks' && standardBooksData[selectedSubject] && standardBooksData[selectedSubject][selectedTopic]) {
            content = standardBooksData[selectedSubject][selectedTopic].content;
            keywords = standardBooksData[selectedSubject][selectedTopic].keywords || keywords;
            title = `${selectedSubject} - ${selectedTopic} (Standard Book)`;
        } else if (requestType === 'mcqFromSummary' && dataContent) {
            content = dataContent; // Use the generated summary as content
            title = "from Generated Summary";
        } else if (currentContentType === 'pyqs') {
            // For PYQs, the 'content' might be more generic or derived from context
            // or if you have PYQs content in pyqsData, use that.
            // For now, let's craft a prompt based on year and selected topic/subject
            content = `UPSC Prelims Previous Year Questions related to ${selectedSubject || 'various subjects'} for the year ${selectedYear} focusing on topic: ${selectedTopic}.`;
            title = `PYQs - ${selectedSubject ? selectedSubject + ' - ' : ''} ${selectedTopic || ''} (${selectedYear})`;
            // If you have actual PYQ question data in your sheet, retrieve it here.
        } else {
            loadingIndicator.style.display = 'none';
            contentArea.innerHTML = `<p style="color: red; text-align: center; padding: 20px; border: 1px solid red; background-color: #ffebee; border-radius: 5px;">
                Please select a Subject and Topic.
                ${currentContentType === 'standardBooks' && STANDARD_BOOKS_SHEET_URL.includes('YOUR_') ? '<br><br><strong>Note:</strong> Standard Books Sheet URL is not configured.' : ''}
            </p>`;
            return;
        }

        if (!content) {
            loadingIndicator.style.display = 'none';
            contentArea.innerHTML = `<p style="color: red; text-align: center; padding: 20px; border: 1px solid red; background-color: #ffebee; border-radius: 5px;">No content found for the selected topic. Please select another topic or ensure your Google Sheet data is correctly populated.</p>`;
            return;
        }

        if (requestType === 'summary') {
            prompt = `Generate a concise and informative summary for UPSC Prelims for the following content, focusing on key facts and concepts.
            Keywords to include: ${keywords || 'none'}.
            Content: ${content}`;
        } else if (requestType === 'mcq' || requestType === 'mcqFromSummary') {
            prompt = `Generate 5 UPSC Prelims level Multiple Choice Questions (MCQs) with 4 options (A, B, C, D) and a detailed explanation for the correct answer. The questions should be based on the following content and adhere to UPSC exam standards (analytical, factual, concept-based).
            Output the response strictly in JSON format, like this:
            [
              {
                "question": "Question text here?",
                "options": [
                  {"label": "A", "value": "Option A text"},
                  {"label": "B", "value": "Option B text"},
                  {"label": "C", "value": "Option C text"},
                  {"label": "D", "value": "Option D text"}
                ],
                "answer": {"label": "X", "value": "Option X text"},
                "explanation": "Detailed explanation for why X is correct and others are wrong."
              }
            ]
            Content: ${content}`;
        }
    } else {
        loadingIndicator.style.display = 'none';
        contentArea.innerHTML = `<p style="color: red;">Invalid request type.</p>`;
        return;
    }

    try {
        // --- THIS IS THE CRITICAL CHANGE ---
        // Call your Netlify serverless function instead of directly calling Gemini
        const response = await fetch('/.netlify/functions/generate-content', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: prompt }), // Send the constructed prompt
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error from serverless function: ${response.status} ${response.statusText}. Details: ${errorData.message || JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const generatedText = data.text; // Assuming your serverless function returns { text: "..." }

        if (requestType === 'summary') {
            currentSummary = generatedText; // Store for future MCQ generation
            const cleanHtml = cleanHTML(generatedText);
            contentArea.innerHTML = `<div class="content-section summary"><h2> 📝 Key Summary: ${title}</h2>${cleanHtml}</div>`;
            generateMCQsFromSummaryBtn.style.display = 'block'; // Show button after summary
        } else if (requestType === 'mcq' || requestType === 'mcqFromSummary') {
            const cleanHtml = cleanHTML(generatedText); // Try to parse as JSON first
            try {
                const mcqs = JSON.parse(cleanHtml.replace(/<pre><code>|<\/code><\/pre>/g, '')); // Remove pre/code tags for parsing
                displayMCQs(mcqs);
            } catch (e) {
                // If it's not valid JSON, display it as plain text for debugging
                contentArea.innerHTML = `<div class="content-section"><h2> 🧠 UPSC Prelims MCQs: ${title}</h2><p style="color: orange;">Could not parse MCQs. Raw response (check format):</p><pre>${cleanHtml}</pre></div>`;
                console.error("Failed to parse MCQs JSON:", e);
                console.log("Raw generated text:", generatedText);
            }
            generateMCQsFromSummaryBtn.style.display = 'none'; // Hide button after MCQs
        }

    } catch (error) {
        console.error('Error generating content:', error);
        contentArea.innerHTML = `<p style="color: red; text-align: center; padding: 20px; border: 1px solid red; background-color: #ffebee; border-radius: 5px;">Failed to generate content.
            This might be due to a network issue or an issue with the serverless function.
            Please ensure your Netlify function is deployed correctly and the API key is set.<br><br><strong>Error:</strong> ${error.message}</p>`;
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    const template = document.getElementById('initialContent');
    contentArea.innerHTML = template.innerHTML;

    // Load NCERT data initially
    ncertData = await fetchSheetData(NCERT_SHEET_URL);
    if (ncertData) {
        populateControls(); // Populate controls based on default content type (NCERT)
    }

    // Event listener for content type selection
    contentTypeSelect.addEventListener('change', async (event) => {
        currentContentType = event.target.value;
        contentArea.innerHTML = ''; // Clear content area on type change

        // Fetch data for the selected type if not already fetched
        if (currentContentType === 'standardBooks' && Object.keys(standardBooksData).length === 0) {
            standardBooksData = await fetchSheetData(STANDARD_BOOKS_SHEET_URL);
        }
        // PYQs data doesn't need to be loaded from a sheet for just years, but if you want topic-wise PYQs from a sheet, you'd fetch it here.
        // For now, populatePyqsYears generates years dynamically.
        populateControls();
    });

    subjectSelect.addEventListener('change', populateSubtopics);

    generateSummaryBtn.addEventListener('click', () => handleAPIGeneration('summary'));
    generateMCQsBtn.addEventListener('click', () => handleAPIGeneration('mcq'));
    generateMCQsFromSummaryBtn.addEventListener('click', () => handleAPIGeneration('mcqFromSummary', currentSummary));
});