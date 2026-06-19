const { GoogleGenerativeAI } = require('@google/generative-ai')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const askAI = async ({ question, code, language, error, history }) => {
  try {
    console.log('Asking Cody...')

    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' })

    let cleanHistory = history || []
    while (cleanHistory.length > 0 && cleanHistory[0].role === 'model') {
      cleanHistory = cleanHistory.slice(1)
    }

    const formattedHistory = cleanHistory.map(msg => ({
      role:  msg.role,
      parts: [{ text: msg.text }]
    }))

    const chat = model.startChat({
      history: formattedHistory,
      generationConfig: { maxOutputTokens: 2048 }  // more tokens for full fix
    })

    const prompt = `
Context:
- Language: ${language}
- Current code:
\`\`\`${language}
${code}
\`\`\`
${error ? `- Last error: ${error}` : '- No errors currently'}

User question: ${question}

Instructions:
- You are Cody, an expert coding assistant
- Give specific help based on their ACTUAL code
- Keep response concise and clear
- If you write any code wrap it in triple backticks with language name
- Example: \`\`\`cpp  your code here \`\`\`
- If fixing code always return the COMPLETE corrected version
- Be friendly and encouraging
    `

    const result = await chat.sendMessage(prompt)
    const answer = result.response.text()

    // Extract code blocks
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g
    const matches = [...answer.matchAll(codeBlockRegex)]

    // Show insert button for:
    // 1. Generation requests (write, create, generate...)
    // 2. Fix requests (fix, correct, repair...)
    const isActionRequest = /write|create|generate|make|build|implement|show me|give me|fix|correct|repair|solve/i.test(question)

    const extractedCode = (matches.length > 0 && isActionRequest)
      ? matches[matches.length - 1][1].trim()
      : null

    console.log('Cody responded successfully')
    console.log('Code extracted:', !!extractedCode)

    return { answer, extractedCode }

  } catch (err) {
    console.error('Gemini error:', err.message)
    return { error: 'Cody is unavailable. Please try again.' }
  }
}

module.exports = { askAI }