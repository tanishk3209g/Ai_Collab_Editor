const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const runCode = async (code, language) => {
  return new Promise((resolve) => {

    // File extensions per language
    const extensions = {
      javascript: 'js',
      python:     'py',
      cpp:        'cpp'
    }

    const ext = extensions[language]
    if (!ext) {
      return resolve({ error: `Language ${language} not supported` })
    }

    // Create temp file
    const tmpDir  = os.tmpdir()
    const tmpFile = path.join(tmpDir, `code_${Date.now()}.${ext}`)

    // Write code to temp file
    fs.writeFileSync(tmpFile, code)

    // Command to run based on language
    let command = ''

    if (language === 'python') {
      command = `python3 ${tmpFile}`
    }
    else if (language === 'javascript') {
      command = `node ${tmpFile}`
    }
    else if (language === 'cpp') {
      const outFile = tmpFile.replace('.cpp', '')
      command = `g++ ${tmpFile} -o ${outFile} && ${outFile}`
    }

    console.log(`Running command: ${command}`)

    // Execute with 10 second timeout
    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {

      // Clean up temp file
      try {
        fs.unlinkSync(tmpFile)
        if (language === 'cpp') {
          fs.unlinkSync(tmpFile.replace('.cpp', ''))
        }
      } catch (e) {}

      if (error && !stderr) {
        return resolve({
          output: '',
          error:  error.message,
          status: 'Error'
        })
      }

      resolve({
        output: stdout || '',
        error:  stderr || '',
        status: stderr ? 'Error' : 'Accepted',
        time:   null,
        memory: null
      })
    })
  })
}

module.exports = { runCode }