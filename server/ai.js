const { GoogleGenerativeAI } = require('@google/generative-ai')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const askAI = async ({ question, code, language, error, history }) => {
  try {
    console.log('Asking Cody...')

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // Clean history — must start with user role
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
      generationConfig: { maxOutputTokens: 1024 }
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
- If you write any code, wrap it in triple backticks with language name
- Example: \`\`\`cpp  your code here \`\`\`
- If suggesting fixes show corrected snippet
- Be friendly and encouraging
    `

    const result = await chat.sendMessage(prompt)
    const answer = result.response.text()

    // Check if response contains code block
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/
    const match = answer.match(codeBlockRegex)
    const extractedCode = match ? match[1].trim() : null

    console.log('Cody responded successfully')
    console.log('Contains code:', !!extractedCode)

    return {
      answer,
      extractedCode  // null if no code, actual code if found
    }

  } catch (err) {
    console.error('Gemini error:', err.message)
    return { error: 'Cody is unavailable. Please try again.' }
  }
}

module.exports = { askAI }