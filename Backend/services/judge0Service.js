const axios = require('axios');

let requestCounter = 0;

// Parse multiple URLs from .env
const secondaryUrls = process.env.JUDGE0_BASE_URL 
  ? process.env.JUDGE0_BASE_URL.split(',').map(u => u.trim()).filter(Boolean)
  : [];

// Track active status for each secondary URL
const secondaryUrlStatus = {};
secondaryUrls.forEach(url => secondaryUrlStatus[url] = null); // null means 'untested'

console.log(`⚖️  Judge0 Config: Primary Public API (ce.judge0.com) is ACTIVE [Fallback & Core]`);
if (secondaryUrls.length > 0) {
  console.log(`⚖️  Judge0 Config: ${secondaryUrls.length} Secondary API(s) configured. Initializing health checks...`);
} else {
  console.log(`⚖️  Judge0 Config: No Secondary API provided. 100% traffic will route to Public API.`);
}

// Background health check loop for self-hosted instances
if (secondaryUrls.length > 0) {
  const checkHealth = async () => {
    for (const url of secondaryUrls) {
      try {
        await axios.get(`${url}/about`, { timeout: 3000 });
        if (!secondaryUrlStatus[url]) {
          console.log(`✅ [Judge0 Health] Secondary API (${url}) is ONLINE. Added to load balancer.`);
          secondaryUrlStatus[url] = true;
        }
      } catch (error) {
        // If it was previously online or untested (null), log the failure
        if (secondaryUrlStatus[url] !== false) {
           console.log(`❌ [Judge0 Health] Secondary API (${url}) is OFFLINE. (Error: ${error.message}). Removed from load balancer.`);
        }
        secondaryUrlStatus[url] = false;
      }
    }
  };
  
  // Initial check
  checkHealth();
  // Check every 30 seconds
  setInterval(checkHealth, 30000);
}

/**
 * Judge0 CE — free public instance, no API key required.
 * Docs: https://ce.judge0.com
 * Language IDs: https://ce.judge0.com/languages
 */

// Judge0 Language IDs
const LANGUAGE_MAP = {
  javascript: 63,   // Node.js 12.14.0
  python: 71,       // Python 3.8.1
  cpp: 54,          // C++ (GCC 9.2.0)
  c: 50,            // C (GCC 9.2.0)
  java: 62,         // Java (OpenJDK 13.0.1)
  typescript: 74,   // TypeScript 3.7.4
  csharp: 51,       // C# (Mono 6.6.0.161)
  go: 60,           // Go (1.13.5)
  rust: 73,         // Rust (1.40.0)
  ruby: 72,         // Ruby (2.7.0)
};

// Judge0 verdict status IDs
const STATUS = {
  IN_QUEUE: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT_EXCEEDED: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR_SIGSEGV: 7,
  RUNTIME_ERROR_SIGXFSZ: 8,
  RUNTIME_ERROR_SIGFPE: 9,
  RUNTIME_ERROR_SIGABRT: 10,
  RUNTIME_ERROR_NZEC: 11,
  RUNTIME_ERROR_OTHER: 12,
  INTERNAL_ERROR: 13,
  EXEC_FORMAT_ERROR: 14,
};

// Helper function to get the correct headers based on the endpoint type
const getHeaders = (type) => {
  const headers = { 'Content-Type': 'application/json' };
  
  if (type === 'rapidapi' && process.env.JUDGE0_RAPIDAPI_KEY) {
    headers['X-RapidAPI-Key'] = process.env.JUDGE0_RAPIDAPI_KEY;
    headers['X-RapidAPI-Host'] = process.env.JUDGE0_RAPIDAPI_HOST || 'judge0-ce.p.rapidapi.com';
  }

  return headers;
};

// Core function that does the actual API call to a specific Judge0 URL
async function submitToJudge0Endpoint(base, headers, languageId, sourceCode, stdin, expectedOutput) {
  // Step 1: Submit the code
  const submitRes = await axios.post(
    `${base}/submissions?base64_encoded=false&wait=false`,
    {
      source_code: sourceCode,
      language_id: languageId,
      stdin,
      expected_output: expectedOutput || undefined,
      cpu_time_limit: 5,       // 5 seconds
      memory_limit: 128000,    // 128 MB
    },
    { headers, timeout: 10000 }
  );

  const token = submitRes.data.token;
  if (!token) throw new Error('Judge0 did not return a submission token.');

  // Step 2: Poll for the result (max 120 tries, 1 second apart, allows queueing up to 2 minutes)
  for (let attempt = 0; attempt < 120; attempt++) {
    await new Promise(r => setTimeout(r, 1000));

    const resultRes = await axios.get(
      `${base}/submissions/${token}?base64_encoded=false&fields=status,stdout,stderr,compile_output,time,memory`,
      { headers, timeout: 10000 }
    );

    const result = resultRes.data;
    const statusId = result.status?.id;

    // If it's still running, wait and try again
    if (statusId === STATUS.IN_QUEUE || statusId === STATUS.PROCESSING) {
      continue;
    }

    // Check for explicit worker failures (Internal Error or Exec Format Error)
    if (statusId === STATUS.INTERNAL_ERROR || statusId === STATUS.EXEC_FORMAT_ERROR) {
      throw new Error(`Judge0 Worker Failure (Status ID: ${statusId})`);
    }

    // Finished! Return the results
    return {
      token,
      status: result.status?.description || 'Unknown',
      statusId,
      accepted: statusId === STATUS.ACCEPTED,
      stdout: result.stdout || '',
      stderr: result.stderr || result.compile_output || '',
      time: result.time || null,
      memory: result.memory || null,
    };
  }

  throw new Error('Code execution timed out at this endpoint.');
}

