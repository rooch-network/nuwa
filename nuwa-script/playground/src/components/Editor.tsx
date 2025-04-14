import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, indentWithTab, history } from '@codemirror/commands';
import { indentOnInput, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language';
import { defaultHighlightStyle, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { tags } from '@lezer/highlight';

interface EditorProps {
  defaultValue: string;
  onChange: (value: string) => void;
  language?: 'javascript' | 'json';
  readOnly?: boolean;
}

// Custom highlight styles
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
  const viewRef = useRef<EditorView | undefined>(undefined);

  useEffect(() => {
    if (editorRef.current && !viewRef.current) {
      const startState = EditorState.create({
        doc: defaultValue,
        extensions: [
          lineNumbers(),
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
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChange(update.state.doc.toString());
            }
          }),
          EditorView.theme({
            '&': {
              height: '100%',
              fontSize: '14px',
            },
            '.cm-content': {
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              backgroundColor: 'white',
              color: '#2d3748',
            },
            '.cm-gutters': {
              backgroundColor: '#f8f9fa',
              color: '#6c757d',
              border: 'none',
              borderRight: '1px solid #e9ecef',
            },
            '.cm-activeLine': {
              backgroundColor: 'rgba(230, 230, 230, 0.5)',
            },
            '.cm-activeLineGutter': {
              backgroundColor: 'rgba(230, 230, 230, 0.5)',
            },
            '.cm-selectionMatch': {
              backgroundColor: 'rgba(180, 180, 180, 0.3)',
            },
            '.cm-line': {
              color: '#1a202c',
            },
            '.cm-cursor': {
              borderLeftColor: '#000',
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
    <div className="h-full overflow-hidden bg-white">
      <div ref={editorRef} className="h-full overflow-auto" />
    </div>
  );
};

export default Editor;