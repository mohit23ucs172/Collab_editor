import React, { useEffect, useState, useRef } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { useParams } from "react-router-dom";
import socket from "../socket";
import debounce from "lodash.debounce";
import UserList from "../components/UserList";
import axios from "axios";

export default function Room() {
  const { id: roomId } = useParams();
  const JUDGE0_KEY = import.meta.env.VITE_JUDGE0_KEY;
  const JUDGE0_HOST = import.meta.env.VITE_JUDGE0_HOST;
  const SERVER = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

  const [code, setCode] = useState({
    javascript: "// Loading JavaScript...",
    cpp: "// Loading C++...",
    python: "# Loading Python...",
    java: "// Loading Java..."
  });

  const [output, setOutput] = useState([]);
  const [language, setLanguage] = useState("javascript");
  const [theme, setTheme] = useState("vs-dark");
  const [userColors, setUserColors] = useState({});
  const isRemoteUpdate = useRef(false);
  const editorRef = useRef(null);
  const decorationsRef = useRef([]);
  const usernameRef = useRef("");

  const colors = ["#ff6b6b", "#6bc1ff", "#6bff95", "#f5d86b", "#ff6bf2", "#6bffd9"];

  const monaco = useMonaco();

  // Register C++ language in Monaco
  useEffect(() => {
    if (monaco && !monaco.languages.getLanguages().some(l => l.id === "cpp")) {
      monaco.languages.register({ id: "cpp" });
      monaco.languages.setMonarchTokensProvider("cpp", {
        keywords: ["int", "float", "double", "return", "if", "else", "for", "while", "class", "public", "private", "void", "const", "bool", "true", "false"],
        operators: ["+", "-", "*", "/", "=", "==", "!=", "<", ">", "<=", ">="],
        symbols: /[=><!~?:&|+\-*\/\^%]+/,
        tokenizer: {
          root: [
            [/[a-zA-Z_]\w*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
            [/[{}()\[\]]/, "@brackets"],
            [/[0-9]+/, "number"],
            [/[;,.]/, "delimiter"],
            [/".*"/, "string"]
          ]
        }
      });
    }
  }, [monaco]);

  function getUserColor(username) {
    if (!userColors[username]) {
      const nextColor = colors[Object.keys(userColors).length % colors.length];
      setUserColors(prev => ({ ...prev, [username]: nextColor }));
      injectUserStyle(username, nextColor);
      return nextColor;
    }
    return userColors[username];
  }

  function injectUserStyle(username, color) {
    if (!document.getElementById(`user-style-${username}`)) {
      const style = document.createElement("style");
      style.id = `user-style-${username}`;
      style.innerHTML = `
        .line-${username.replace(/\s/g, "_")} {
          background-color: ${color}33 !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  const emitChange = useRef(
    debounce((next, changes) => {
      socket.emit("code_change", { roomId, code: next, username: usernameRef.current, changes });
    }, 200)
  ).current;

  useEffect(() => {
    let username = localStorage.getItem("username");
    if (!username) {
      username = prompt("Enter your name") || "Anonymous";
      localStorage.setItem("username", username);
    }
    usernameRef.current = username;

    socket.emit("join_room", { roomId, username });

    socket.on("load_code", ({ code: c }) => {
      if (!c) return;
      isRemoteUpdate.current = true;
      setCode({
        javascript: c.javascript || "// Loading JavaScript...",
        cpp: c.cpp || "// Loading C++...",
        python: c.python || "# Loading Python...",
        java: c.java || "// Loading Java..."
      });
    });

    socket.on("code_change", ({ code: c, username, changes }) => {
      if (!c) return;
      isRemoteUpdate.current = true;
      setCode({
        javascript: c.javascript || code.javascript,
        cpp: c.cpp || code.cpp,
        python: c.python || code.python,
        java: c.java || code.java
      });

      if (editorRef.current && changes) highlightChanges(editorRef.current, changes, username);
    });

    return () => {
      socket.off("load_code");
      socket.off("code_change");
    };
  }, [roomId]);

  function handleEditorDidMount(editor) {
    editorRef.current = editor;
  }

  function handleEditorChange(value, ev) {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      setCode(prev => ({ ...prev, [language]: value }));
      return;
    }
    setCode(prev => ({ ...prev, [language]: value }));
    const changes = ev?.changes?.map(c => ({
      range: { startLineNumber: c.range.startLineNumber, endLineNumber: c.range.endLineNumber }
    }));
    emitChange({ ...code, [language]: value }, changes);
  }

  function highlightChanges(editor, changes, username) {
    const monaco = editor._standaloneKeybindingService._domNode.ownerDocument.defaultView.monaco;
    const color = getUserColor(username);
    const usernameClass = `line-${username.replace(/\s/g, "_")}`;
    const newDecorations = changes.map(c => ({
      range: new monaco.Range(c.range.startLineNumber, 1, c.range.endLineNumber, 1),
      options: { isWholeLine: true, className: usernameClass, linesDecorationsClassName: usernameClass, glyphMarginHoverMessage: { value: `Edited by ${username}` } }
    }));
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }

async function runCode() {
  const sourceCode = code[language];

  if (language === "javascript") {
    // Run JS locally
    let outputArr = [];
    const originalConsoleLog = console.log;
    console.log = (...args) => { outputArr.push(args.join(" ")); };
    try { eval(sourceCode); } catch (err) { outputArr.push("Error: " + err.message); }
    console.log = originalConsoleLog;
    setOutput(outputArr);
  } else {
    setOutput(["Running..."]);
    try {
      const res = await axios.post(`${SERVER}/run/${language}`, { code: sourceCode });
      setOutput(res.data.output);
    } catch (err) {
      setOutput([`Error: ${err.message}`]);
    }
  }
}


  function clearOutput() {
    setOutput([]);
  }

  return (
    <div style={{ display: "flex", height: "100vh", flexDirection: "column" }}>
      <div style={{ display: "flex", padding: "0.5rem", background: "#1f1f1f", color: "#fff", alignItems: "center" }}>
        <h3 style={{ margin: "0 1rem 0 0" }}>Room: {roomId}</h3>
        <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ marginRight: "1rem" }}>
          <option value="javascript">JavaScript</option>
          <option value="cpp">C++</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
        </select>
        <select value={theme} onChange={(e) => setTheme(e.target.value)} style={{ marginRight: "1rem" }}>
          <option value="vs-dark">Dark</option>
          <option value="vs-light">Light</option>
        </select>
        <button onClick={runCode} style={{ padding: "0.3rem 0.6rem", cursor: "pointer", marginRight: "0.5rem" }}>Run</button>
        <button onClick={clearOutput} style={{ padding: "0.3rem 0.6rem", cursor: "pointer" }}>Clear</button>
      </div>

      <div style={{ display: "flex", flex: 1 }}>
        <div style={{ flex: 3, background: "#1e1e1e" }}>
          <Editor
            height="100%"
            language={language === "cpp" ? "cpp" : language}
            theme={theme}
            value={code[language]}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            options={{ automaticLayout: true, fontSize: 14, glyphMargin: true }}
          />
        </div>

        <div style={{ flex: 1, background: "#252526", color: "#fff", padding: "1rem", display: "flex", flexDirection: "column" }}>
          <UserList socket={socket} userColors={userColors} />
          <div style={{ marginTop: "1rem", flex: 1, display: "flex", flexDirection: "column" }}>
            <h4>Output:</h4>
            <div style={{ background: "#000", color: "#0f0", padding: "0.5rem", borderRadius: "6px", overflowY: "auto", flex: 1 }}>
              {Array.isArray(output) ? output.map((line, idx) => <div key={idx} style={{ whiteSpace: "pre-wrap" }}>{line}</div>) : <div>{output}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
