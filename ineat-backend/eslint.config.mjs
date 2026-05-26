import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierConfig from 'eslint-config-prettier';

export default [
	{
		ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
	},
	{
		files: ['**/*.ts'],
		linterOptions: {
			reportUnusedDisableDirectives: 'off',
		},
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				sourceType: 'module',
			},
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
		},
		rules: {
			...prettierConfig.rules,
			'no-constant-condition': 'error',
			'no-debugger': 'error',
			'no-duplicate-imports': 'error',
			'no-unreachable': 'error',
		},
	},
];
