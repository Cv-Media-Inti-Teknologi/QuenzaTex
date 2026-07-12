import type { languages } from "monaco-editor"

export const latexLanguageDef = {
  id: "latex",
  extensions: [".tex", ".sty", ".cls"],
  aliases: ["LaTeX", "latex", "tex"],
  mimetypes: ["text/x-latex", "text/plain"],
}

export const latexMonarchTokens: languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".latex",

  keywords: [
    "begin", "end", "documentclass", "usepackage", "newcommand", "renewcommand",
    "section", "subsection", "subsubsection", "chapter", "part", "paragraph",
    "title", "author", "date", "maketitle", "item", "label", "ref", "cite",
    "textbf", "textit", "underline", "include", "input", "hline", "vspace", "hspace",
    "centering", "caption", "includegraphics", "textwidth", "textheight"
  ],

  tokenizer: {
    root: [
      // Comments
      [/(%.*)$/, "comment"],

      // Escape characters for special symbols
      [/\\[$&%#_{}]/, "string.escape"],

      // LaTeX commands starting with a backslash
      [/\\([a-zA-Z@]+)/, {
        cases: {
          "@keywords": "keyword",
          "@default": "type.identifier"
        }
      }],

      // Math modes
      [/\$/, "keyword.math", "@mathMode"],
      [/\\\[/, "keyword.math", "@blockMathMode"],

      // Brackets and delimiters
      [/\{/, "delimiter.curly"],
      [/\}/, "delimiter.curly"],
      [/\[/, "delimiter.square"],
      [/\]/, "delimiter.square"],
    ],

    mathMode: [
      [/[^$]+/, "string.math"],
      [/\$/, "keyword.math", "@pop"]
    ],

    blockMathMode: [
      [/[^\\]+/, "string.math"],
      [/\\\]/, "keyword.math", "@pop"],
      [/\\./, "string.math"]
    ]
  }
}

export const latexLanguageConfig: languages.LanguageConfiguration = {
  comments: {
    lineComment: "%",
  },
  brackets: [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
  ],
  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: "$", close: "$" },
    { open: "\"", close: "\"" },
  ],
  surroundingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: "$", close: "$" },
    { open: "\"", close: "\"" },
  ],
}
