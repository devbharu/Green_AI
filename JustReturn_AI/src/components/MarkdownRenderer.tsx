import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MarkdownComponents: any = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    const lang = match ? match[1] : '';
    const codeString = String(children).replace(/\n$/, '');

    const handleCopy = (code: string, e: React.MouseEvent<HTMLButtonElement>) => {
      window.electronAPI.copyToClipboard(code);
      const btn = e.currentTarget;
      const oldText = btn.innerText;
      btn.innerText = 'Copied!';
      setTimeout(() => {
        btn.innerText = oldText;
      }, 1500);
    };

    if (!inline && match) {
      return (
        <div className="code-block-wrapper" onMouseDown={(e) => e.preventDefault()}>
          <div className="code-header">
            <span className="code-lang">{lang}</span>
            <button
              className="copy-btn"
              onClick={(e) => handleCopy(codeString, e)}
              onMouseDown={(e) => e.preventDefault()}
              title="Copy to clipboard"
            >
              Copy
            </button>
          </div>
          <SyntaxHighlighter
            {...props}
            style={vscDarkPlus}
            language={lang}
            PreTag="div"
            className="syntax-highlighter-custom"
            customStyle={{
              margin: 0,
              padding: '12px',
              background: 'transparent',
              fontSize: '12px',
            }}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      );
    }
    return (
      <code {...props} className={inline ? 'inline-code' : className}>
        {children}
      </code>
    );
  }
};

const MarkdownRenderer = React.memo(function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;

  return (
    <div className="markdown">
      <ReactMarkdown components={MarkdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownRenderer;
