const { src, dest } = require('gulp');

function buildAssets() {
	return src('nodes/**/*.{svg,json}').pipe(dest('dist/nodes'));
}

exports['build:assets'] = buildAssets;