function wrapSourceCode(sourceCode, language) {
  if (!sourceCode) return sourceCode;

  if (language === 'python' && !sourceCode.includes('sys.stdin') && !sourceCode.includes('import sys')) {
    return `${sourceCode}\n\nimport sys\nif __name__ == "__main__":\n    raw = sys.stdin.read().strip()\n    if raw:\n        res = solve(raw)\n        if res is not None:\n            print(str(res).lower() if isinstance(res, bool) else res)\n`;
  }

  if (language === 'javascript' && !sourceCode.includes('readFileSync') && !sourceCode.includes('fs.read')) {
    return `${sourceCode}\n\nconst fs = require("fs");\nconst input = fs.readFileSync(0, "utf-8").trim();\nif (input) {\n  const res = solve(input);\n  if (res !== undefined) console.log(typeof res === "boolean" ? String(res) : res);\n}\n`;
  }

  if (language === 'c' && !sourceCode.includes('main(')) {
    return `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\n${sourceCode}\n\nint main() {\n    solve();\n    return 0;\n}\n`;
  }

  return sourceCode;
}

/**
 * Submit code to Judge0 and wait for the result.
 * Includes explicit fallback logic.
 */
async function executeCode({ sourceCode, language, stdin = '', expectedOutput = '' }) {
  const languageId = LANGUAGE_MAP[language];
  if (!languageId) {
    throw new Error(`Unsupported language: ${language}. Supported: ${Object.keys(LANGUAGE_MAP).join(', ')}`);
  }

  const finalSourceCode = wrapSourceCode(sourceCode, language);

  let lastErrorMessage = '';

  // Prepare available endpoints
  const availableEndpoints = [
    { url: 'https://ce.judge0.com', type: 'public' }
  ];

  // Add any healthy secondary endpoints
  secondaryUrls.forEach(url => {
    if (secondaryUrlStatus[url]) {
      availableEndpoints.push({ url, type: 'self-hosted' });
    }
  });

  if (process.env.JUDGE0_RAPIDAPI_KEY) {
    availableEndpoints.push({ url: `https://${process.env.JUDGE0_RAPIDAPI_HOST || 'judge0-ce.p.rapidapi.com'}`, type: 'rapidapi' });
  }

  // Round-Robin Selection
  const startIndex = requestCounter % availableEndpoints.length;
  requestCounter++;

  // Loop through endpoints starting from startIndex
  for (let i = 0; i < availableEndpoints.length; i++) {
    const currentIndex = (startIndex + i) % availableEndpoints.length;
    const endpoint = availableEndpoints[currentIndex];

    try {
      const headers = getHeaders(endpoint.type);
      return await submitToJudge0Endpoint(endpoint.url, headers, languageId, finalSourceCode, stdin, expectedOutput);
    } catch (error) {
      // Axios error handling to capture status code
      let errorMessage = error.message;
      if (error.response) {
        errorMessage = `HTTP ${error.response.status} - ${error.response.statusText}`;
      }
      
      console.warn(`⚠️ [Judge0] ${endpoint.type} API failed (${errorMessage}). Trying next API...`);
      lastErrorMessage = errorMessage;
      // Continue to next endpoint in the loop
    }
  }

  // If we reach here, every attempt failed
  throw new Error(`All Judge0 execution attempts failed! Last error: ${lastErrorMessage}`);
}

/**
 * Run code against all test cases for a problem.
 * Returns per-testcase results and an overall pass count.
 */
async function runAgainstTestCases({ sourceCode, language, testCases }) {
  const results = [];

  for (const tc of testCases) {
    try {
      const res = await executeCode({
        sourceCode,
        language,
        stdin: tc.input,
        expectedOutput: tc.expectedOutput,
      });

      results.push({
        input: tc.isHidden ? '[Hidden]' : tc.input,
        expectedOutput: tc.isHidden ? '[Hidden]' : tc.expectedOutput,
        actualOutput: res.stdout.trim(),
        passed: res.accepted,
        status: res.status,
        time: res.time,
        stderr: res.stderr,
        isHidden: tc.isHidden,
      });
    } catch (err) {
      results.push({
        input: tc.isHidden ? '[Hidden]' : tc.input,
        expectedOutput: tc.isHidden ? '[Hidden]' : tc.expectedOutput,
        actualOutput: '',
        passed: false,
        status: 'Error',
        stderr: err.message,
        isHidden: tc.isHidden,
      });
    }
  }

  const passed = results.filter(r => r.passed).length;
  return { results, passed, total: results.length };
}

module.exports = { executeCode, runAgainstTestCases, LANGUAGE_MAP };
