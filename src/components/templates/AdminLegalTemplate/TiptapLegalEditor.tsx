import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import Underline from '@tiptap/extension-underline';

export default function TiptapLegalEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Heading.configure({ levels: [1, 2, 3] }),
      BulletList,
      OrderedList,
      Underline,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'border rounded px-2 py-1 min-h-[200px] bg-white',
      },
      handleDOMEvents: {},
    },
  });

  // Update editor content if value changes externally
  const lastValue = useRef(value);
  useEffect(() => {
    if (editor && value !== lastValue.current && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
      lastValue.current = value;
    }
  }, [value, editor]);

  if (!editor) return <div>Loading editor...</div>;

  return (
    <div>
      <div className="mb-2 flex gap-2 lexical-toolbar">
        <button type="button" className="px-3 py-1 rounded bg-muted text-black border hover:bg-primary hover:text-white transition" onClick={() => editor.chain().focus().toggleBold().run()}>Bold</button>
        <button type="button" className="px-3 py-1 rounded bg-muted text-black border hover:bg-primary hover:text-white transition" onClick={() => editor.chain().focus().toggleItalic().run()}>Italic</button>
        <button type="button" className="px-3 py-1 rounded bg-muted text-black border hover:bg-primary hover:text-white transition" onClick={() => editor.chain().focus().toggleUnderline().run()}>Underline</button>
        <button type="button" className="px-3 py-1 rounded bg-muted text-black border hover:bg-primary hover:text-white transition" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</button>
        <button type="button" className="px-3 py-1 rounded bg-muted text-black border hover:bg-primary hover:text-white transition" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button type="button" className="px-3 py-1 rounded bg-muted text-black border hover:bg-primary hover:text-white transition" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
        <button type="button" className="px-3 py-1 rounded bg-muted text-black border hover:bg-primary hover:text-white transition" onClick={() => editor.chain().focus().toggleBulletList().run()}>Bullet List</button>
        <button type="button" className="px-3 py-1 rounded bg-muted text-black border hover:bg-primary hover:text-white transition" onClick={() => editor.chain().focus().toggleOrderedList().run()}>Numbered List</button>
      </div>
      <EditorContent editor={editor} />
      <style>{`
        .ProseMirror h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 1rem;
        }
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 0.75rem;
        }
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .ProseMirror p {
          margin-bottom: 0.5rem;
        }
      `}</style>
    </div>
  );
}
