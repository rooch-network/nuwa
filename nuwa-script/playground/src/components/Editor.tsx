import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, indentWithTab, history } from '@codemirror/commands';
import { indentOnInput, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language';
import { defaultHighlightStyle, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { tags } from '@lezer/highlight';
import { oneDark } from '@codemirror/theme-one-dark';

interface EditorProps {
  defaultValue: string;
  onChange: (value: string) => void;
  language?: 'javascript' | 'json';
  readOnly?: boolean;
}

// Custom highlight styles similar to PromptFiddle
const myHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#9D5CE5' },
  { tag: tags.definition(tags.variableName), color: '#31A8FF' },
  { tag: tags.variableName, color: '#78DCE8' },
  { tag: tags.comment, color: '#969896', fontStyle: 'italic' },
  { tag: tags.string, color: '#89CA78' },
  { tag: tags.number, color: '#F78C6C' },
  { tag: tags.bool, color: '#FF6188' },
  { tag: tags.function(tags.variableName), color: '#35D994' },
  { tag: tags.operator, color: '#FF6188' },
]);

const Editor: React.FC<EditorProps> = ({
  defaultValue,
  onChange,
  language = 'javascript',
  readOnly = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView>();

  useEffect(() => {
    if (editorRef.current && !viewRef.current) {
      const startState = EditorState.create({
        doc: defaultValue,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          history(),
          indentOnInput(),
          bracketMatching(),
          foldGutter(),
          keymap.of([...defaultKeymap, ...foldKeymap, indentWithTab]),
          language === 'javascript'
            ? javascript({ jsx: true, typescript: true })
            : javascript({ jsx: false, typescript: false }),
          syntaxHighlighting(myHighlightStyle),
          syntaxHighlighting(defaultHighlightStyle),
          oneDark,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChange(update.state.doc.toString());
            }
          }),
          EditorView.theme({
            '&': {
              height: '100%',
              fontSize: '14px',
              borderRadius: '0.375rem',
            },
            '.cm-content': {
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            },
            '.cm-gutters': {
              backgroundColor: 'var(--background-dark, #282c34)',
              color: '#8b949e',
              border: 'none',
            },
            '.cm-activeLine': {
              backgroundColor: 'rgba(110, 118, 129, 0.1)',
            },
            '.cm-activeLineGutter': {
              backgroundColor: 'rgba(110, 118, 129, 0.1)',
            },
            '.cm-selectionMatch': {
              backgroundColor: 'rgba(110, 118, 129, 0.4)',
            },
          }),
          EditorState.readOnly.of(readOnly),
        ],
      });

      const view = new EditorView({
        state: startState,
        parent: editorRef.current,
      });

      viewRef.current = view;
    }

    return () => {
      viewRef.current?.destroy();
      viewRef.current = undefined;
    };
  }, [defaultValue, onChange, language, readOnly]);

  // Update editor content when default value changes from outside
  useEffect(() => {
    const currentValue = viewRef.current?.state.doc.toString() || '';
    if (viewRef.current && defaultValue !== currentValue) {
      const transaction = viewRef.current.state.update({
        changes: { from: 0, to: currentValue.length, insert: defaultValue },
      });
      viewRef.current.dispatch(transaction);
    }
  }, [defaultValue]);

  return (
    <div className="h-full overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700 text-white">
        <div className="flex space-x-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="text-xs font-medium">NuwaScript</div>
        <div></div> {/* Empty div to balance the flexbox */}
      </div>
      <div ref={editorRef} className="flex-grow overflow-auto" />
    </div>
  );
};

export default Editor;