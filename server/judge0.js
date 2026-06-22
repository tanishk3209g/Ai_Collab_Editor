const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const runCode = async (code, language) => {
  return new Promise((resolve) => {

    const extensions = {
      javascript: 'js',
      python:     'py',
      cpp:        'cpp'
    }

    const ext = extensions[language]
    if (!ext) {
      return resolve({ error: `Language ${language} not supported` })
    }

    const tmpDir  = os.tmpdir()
    const tmpFile = path.join(tmpDir, `code_${Date.now()}.${ext}`)

    fs.writeFileSync(tmpFile, code)

    let command = ''

    if (language === 'python') {
      // Try python3 first, fall back to python
      command = `python3 ${tmpFile} 2>&1 || python ${tmpFile} 2>&1`
    }
    else if (language === 'javascript') {
      command = `node ${tmpFile}`
    }
    else if (language === 'cpp') {
      const outFile = tmpFile.replace('.cpp', '')
      // Use g++ with explicit path fallbacks
      command = `g++ ${tmpFile} -o ${outFile} && ${outFile}`
    }

    console.log(`Running: ${command}`)

    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      // Cleanup
      try {
        fs.unlinkSync(tmpFile)
        if (language === 'cpp') {
          const outFile = tmpFile.replace('.cpp', '')
          if (fs.existsSync(outFile)) fs.unlinkSync(outFile)
        }
      } catch (e) {}

      if (error && !stdout && !stderr) {
        return resolve({
          output: '',
          error:  error.message,
          status: 'Error'
        })
      }

      // If stderr has content but stdout also has content
      // it might be warnings not errors
      resolve({
        output: stdout || '',
        error:  stderr || '',
        status: stderr && !stdout ? 'Error' : 'Accepted',
        time:   null,
        memory: null
      })
    })
  })
}

module.exports = { runCode }