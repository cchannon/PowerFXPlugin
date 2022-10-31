import * as React from 'react';
import * as monaco from 'monaco-editor';

export interface IEditorProps {
    callback: (newvalue: string) => void;
    defaultValue: string;
}

self.MonacoEnvironment = {
	getWorkerUrl: function (_moduleId: any, label: string) {
		if (label === 'json') {
			return './json.worker.bundle.js';
		}
		if (label === 'css' || label === 'scss' || label === 'less') {
			return './css.worker.bundle.js';
		}
		if (label === 'html' || label === 'handlebars' || label === 'razor') {
			return './html.worker.bundle.js';
		}
		if (label === 'typescript' || label === 'javascript') {
			return './ts.worker.bundle.js';
		}
		return './editor.worker.bundle.js';
	}
};

monaco.languages.register({ id: 'PowerFX' });

// Register a tokens provider for the language
monaco.languages.setMonarchTokensProvider('PowerFX', {
	// Set defaultToken to invalid to see what you do not tokenize yet
	defaultToken: 'invalid',
	
	booleans: ['true', 'false'],

	operators: [
		'+',
		'-',
		'*',
		'/',
		'^',
		'%',
		'=',
		'>',
		'>=',
		'<',
		'<=',
		'<>',
		'&',
		'&&',
		'||',
		'!',
		'.',
		'@',
		';;'
	  ],

	// we include these common regular expressions
	symbols: /[=><!~?:&|+\-*\/\^%@;]+/,
	escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
	digits: /\d+(_+\d+)*/,

	// The main tokenizer for our languages
	tokenizer: {
		root: [
			[/[{}]/, 'delimiter.bracket'],
			{ include: 'common' }
		],

		common: [
			// identifiers and keywords
			[/[a-z_$][\w$]*/, {
				cases: {
					// '@typeKeywords': 'keyword',
					// '@keywords': 'keyword',
					'@booleans': 'boolean',
					'@default': 'identifier'
				}
			}],
			[/[A-Z][\w\$]*/, 'type.identifier'],  // to show class names nicely
			// [/[A-Z][\w\$]*/, 'identifier'],

			// whitespace
			{ include: '@whitespace' },

			// delimiters and operators
			[/[()\[\]]/, '@brackets'],
			[/[<>](?!@symbols)/, '@brackets'],
			[/@symbols/, {
				cases: {
					'@operators': 'delimiter',
					'@default': ''
				}
			}],

			// numbers
			[/(@digits)[eE]([\-+]?(@digits))?/, 'number.float'],
			[/(@digits)\.(@digits)([eE][\-+]?(@digits))?/, 'number.float'],
			[/(@digits)/, 'number'],

			// delimiter: after number because of .\d floats
			[/[;,.]/, 'delimiter'],

			// strings
			[/"([^"\\]|\\.)*$/, 'string.invalid'],  // non-teminated string
			[/'([^'\\]|\\.)*$/, 'string.invalid'],  // non-teminated string
			[/"/, 'string', '@string_double'],
			[/'/, 'string', '@string_single'],
		],

		whitespace: [
			[/[ \t\r\n]+/, ''],
			[/\/\*\*(?!\/)/, 'comment.doc', '@jsdoc'],
			[/\/\*/, 'comment', '@comment'],
			[/\/\/.*$/, 'comment'],
		],

		comment: [
			[/[^\/*]+/, 'comment'],
			[/\*\//, 'comment', '@pop'],
			[/[\/*]/, 'comment']
		],

		jsdoc: [
			[/[^\/*]+/, 'comment.doc'],
			[/\*\//, 'comment.doc', '@pop'],
			[/[\/*]/, 'comment.doc']
		],

		string_double: [
			[/[^\\"]+/, 'string'],
			[/@escapes/, 'string.escape'],
			[/\\./, 'string.escape.invalid'],
			[/"/, 'string', '@pop']
		],

		string_single: [
			[/[^\\']+/, 'string'],
			[/@escapes/, 'string.escape'],
			[/\\./, 'string.escape.invalid'],
			[/'/, 'string', '@pop']
		],

		bracketCounting: [
			[/\{/, 'delimiter.bracket', '@bracketCounting'],
			[/\}/, 'delimiter.bracket', '@pop'],
			{ include: 'common' }
		],
	},
});

monaco.languages.setLanguageConfiguration('PowerFX', {
	surroundingPairs: [
		{ open: '{', close: '}' },
		{ open: '[', close: ']' },
		{ open: '(', close: ')' }
	],
	brackets: [
		['{', '}'],
		['[', ']'],
		['(', ')']
	]
});

export const Editor: React.FC<IEditorProps> = (props: IEditorProps) => {
	const editorDiv = React.useRef<HTMLDivElement>(null);
	let editor: monaco.editor.IStandaloneCodeEditor;
	React.useEffect(() => {
		if (editorDiv.current) {
			editor = monaco.editor.create(editorDiv.current, {
				value: props.defaultValue,
				language: 'PowerFX'
			});
            editor.onDidChangeModelContent(_ => {
                props.callback(editor.getValue());
            })
		}
		return () => {
			editor.dispose();
		};
	}, []);
	return <div className="Editor" ref={editorDiv}></div>;
};
