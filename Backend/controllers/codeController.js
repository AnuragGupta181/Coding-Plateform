const { executeCode, runAgainstTestCases } = require('../services/judge0Service');
const { enqueueRunCode, enqueueSubmitCode } = require('../services/codeExecutionQueue');
const Test = require('../models/test');
const Submission = require('../models/submission');

/**
 * POST /api/code/run
 * Quick "Run Code" against custom user-provided input (not hidden test cases).
 */
exports.runCode = async (req, res) => {
  try {
    const { sourceCode, language, stdin = '', testId, questionId } = req.body;

    if (!sourceCode || !language) {
      return res.status(400).json({ message: 'sourceCode and language are required.' });
    }

    try {
      // Try to enqueue asynchronous job
      const jobId = await enqueueRunCode({
        sourceCode, language, stdin, testId, questionId, userEmail: req.user?.email
      });
      return res.status(202).json({ message: 'Execution queued', jobId, async: true });
    } catch (queueErr) {
      // Fallback to synchronous if Redis/Queue is unavailable
      const result = await executeCode({ sourceCode, language, stdin });
      res.json(result);
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/code/submit/:testId/:questionId
 * Official submission — runs against ALL hidden test cases and calculates score.
 */
exports.submitCode = async (req, res) => {
  try {
    const { testId, questionId } = req.params;
    const { sourceCode, language, submissionId } = req.body;

    if (!sourceCode || !language || !submissionId) {
      return res.status(400).json({ message: 'sourceCode, language, and submissionId are required.' });
    }

    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ message: 'Test not found.' });
    if (test.status !== 'active') return res.status(403).json({ message: 'Test is not active.' });

    const question = test.codingQuestions.id(questionId);
    if (!question) return res.status(404).json({ message: 'Coding question not found.' });

    const submission = await Submission.findById(submissionId);
    if (!submission) return res.status(404).json({ message: 'Submission not found.' });

    try {
      // Try to enqueue asynchronous job
      const jobId = await enqueueSubmitCode({
        testId, questionId, sourceCode, language, submissionId, userEmail: req.user?.email
      });
      return res.status(202).json({ message: 'Submission queued', jobId, async: true });
    } catch (queueErr) {
      // Fallback to synchronous if Redis/Queue is unavailable
      const { results, passed, total } = await runAgainstTestCases({
        sourceCode, language, testCases: question.testCases,
      });

      const score = total > 0 ? Math.round((passed / total) * question.points) : 0;
      const verdict = passed === total ? 'Accepted' : `${passed}/${total} Test Cases Passed`;

      submission.codingAnswers.set(questionId, {
        sourceCode, language, score, verdict, passed, total,
        testCaseResults: results.map(r => ({ passed: r.passed, actualOutput: r.actualOutput, error: r.error }))
      });
      await submission.save();

      res.json({ passed, total, score, maxScore: question.points, results, verdict });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/code/analyze
 * Analyzes code using Groq AI
 */
exports.analyzeCode = async (req, res) => {
  try {
    const { sourceCode, language, title, submissionId, questionId, description, testCases } = req.body;
    
    // Lazy initialize to avoid crashing if env is missing at startup
    const Groq = require("groq-sdk");
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ message: "GROQ_API_KEY is not configured in .env" });
    }
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    let problemContext = `Problem: ${title || 'Coding Challenge'}\nLanguage: ${language}\n`;
    if (description) problemContext += `\nDescription:\n${description}\n`;
    if (testCases && Array.isArray(testCases)) {
      problemContext += `\nTest Cases Provided (Format: input -> expectedOutput):\n`;
      testCases.forEach((tc, i) => {
        problemContext += `Case ${i+1}: ${tc.input} -> ${tc.expectedOutput}\n`;
      });
    }
    problemContext += `\nStudent's Code:\n${sourceCode}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert coding tutor. Analyze the student code submission for the provided problem context.\n\nCRITICAL RULE 1: IGNORE BOILERPLATE. Ignore any code related to reading standard input (e.g. fs.readFileSync, process.stdin). Do NOT praise the student for reading input, and do NOT include input reading/storage in your space/time complexity analysis. Focus strictly on their actual algorithmic logic to solve the problem.\n\nCRITICAL RULE 2: If the student's code contains no actual logic (e.g. they just print the input, print 0, or left it blank), do NOT use the 3 headings. Just reply exactly with:\n'#### No Attempt Detected\nThe student appears to have submitted the starter code without writing any meaningful logic to solve the problem.'\n\nIf they did attempt the problem, you MUST provide very brief, actionable feedback using exactly these 3 headings: '#### What You Did Well', '#### Time & Space Complexity', and '#### One Suggestion for Improvement'. Keep it extremely concise and encouraging."
        },
        {
          role: "user",
          content: problemContext
        }
      ],
      model: "llama-3.1-8b-instant",
    });

    const analysisResult = chatCompletion.choices[0].message.content;

    if (submissionId && questionId) {
      const Submission = require('../models/submission');
      const submission = await Submission.findById(submissionId);
      if (submission && submission.codingAnswers.has(questionId)) {
        const answer = submission.codingAnswers.get(questionId);
        answer.aiAnalysis = analysisResult;
        submission.codingAnswers.set(questionId, answer);
        await submission.save();
      }
    }

    res.json({ analysis: analysisResult });
  } catch (error) {
    console.error("AI Analysis Error:", error);
    res.status(500).json({ message: "AI analysis failed." });
  }
};

/**
 * POST /api/code/chat
 * Interactive chat about a specific code submission using Groq AI
 */
exports.chatWithCode = async (req, res) => {
  try {
    const { messages, sourceCode, language, title } = req.body;
    
    const Groq = require("groq-sdk");
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ message: "GROQ_API_KEY is not configured in .env" });
    }
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    let systemContent = "You are a helpful and expert AI assistant for the Admin of a coding platform. You can answer general questions, help generate coding problems, explain algorithms, and assist the admin with technical tasks.";
    
    if (sourceCode) {
      systemContent = `You are an expert coding tutor and AI assistant for the Admin of a coding platform. The admin is reviewing a student's code submission for the problem "${title || 'Coding Challenge'}" written in ${language}.
Here is the student's code:
\`\`\`${language}
${sourceCode}
\`\`\`
Answer the admin's questions about this code, explain bugs, or suggest improvements. Keep responses helpful and concise.`;
    }

    const systemMessage = {
      role: "system",
      content: systemContent
    };

    const chatCompletion = await groq.chat.completions.create({
      messages: [systemMessage, ...messages],
      model: "llama-3.1-8b-instant",
    });

    res.json({ reply: chatCompletion.choices[0].message.content });
  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ message: "AI chat failed." });
  }
};
