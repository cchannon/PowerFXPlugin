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

export const Editor: React.FC<IEditorProps> = (props: IEditorProps) => {
	const editorDiv = React.useRef<HTMLDivElement>(null);
	editorDiv.current?.style.setProperty("maxHeight", "400px");
	let editor: monaco.editor.IStandaloneCodeEditor;
	React.useEffect(() => {
		if (editorDiv.current) {
			editor = monaco.editor.create(editorDiv.current, {
				value: props.defaultValue,
				language: 'json',
			});
            editor.onDidChangeModelContent(_ => {
                props.callback(editor.getValue());
            })
		}
		return () => {
			editor.dispose();
		};
	}, props.defaultValue);
	return <div className="Editor" ref={editorDiv}></div>;
};