/* eslint-disable react/prop-types */
import { useEffect, useRef } from "react";

const TOOLBAR_ACTIONS = [
  { cmd: "bold", label: "Bold" },
  { cmd: "italic", label: "Italic" },
  { cmd: "underline", label: "Underline" },
  { cmd: "insertUnorderedList", label: "Bullets" },
  { cmd: "insertOrderedList", label: "Numbers" },
];

export default function RichTextEditor({ value, onChange, placeholder = "Write content...", minHeight = 240 }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (!editorRef.current) return;

    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const runCommand = (command) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false);
    onChange(editorRef.current.innerHTML);
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition">
      <div className="flex flex-wrap gap-2 p-2 bg-gray-50 border-b border-gray-200">
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.cmd}
            type="button"
            onClick={() => runCommand(action.cmd)}
            className="px-2.5 py-1.5 text-xs font-medium text-gray-600 rounded-md border border-gray-200 bg-white hover:bg-gray-100 transition cursor-pointer"
          >
            {action.label}
          </button>
        ))}
      </div>

      <div
        ref={editorRef}
        contentEditable
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="px-4 py-3 text-sm leading-relaxed outline-none"
        style={{ minHeight: `${minHeight}px` }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      <style>{`
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
