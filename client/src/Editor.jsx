import CodeMirror from '@uiw/react-codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { cpp } from '@codemirror/lang-cpp'

// Map language names to CodeMirror extensions
const getLanguageExtension = (language) => {
  switch (language) {
    case 'javascript': return javascript()
    case 'python':     return python()
    case 'cpp':        return cpp()
    default:           return javascript()
  }
}

function Editor({ code, onChange, language }) {
  return (
    <div style={{ flex: 1, overflow: 'hidden', borderRadius: '8px' }}>
      <CodeMirror
        value={code}
        height="100%"
        theme={oneDark}
        extensions={[getLanguageExtension(language)]}
        onChange={(value) => onChange(value)}
        style={{ height: '100%', fontSize: '14px' }}
      />
    </div>
  )
}

export default Editor